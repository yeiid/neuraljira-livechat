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
	if err := DB.AutoMigrate(&User{}, &RoomEntity{}, &Message{}, &Attachment{}, &Post{}, &PostLike{}, &PostComment{}, &Follow{}, &Story{}, &Island{}, &Channel{}); err != nil {
		log.Fatalf("[Database] Error en migración de esquemas: %v", err)
	}

	log.Println("✅ [Database] Esquemas migrados correctamente.")

	// Sembrar Islas y Canales por defecto si no existen
	SeedDefaultIslands()
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

// SeedDefaultIslands inserta las islas y canales base requeridos si la tabla está vacía
func SeedDefaultIslands() {
	if DB == nil {
		return
	}

	var count int64
	DB.Model(&Island{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("🏝️ [Database] Sembrando islas y canales iniciales...")

	islands := []Island{
		{
			ID:          "island_hacking",
			Name:        "Hacking",
			Icon:        "Terminal",
			Description: "Comunidad de ciberseguridad, pruebas de penetración y desarrollo ofensivo/defensivo",
			Order:       1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
			Channels: []Channel{
				{
					ID:          "ch_carding",
					IslandID:    "island_hacking",
					Name:        "carding",
					Slug:        "carding",
					Description: "Investigación de pasarelas de pago y seguridad fintech",
					Icon:        "CreditCard",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_craking",
					IslandID:    "island_hacking",
					Name:        "craking",
					Slug:        "craking",
					Description: "Ingeniería inversa, análisis de binarios y criptografía",
					Icon:        "Key",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_hack",
					IslandID:    "island_hacking",
					Name:        "hack",
					Slug:        "hack",
					Description: "Exploits, vulnerabilidades 0-day y auditoría de sistemas",
					Icon:        "Cpu",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_mod",
					IslandID:    "island_hacking",
					Name:        "mod",
					Slug:        "mod",
					Description: "Canal reservado para moderadores y administradores",
					Icon:        "ShieldAlert",
					MinRole:     "mod",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
			},
		},
		{
			ID:          "island_cursos",
			Name:        "Cursos",
			Icon:        "GraduationCap",
			Description: "Talleres en vivo, guías de aprendizaje y resolución de dudas",
			Order:       2,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
			Channels: []Channel{
				{
					ID:          "ch_material",
					IslandID:    "island_cursos",
					Name:        "material",
					Slug:        "material",
					Description: "Documentación, diapositivas y código de clases",
					Icon:        "BookOpen",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_dudas",
					IslandID:    "island_cursos",
					Name:        "dudas",
					Slug:        "dudas",
					Description: "Preguntas, consultas y soporte técnico",
					Icon:        "HelpCircle",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_talleres",
					IslandID:    "island_cursos",
					Name:        "talleres",
					Slug:        "talleres",
					Description: "Laboratorios prácticos y sesiones en directo",
					Icon:        "Video",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
			},
		},
		{
			ID:          "island_general",
			Name:        "General",
			Icon:        "Globe",
			Description: "Comunidad abierta, charlas y presentaciones",
			Order:       3,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
			Channels: []Channel{
				{
					ID:          "ch_general",
					IslandID:    "island_general",
					Name:        "general",
					Slug:        "general",
					Description: "Sala general de la comunidad Neuraljira",
					Icon:        "MessageSquare",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
				{
					ID:          "ch_bienvenida",
					IslandID:    "island_general",
					Name:        "bienvenida",
					Slug:        "bienvenida",
					Description: "Preséntate a la comunidad e infórmate de las normas",
					Icon:        "Sparkles",
					MinRole:     "viewer",
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				},
			},
		},
	}

	for _, island := range islands {
		if err := DB.Create(&island).Error; err != nil {
			log.Printf("[Database] Error sembrando isla %s: %v", island.Name, err)
		} else {
			log.Printf("🏝️ [Database] Isla '%s' sembrada con %d canales", island.Name, len(island.Channels))
		}
	}
}
