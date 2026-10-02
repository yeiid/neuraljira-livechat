package main

import (
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"gorm.io/gorm"
)

// EventType define el tipo de evento en el WebSocket
type EventType string

const (
	EventChat         EventType = "chat"
	EventReaction     EventType = "reaction"
	EventPresence     EventType = "presence"
	EventSystem       EventType = "system"
	EventHistory      EventType = "history"
	EventUserJoin     EventType = "user_join"
	EventUserLeave    EventType = "user_leave"
	EventFile         EventType = "file"
	// Señalización WebRTC para Live Streaming
	EventWebRTCOffer      EventType = "webrtc_offer"
	EventWebRTCAnswer     EventType = "webrtc_answer"
	EventWebRTCCandidate   EventType = "webrtc_candidate"
	EventStreamStart      EventType = "stream_start"
	EventStreamStop       EventType = "stream_stop"
	EventStreamStatus     EventType = "stream_status"
	// Red social (feed + stories)
	EventPost           EventType = "post_new"
	EventPostLike       EventType = "post_like"
	EventStory          EventType = "story_new"
	// Moderación
	EventMessageDelete  EventType = "message_delete"
)

// User representa al usuario registrado en la base de datos
type User struct {
	ID           string         `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Username     string         `gorm:"uniqueIndex;type:varchar(32);not null" json:"username"`
	Email        string         `gorm:"uniqueIndex;type:varchar(128);not null" json:"email"`
	PasswordHash string         `gorm:"type:varchar(255);not null" json:"-"`
	Avatar       string         `gorm:"type:varchar(64);default:'cyber-1'" json:"avatar"`
	Role         string         `gorm:"type:varchar(20);default:'viewer'" json:"role"` // admin, host, mod, vip, viewer
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// Island representa una categoría temática o isla de chats (ej: Hacking, Cursos, General)
type Island struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Name        string    `gorm:"type:varchar(64);not null" json:"name"`
	Icon        string    `gorm:"type:varchar(32);default:'Terminal'" json:"icon"`
	Description string    `gorm:"type:text" json:"description"`
	Order       int       `gorm:"default:0" json:"order"`
	Channels    []Channel `gorm:"foreignKey:IslandID;constraint:OnDelete:CASCADE" json:"channels"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Channel representa un canal o sala de chat específica dentro de una isla (ej: #carding, #craking, #hack, #mod)
type Channel struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	IslandID    string    `gorm:"type:varchar(64);index;not null" json:"islandId"`
	Name        string    `gorm:"type:varchar(64);not null" json:"name"`
	Slug        string    `gorm:"type:varchar(64);index;not null" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	Icon        string    `gorm:"type:varchar(32);default:'Hash'" json:"icon"`
	MinRole     string    `gorm:"type:varchar(20);default:'viewer'" json:"minRole"` // viewer, mod, admin
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Room representa una sala de directo persistida
type RoomEntity struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Title       string    `gorm:"type:varchar(128)" json:"title"`
	HostUserID  string    `gorm:"type:varchar(64);index" json:"hostUserId"`
	IsLive      bool      `gorm:"default:false" json:"isLive"`
	StreamMode  string    `gorm:"type:varchar(32);default:'screen'" json:"streamMode"` // screen, camera
	CreatedAt   time.Time `json:"createdAt"`
}

// Attachment representa un archivo almacenado en Google Drive (5TB) o local
type Attachment struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	MessageID    string    `gorm:"type:varchar(64);index" json:"messageId,omitempty"`
	UserID       string    `gorm:"type:varchar(64);index" json:"userId"`
	SenderName   string    `gorm:"type:varchar(64)" json:"senderName"`
	FileName     string    `gorm:"type:varchar(255);not null" json:"fileName"`
	FileSize     int64     `json:"fileSize"`
	MimeType     string    `gorm:"type:varchar(128)" json:"mimeType"`
	DriveFileID  string    `gorm:"type:varchar(128)" json:"driveFileId"`
	ViewLink     string    `gorm:"type:text" json:"viewLink"`
	DownloadLink string    `gorm:"type:text" json:"downloadLink"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Message representa la estructura estándar de comunicación y persistencia
type Message struct {
	ID         string      `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Type       EventType   `gorm:"type:varchar(32);index" json:"type"`
	RoomID     string      `gorm:"type:varchar(64);index" json:"roomId"`
	UserID     string      `gorm:"type:varchar(64);index" json:"userId,omitempty"`
	Sender     string      `gorm:"type:varchar(64)" json:"sender,omitempty"`
	Avatar     string      `gorm:"type:varchar(64)" json:"avatar,omitempty"`
	Role       string      `gorm:"type:varchar(20)" json:"role,omitempty"`
	Text       string      `gorm:"type:text" json:"text,omitempty"`
	Reaction   string      `gorm:"type:varchar(32)" json:"reaction,omitempty"`
	Count      int         `gorm:"-" json:"count,omitempty"` // viewers o métricas efímeras
	Attachment *Attachment `gorm:"foreignKey:MessageID" json:"attachment,omitempty"`
	// Datos de señalización WebRTC (efímeros, no se guardan en DB)
	Payload    string      `gorm:"-" json:"payload,omitempty"`
	CreatedAt  int64       `gorm:"index" json:"createdAt"`
}

// Client representa un usuario conectado por WebSocket
type Client struct {
	ID       string
	UserID   string
	RoomID   string
	Username string
	Avatar   string
	Role     string
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
	LastMsg  time.Time
}

// Room gestiona los clientes y el estado en memoria de una sala de directo
type Room struct {
	ID         string
	Title      string
	HostID     string
	IsLive     bool
	StreamMode string
	Clients    map[*Client]bool
	History    []Message
	MaxHistory int
	SlowMode   int
	Mu         sync.RWMutex
}

func NewRoom(id string) *Room {
	return &Room{
		ID:         id,
		Clients:    make(map[*Client]bool),
		History:    make([]Message, 0, 50),
		MaxHistory: 50,
		SlowMode:   0,
		IsLive:     false,
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
