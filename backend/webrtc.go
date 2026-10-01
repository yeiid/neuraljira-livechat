package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// StreamSession representa el estado de una transmisión en vivo en una sala
type StreamSession struct {
	RoomID     string    `json:"roomId"`
	HostUserID string    `json:"hostUserId"`
	HostName   string    `json:"hostName"`
	StreamMode string    `json:"streamMode"` // screen, camera
	StartedAt  time.Time `json:"startedAt"`
	IsActive   bool      `json:"isActive"`
}

// WebRTCManager gestiona el ciclo de vida de los streams y el intercambio de señales
type WebRTCManager struct {
	Streams map[string]*StreamSession // roomID -> StreamSession
	Mu      sync.RWMutex
	Hub     *Hub
}

var LiveManager *WebRTCManager

func InitWebRTC(hub *Hub) {
	LiveManager = &WebRTCManager{
		Streams: make(map[string]*StreamSession),
		Hub:     hub,
	}
}

// StartStream inicia una transmisión para la sala
func (wm *WebRTCManager) StartStream(roomID, hostUserID, hostName, streamMode string) *StreamSession {
	wm.Mu.Lock()
	defer wm.Mu.Unlock()

	session := &StreamSession{
		RoomID:     roomID,
		HostUserID: hostUserID,
		HostName:   hostName,
		StreamMode: streamMode,
		StartedAt:  time.Now(),
		IsActive:   true,
	}
	wm.Streams[roomID] = session

	// Actualizar sala en memoria
	room := wm.Hub.GetOrCreateRoom(roomID)
	room.Mu.Lock()
	room.IsLive = true
	room.StreamMode = streamMode
	room.HostID = hostUserID
	room.Mu.Unlock()

	// Notificar a todos los espectadores de la sala que el directo ha comenzado
	statusMsg := Message{
		ID:        uuid.New().String(),
		Type:      EventStreamStart,
		RoomID:    roomID,
		Sender:    hostName,
		Text:      streamMode,
		CreatedAt: time.Now().UnixMilli(),
	}
	wm.Hub.BroadcastToRoom(roomID, statusMsg, false)

	log.Printf("[WebRTC] 🔴 Directo INICIADO en sala '%s' por '%s' (Modo: %s)", roomID, hostName, streamMode)
	return session
}

// StopStream finaliza la transmisión de la sala
func (wm *WebRTCManager) StopStream(roomID string) {
	wm.Mu.Lock()
	defer wm.Mu.Unlock()

	if _, exists := wm.Streams[roomID]; exists {
		delete(wm.Streams, roomID)

		room := wm.Hub.GetOrCreateRoom(roomID)
		room.Mu.Lock()
		room.IsLive = false
		room.Mu.Unlock()

		statusMsg := Message{
			ID:        uuid.New().String(),
			Type:      EventStreamStop,
			RoomID:    roomID,
			CreatedAt: time.Now().UnixMilli(),
		}
		wm.Hub.BroadcastToRoom(roomID, statusMsg, false)
		log.Printf("[WebRTC] ⏹️ Directo FINALIZADO en sala '%s'", roomID)
	}
}

// HandleSignaling procesa los mensajes de señalización WebRTC (Offer, Answer, Candidate)
func (wm *WebRTCManager) HandleSignaling(client *Client, msg Message) {
	// Reenviar la señalización WebRTC de forma dirigida o broadcast a los pares de la sala
	payloadBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	wm.Hub.Mu.RLock()
	room, exists := wm.Hub.Rooms[client.RoomID]
	wm.Hub.Mu.RUnlock()

	if !exists {
		return
	}

	room.Mu.RLock()
	defer room.Mu.RUnlock()

	for target := range room.Clients {
		// No reenviarse a sí mismo
		if target != client {
			select {
			case target.Send <- payloadBytes:
			default:
			}
		}
	}
}
