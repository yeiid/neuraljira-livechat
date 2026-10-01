package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Hub mantiene las salas activas y orquesta el enrutamiento de mensajes y WebRTC
type Hub struct {
	Rooms      map[string]*Room
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Message
	Mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Rooms:      make(map[string]*Room),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan Message, 256),
	}
}

func (h *Hub) GetOrCreateRoom(roomID string) *Room {
	h.Mu.Lock()
	defer h.Mu.Unlock()

	room, exists := h.Rooms[roomID]
	if !exists {
		room = NewRoom(roomID)

		// Cargar historial previo desde PostgreSQL si está disponible
		dbHistory := LoadRecentMessagesDB(roomID, 50)
		if len(dbHistory) > 0 {
			room.History = dbHistory
		}

		h.Rooms[roomID] = room
		log.Printf("[Hub] Nueva sala de live creada: %s (Historial cargado: %d)", roomID, len(room.History))
	}
	return room
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			room := h.GetOrCreateRoom(client.RoomID)
			room.Mu.Lock()
			room.Clients[client] = true
			viewerCount := len(room.Clients)
			history := make([]Message, len(room.History))
			copy(history, room.History)
			isLive := room.IsLive
			streamMode := room.StreamMode
			hostID := room.HostID
			room.Mu.Unlock()

			log.Printf("[Hub] Usuario conectado: %s (Sala: %s, Total: %d, Rol: %s)", client.Username, client.RoomID, viewerCount, client.Role)

			// Enviar historial previo al usuario recién conectado
			historyMsg := Message{
				ID:        uuid.New().String(),
				Type:      EventHistory,
				RoomID:    client.RoomID,
				CreatedAt: time.Now().UnixMilli(),
			}
			historyBytes, _ := json.Marshal(struct {
				Message
				History []Message `json:"history"`
			}{
				Message: historyMsg,
				History: history,
			})
			select {
			case client.Send <- historyBytes:
			default:
			}

			// Si la sala está en vivo, notificar al nuevo espectador para activar el reproductor
			if isLive {
				statusMsg, _ := json.Marshal(Message{
					ID:        uuid.New().String(),
					Type:      EventStreamStatus,
					RoomID:    client.RoomID,
					UserID:    hostID,
					Text:      streamMode,
					CreatedAt: time.Now().UnixMilli(),
				})
				select {
				case client.Send <- statusMsg:
				default:
				}
			}

			// Notificar presencia actualizada a la sala
			h.broadcastPresence(client.RoomID, viewerCount)

			// Notificar mensaje de bienvenida del sistema
			if client.Username != "" {
				joinMsg := Message{
					ID:        uuid.New().String(),
					Type:      EventUserJoin,
					RoomID:    client.RoomID,
					UserID:    client.UserID,
					Sender:    client.Username,
					Avatar:    client.Avatar,
					Role:      client.Role,
					Text:      "se unió al directo",
					CreatedAt: time.Now().UnixMilli(),
				}
				h.BroadcastToRoom(client.RoomID, joinMsg, false)
			}

		case client := <-h.Unregister:
			h.Mu.RLock()
			room, exists := h.Rooms[client.RoomID]
			h.Mu.RUnlock()

			if exists {
				room.Mu.Lock()
				if _, ok := room.Clients[client]; ok {
					delete(room.Clients, client)
					close(client.Send)
				}
				viewerCount := len(room.Clients)
				// Si el host que estaba transmitiendo se desconecta, detener el directo
				wasHost := (room.IsLive && room.HostID == client.UserID)
				room.Mu.Unlock()

				if wasHost {
					LiveManager.StopStream(client.RoomID)
				}

				log.Printf("[Hub] Usuario desconectado: %s (Sala: %s, Restantes: %d)", client.Username, client.RoomID, viewerCount)

				// Notificar presencia actualizada
				h.broadcastPresence(client.RoomID, viewerCount)

				// Limpiar sala si queda vacía tras un tiempo (y no está en directo)
				if viewerCount == 0 && !wasHost {
					h.Mu.Lock()
					delete(h.Rooms, client.RoomID)
					h.Mu.Unlock()
					log.Printf("[Hub] Sala vacía eliminada de memoria: %s", client.RoomID)
				}
			}

		case msg := <-h.Broadcast:
			h.BroadcastToRoom(msg.RoomID, msg, true)
		}
	}
}

func (h *Hub) broadcastPresence(roomID string, count int) {
	msg := Message{
		ID:        uuid.New().String(),
		Type:      EventPresence,
		RoomID:    roomID,
		Count:     count,
		CreatedAt: time.Now().UnixMilli(),
	}
	h.BroadcastToRoom(roomID, msg, false)
}

func (h *Hub) BroadcastToRoom(roomID string, msg Message, saveHistory bool) {
	h.Mu.RLock()
	room, exists := h.Rooms[roomID]
	h.Mu.RUnlock()

	if !exists {
		return
	}

	if saveHistory && (msg.Type == EventChat || msg.Type == EventFile) {
		room.AddHistory(msg)
		SaveMessageDB(&msg)
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[Hub] Error serializando mensaje: %v", err)
		return
	}

	room.Mu.RLock()
	defer room.Mu.RUnlock()

	for client := range room.Clients {
		select {
		case client.Send <- payload:
		default:
			// Si el buffer del cliente está lleno, no bloquear
		}
	}
}
