package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	app := fiber.New(fiber.Config{
		AppName: "Neuraljira LiveChat Backend v1.0",
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, OPTIONS",
	}))

	hub := NewHub()
	go hub.Run()

	// Health check para Dokploy / Traefik
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "healthy",
			"app":       "Neuraljira LiveChat",
			"timestamp": time.Now().UnixMilli(),
		})
	})

	// Información de sala
	app.Get("/api/rooms/:room_id", func(c *fiber.Ctx) error {
		roomID := c.Params("room_id")
		hub.Mu.RLock()
		room, exists := hub.Rooms[roomID]
		hub.Mu.RUnlock()

		if !exists {
			return c.JSON(fiber.Map{
				"roomId":  roomID,
				"active":  false,
				"viewers": 0,
			})
		}

		room.Mu.RLock()
		viewers := len(room.Clients)
		room.Mu.RUnlock()

		return c.JSON(fiber.Map{
			"roomId":  roomID,
			"active":  true,
			"viewers": viewers,
		})
	})

	// Middleware para WebSocket upgrade
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// Endpoint WebSocket con soporte para salas
	app.Get("/ws/:room_id", websocket.New(func(conn *websocket.Conn) {
		roomID := conn.Params("room_id")
		if roomID == "" {
			roomID = "main"
		}

		username := conn.Query("username")
		if strings.TrimSpace(username) == "" {
			username = fmt.Sprintf("NeuralUser_%s", uuid.New().String()[:4])
		}

		avatar := conn.Query("avatar")
		if avatar == "" {
			avatar = "cyber-1"
		}

		role := conn.Query("role")
		if role == "" {
			role = "viewer"
		}

		client := &Client{
			ID:       uuid.New().String(),
			RoomID:   roomID,
			Username: username,
			Avatar:   avatar,
			Role:     role,
			Conn:     conn,
			Send:     make(chan []byte, 128),
			Hub:      hub,
			LastMsg:  time.Now(),
		}

		hub.Register <- client

		// Goroutine para escribir al cliente (writePump)
		go writePump(client)

		// Loop de lectura en la goroutine principal de la conexión (readPump)
		readPump(client)
	}))

	log.Printf("🚀 Servidor Neuraljira LiveChat iniciado en puerto %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error iniciando servidor: %v", err)
	}
}

func readPump(c *Client) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, payload, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WebSocket] Error lectura cliente %s: %v", c.Username, err)
			}
			break
		}

		var inMsg struct {
			Type     string `json:"type"`
			Text     string `json:"text,omitempty"`
			Reaction string `json:"reaction,omitempty"`
		}

		if err := json.Unmarshal(payload, &inMsg); err != nil {
			continue
		}

		switch EventType(inMsg.Type) {
		case EventChat:
			trimmed := strings.TrimSpace(inMsg.Text)
			if trimmed == "" || len(trimmed) > 500 {
				continue
			}

			// Slow mode o protección básica de flood (mínimo 300ms entre mensajes)
			if time.Since(c.LastMsg) < 300*time.Millisecond {
				continue
			}
			c.LastMsg = time.Now()

			msg := Message{
				ID:        uuid.New().String(),
				Type:      EventChat,
				RoomID:    c.RoomID,
				Sender:    c.Username,
				Avatar:    c.Avatar,
				Role:      c.Role,
				Text:      trimmed,
				CreatedAt: time.Now().UnixMilli(),
			}
			c.Hub.Broadcast <- msg

		case EventReaction:
			if inMsg.Reaction == "" {
				continue
			}
			msg := Message{
				ID:        uuid.New().String(),
				Type:      EventReaction,
				RoomID:    c.RoomID,
				Sender:    c.Username,
				Avatar:    c.Avatar,
				Reaction:  inMsg.Reaction,
				CreatedAt: time.Now().UnixMilli(),
			}
			c.Hub.Broadcast <- msg
		}
	}
}

func writePump(c *Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// El canal fue cerrado por el hub
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Vía optimizada: enviar mensajes en cola si existen
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
