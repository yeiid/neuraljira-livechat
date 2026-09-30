package main

import (
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

// EventType define el tipo de evento en el WebSocket
type EventType string

const (
	EventChat      EventType = "chat"
	EventReaction  EventType = "reaction"
	EventPresence  EventType = "presence"
	EventSystem    EventType = "system"
	EventHistory   EventType = "history"
	EventUserJoin  EventType = "user_join"
	EventUserLeave EventType = "user_leave"
)

// Message representa la estructura estándar de comunicación
type Message struct {
	ID        string    `json:"id"`
	Type      EventType `json:"type"`
	RoomID    string    `json:"roomId"`
	Sender    string    `json:"sender,omitempty"`
	Avatar    string    `json:"avatar,omitempty"`
	Role      string    `json:"role,omitempty"` // host, mod, vip, viewer
	Text      string    `json:"text,omitempty"`
	Reaction  string    `json:"reaction,omitempty"` // heart, fire, rocket, clap, bulb
	Count     int       `json:"count,omitempty"`    // para presencia de viewers
	CreatedAt int64     `json:"createdAt"`
}

// Client representa un usuario conectado por WebSocket
type Client struct {
	ID       string
	RoomID   string
	Username string
	Avatar   string
	Role     string
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
	LastMsg  time.Time
}

// Room gestiona los clientes y el historial en memoria de una sala de directo
type Room struct {
	ID         string
	Clients    map[*Client]bool
	History    []Message
	MaxHistory int
	SlowMode   int // segundos entre mensajes por usuario (0 = desactivado)
	Mu         sync.RWMutex
}

func NewRoom(id string) *Room {
	return &Room{
		ID:         id,
		Clients:    make(map[*Client]bool),
		History:    make([]Message, 0, 50),
		MaxHistory: 50,
		SlowMode:   0,
	}
}

func (r *Room) AddHistory(msg Message) {
	r.Mu.Lock()
	defer r.Mu.Unlock()
	if len(r.History) >= r.MaxHistory {
		r.History = r.History[1:]
	}
	r.History = append(r.History, msg)
}

func (r *Room) GetHistory() []Message {
	r.Mu.RLock()
	defer r.Mu.RUnlock()
	res := make([]Message, len(r.History))
	copy(res, r.History)
	return res
}
