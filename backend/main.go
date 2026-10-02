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

	// 1. Inicializar Base de Datos PostgreSQL
	InitDatabase()

	// 2. Inicializar Google Drive API (5TB)
	InitGoogleDrive()

	app := fiber.New(fiber.Config{
		AppName:   "Neuraljira Live Platform Backend v2.0",
		BodyLimit: 5 * 1024 * 1024 * 1024, // Permitir subidas de hasta 5GB
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, OPTIONS, PUT, DELETE",
	}))

	hub := NewHub()
	go hub.Run()

	// 3. Inicializar Live Streaming WebRTC
	InitWebRTC(hub)

	// 4. Registrar Rutas de Autenticación
	SetupAuthRoutes(app)

	// 5. Registrar Rutas de Subida y Google Drive
	SetupUploadRoutes(app, hub)

	// 6. Registrar Red Social (feed + follows + stories)
	SetupSocialRoutes(app, hub)

	// 7. Registrar Rutas de Islas y Canales Temáticos
	SetupIslandRoutes(app, hub)

	// 8. Registrar Rutas de Moderación y Super Admin
	SetupModerationRoutes(app, hub)

	// Health check para Dokploy / Traefik
	app.Get("/api/health", func(c *fiber.Ctx) error {
		dbStatus := "connected"
		if DB == nil {
			dbStatus = "disconnected"
		}
		driveStatus := "local_fallback"
		if GDrive != nil && GDrive.isReady {
			driveStatus = "google_drive_active"
		}

		return c.JSON(fiber.Map{
			"status":      "healthy",
			"app":         "Neuraljira Live Platform",
			"database":    dbStatus,
			"storage":     driveStatus,
			"timestamp":   time.Now().UnixMilli(),
		})
	})

	// Información de sala (para verificar si está en vivo y cuántos espectadores hay)
	app.Get("/api/rooms/:room_id", func(c *fiber.Ctx) error {
		roomID := c.Params("room_id")
		hub.Mu.RLock()
		room, exists := hub.Rooms[roomID]
		hub.Mu.RUnlock()

		if !exists {
			return c.JSON(fiber.Map{
				"roomId":     roomID,
				"active":     false,
				"isLive":     false,
				"viewers":    0,
			})
		}

		room.Mu.RLock()
		viewers := len(room.Clients)
		isLive := room.IsLive
		streamMode := room.StreamMode
		hostID := room.HostID
		room.Mu.RUnlock()

		return c.JSON(fiber.Map{
			"roomId":     roomID,
			"active":     true,
			"isLive":     isLive,
			"streamMode": streamMode,
			"hostId":     hostID,
			"viewers":    viewers,
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

	// Endpoint WebSocket con soporte para salas, autenticación JWT y WebRTC
	app.Get("/ws/:room_id", websocket.New(func(conn *websocket.Conn) {
		roomID := conn.Params("room_id")
		if roomID == "" {
			roomID = "main"
		}

		// Extraer datos del usuario autenticado si viene token JWT
		tokenStr := conn.Query("token")
		var userID string
		var username string
		var avatar string
		var role string

		if tokenStr != "" {
			if claims, err := ValidateTokenString(tokenStr); err == nil {
				userID = claims.UserID
				username = claims.Username
				avatar = claims.Avatar
				role = claims.Role
			}
		}

		// Fallback para invitados o si no hay token
		if username == "" {
			username = conn.Query("username")
			if strings.TrimSpace(username) == "" {
				username = fmt.Sprintf("NeuralUser_%s", uuid.New().String()[:4])
			}
			userID = fmt.Sprintf("guest_%s", uuid.New().String()[:8])
			avatar = conn.Query("avatar")
			if avatar == "" {
				avatar = "cyber-1"
			}
			role = conn.Query("role")
			if role == "" {
				role = "viewer"
			}
		}

		client := &Client{
			ID:       uuid.New().String(),
			UserID:   userID,
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

		go writePump(client)
		readPump(client)
	}))

	log.Printf("🚀 Servidor Neuraljira Live Platform iniciado en puerto %s", port)
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
			Payload  string `json:"payload,omitempty"` // Señales SDP / ICE de WebRTC
		}

		if err := json.Unmarshal(payload, &inMsg); err != nil {
			continue
		}

		eventType := EventType(inMsg.Type)

		switch eventType {
		case EventChat:
			trimmed := strings.TrimSpace(inMsg.Text)
			if trimmed == "" || len(trimmed) > 500 {
				continue
			}

			// Protección de flood (300ms entre mensajes)
			if time.Since(c.LastMsg) < 300*time.Millisecond {
				continue
			}
			c.LastMsg = time.Now()

			msg := Message{
				ID:        uuid.New().String(),
				Type:      EventChat,
				RoomID:    c.RoomID,
				UserID:    c.UserID,
				Sender:    c.Username,
				Avatar:    c.Avatar,
				Role:      c.Role,
				Text:      trimmed,
				CreatedAt: time.Now().UnixMilli(),
			}
			log.Printf("[WebSocket] 💬 Mensaje de '%s' en sala '%s': %s", c.Username, c.RoomID, trimmed)
			c.Hub.Broadcast <- msg

		case EventReaction:
			if inMsg.Reaction == "" {
				continue
			}
			msg := Message{
				ID:        uuid.New().String(),
				Type:      EventReaction,
				RoomID:    c.RoomID,
				UserID:    c.UserID,
				Sender:    c.Username,
				Avatar:    c.Avatar,
				Reaction:  inMsg.Reaction,
				CreatedAt: time.Now().UnixMilli(),
			}
			c.Hub.Broadcast <- msg

		// Iniciar directo (compartir pantalla o cámara)
		case EventStreamStart:
			streamMode := inMsg.Text
			if streamMode == "" {
				streamMode = "screen"
			}
			LiveManager.StartStream(c.RoomID, c.UserID, c.Username, streamMode)

		// Detener directo
		case EventStreamStop:
			LiveManager.StopStream(c.RoomID)

		// Señalización WebRTC (Offer, Answer, Candidate)
		case EventWebRTCOffer, EventWebRTCAnswer, EventWebRTCCandidate:
			signalMsg := Message{
				ID:        uuid.New().String(),
				Type:      eventType,
				RoomID:    c.RoomID,
				UserID:    c.UserID,
				Sender:    c.Username,
				Payload:   inMsg.Payload,
				CreatedAt: time.Now().UnixMilli(),
			}
			LiveManager.HandleSignaling(c, signalMsg)
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
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
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
