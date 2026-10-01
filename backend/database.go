package main

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase conecta a PostgreSQL e inicializa las tablas
func InitDatabase() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://neuraluser:neuralpass123@localhost:5432/neuraljira_live?sslmode=disable"
	}

	var err error
	// Intentar conectar con reintentos para dar tiempo a PostgreSQL en Docker
	for attempts := 1; attempts <= 10; attempts++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			break
		}
		log.Printf("[Database] Intento %d/10: esperando a PostgreSQL (%s)...", attempts, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("[Database] AVISO: No se pudo conectar a PostgreSQL: %v. Funcionando en memoria.", err)
		return
	}

	log.Println("✅ [Database] Conexión establecida con PostgreSQL.")

	// AutoMigrate de tablas
	if err := DB.AutoMigrate(&User{}, &RoomEntity{}, &Message{}, &Attachment{}, &Post{}, &PostLike{}, &PostComment{}, &Follow{}, &Story{}); err != nil {
		log.Fatalf("[Database] Error en migración de esquemas: %v", err)
	}

	log.Println("✅ [Database] Esquemas migrados correctamente.")
}

// SaveMessageDB guarda un mensaje de chat en la base de datos de forma asíncrona
func SaveMessageDB(msg *Message) {
	if DB == nil {
		return
	}
	m := *msg
	m.Attachment = nil
	go func() {
		if err := DB.Create(&m).Error; err != nil {
			log.Printf("[Database] ❌ Error guardando mensaje %s: %v", m.ID, err)
		} else {
			log.Printf("[Database] 💾 Mensaje guardado en PostgreSQL: id=%s sala=%s texto='%s'", m.ID, m.RoomID, m.Text)
		}
	}()
}

// LoadRecentMessagesDB obtiene los últimos mensajes persistidos de una sala
func LoadRecentMessagesDB(roomID string, limit int) []Message {
	if DB == nil {
		return nil
	}
	var msgs []Message
	err := DB.Preload("Attachment").
		Where("room_id = ? AND type IN ?", roomID, []string{string(EventChat), string(EventFile)}).
		Order("created_at desc").
		Limit(limit).
		Find(&msgs).Error

	if err != nil {
		log.Printf("[Database] Error cargando historial de %s: %v", roomID, err)
		return nil
	}

	// Invertir el orden para que quede cronológico
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs
}
