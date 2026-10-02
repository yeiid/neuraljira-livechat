package main

import (
	"log"
	"os"
	"time"

	"github.com/google/uuid"
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

	// Sembrar contenido informativo sustancial en cada canal (estilo Telegram)
	SeedChannelInformativeMessages()
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

// SeedChannelInformativeMessages llena cada canal con información sustancial tipo Telegram
func SeedChannelInformativeMessages() {
	if DB == nil {
		return
	}

	type SeedPost struct {
		RoomID string
		Sender string
		Avatar string
		Role   string
		Text   string
	}

	seeds := []SeedPost{
		// 1. #bienvenida
		{
			RoomID: "bienvenida",
			Sender: "NeuralBot",
			Avatar: "cyber-1",
			Role:   "admin",
			Text:   "📌 ¡BIENVENIDO A NEURALJIRA LIVE!\n\nEsta plataforma opera con grupos e islas temáticas con canales (#hashtags) al estilo Telegram.\n\nNormas comunitarias:\n• Respeta a todos los miembros.\n• No compartir malware destructivo.\n• Utiliza el canal adecuado según el tema.\n• Los moderadores están identificados con la insignia 🛡️ MOD.",
		},
		{
			RoomID: "bienvenida",
			Sender: "LeadMod",
			Avatar: "cyber-2",
			Role:   "mod",
			Text:   "💡 GUÍA DE NAVEGACIÓN:\n\n💻 Isla Hacking:\n  • #carding: Seguridad en pagos y prevención antifraude\n  • #craking: Reversing y análisis binario\n  • #hack: Pentesting y exploits éticos\n  • #mod: Coordinación de staff\n\n🎓 Isla Cursos:\n  • #material: Recursos y lecturas\n  • #dudas: Soporte técnico\n  • #talleres: Transmisiones de laboratorio en vivo",
		},

		// 2. #general
		{
			RoomID: "general",
			Sender: "NeuralBot",
			Avatar: "cyber-1",
			Role:   "admin",
			Text:   "🌐 #GENERAL — Sala Central de la Comunidad\n\nEspacio abierto para networking, charlas técnicas informales, anuncios generales y coordinación comunitaria.",
		},
		{
			RoomID: "general",
			Sender: "LeadMod",
			Avatar: "cyber-6",
			Role:   "mod",
			Text:   "🚀 Recuerda que puedes compartir archivos pesados directamente en el chat utilizando la integración con Google Drive (5TB). Pulsa el ícono de clip 📎 para adjuntar.",
		},

		// 3. #carding
		{
			RoomID: "carding",
			Sender: "SecurityLead",
			Avatar: "cyber-4",
			Role:   "mod",
			Text:   "🛡️ #CARDING — Investigación en Seguridad de Pasarelas y Prevención Antifraude\n\nEn este canal analizamos la arquitectura de pagos en línea bajo el marco PCI-DSS v4.0:\n\n1. Tokenización y Vaults: Por qué plataformas como Stripe/Adyen nunca guardan el PAN en claro.\n2. 3D Secure 2.2: Autenticación basada en riesgo (RBA) y biometría.\n3. Detección de Card-Testing: Patrones de bots usando BIN routing, velocity checks y machine learning.\n\n⚠️ Este canal es estrictamente educativo y orientado a la defensa de comercio electrónico.",
		},
		{
			RoomID: "carding",
			Sender: "LeadMod",
			Avatar: "cyber-2",
			Role:   "mod",
			Text:   "📌 RECURSOS RECOMENDADOS:\n• Guía oficial PCI Security Standards Council (v4.0)\n• Arquitectura de verificación AVS (Address Verification Service) y CVV2\n• Implementación de Fingerprinting de dispositivos en checkout contra ataques automatizados.",
		},

		// 4. #craking
		{
			RoomID: "craking",
			Sender: "ReverseEngineer",
			Avatar: "cyber-3",
			Role:   "mod",
			Text:   "⚙️ #CRAKING — Laboratorio de Ingeniería Inversa y Análisis de Binarios\n\nHerramientas fundamentales de reversing:\n\n• Ghidra (NSA): Decompilador de código abierto para x86/x64/ARM/MIPS.\n• Radare2 / Cutter: Framework de línea de comandos para análisis estático y dinámico.\n• x64dbg / GDB con GEF: Debuggers para análisis en tiempo de ejecución.\n• IDA Pro / Binary Ninja: Herramientas profesionales de análisis de flujo de control.",
		},
		{
			RoomID: "craking",
			Sender: "ReverseEngineer",
			Avatar: "cyber-5",
			Role:   "mod",
			Text:   "💡 TIP TÉCNICO: Al analizar binarios protegidos, verifica siempre los encabezados PE/ELF para identificar packers (UPX, VMProtect, Themida) con 'diec' (Detect It Easy). En próximos directos haremos análisis en vivo de binarios demostrativos.",
		},

		// 5. #hack
		{
			RoomID: "hack",
			Sender: "RedTeamLeader",
			Avatar: "cyber-6",
			Role:   "mod",
			Text:   "⚔️ #HACK — Pentesting, Metodología Ofensiva y Auditoría\n\nMetodología estándar para pruebas de intrusión web:\n\n1. Reconocimiento: Subfinder, Amass, Nmap, Naabu, httpx.\n2. Escaneo de Vulnerabilidades: Nuclei, Burp Suite Professional, OWASP ZAP.\n3. Explotación Ética: SQLi (sqlmap o payloads manuales blind), SSRF en metadatos cloud (169.254.169.254), IDOR y JWT secret cracking.\n4. Post-Explotación y Reporte: Guía OWASP ASVS y mitigaciones concretas.",
		},
		{
			RoomID: "hack",
			Sender: "NeuralBot",
			Avatar: "cyber-1",
			Role:   "admin",
			Text:   "📌 PLATAFORMAS DE ENTRENAMIENTO:\n• Hack The Box (HTB) — Laboratorios de máquinas activas\n• PortSwigger Web Security Academy — Prácticas gratuitas de Burp Suite\n• TryHackMe (THM) — Salas guiadas para principiantes e intermedios.",
		},

		// 6. #mod
		{
			RoomID: "mod",
			Sender: "NeuralBot",
			Avatar: "cyber-1",
			Role:   "admin",
			Text:   "🛡️ #MOD — Canal Oficial de Moderadores y Staff\n\nProtocolo de acción rápida:\n1. Si detectas spam o ataques en cualquier canal, puedes eliminar el mensaje inmediatamente con el botón de papelera 🗑️.\n2. Los moderadores pueden publicar anuncios fijados usando el botón '➕ Añadir Info'.\n3. Coordina directos y eventos con los Super Admins.",
		},

		// 7. #material
		{
			RoomID: "material",
			Sender: "EduMaster",
			Avatar: "cyber-2",
			Role:   "mod",
			Text:   "📚 #MATERIAL — Biblioteca Digital y Recursos Didácticos\n\nCheatsheets esenciales de consulta rápida:\n• Cheatsheet de Nmap: `nmap -sC -sV -p- -T4 --min-rate 1000 -Pn <target>`\n• Cheatsheet de SQLi: Bypasses comunes de WAF (`UNION SELECT`, encodings UTF-8)\n• Cheatsheet de Linux Privilege Escalation: SUID binaries (`find / -perm -4000 2>/dev/null`), cronjobs y capabilities (`getcap -r / 2>/dev/null`).",
		},
		{
			RoomID: "material",
			Sender: "EduMaster",
			Avatar: "cyber-5",
			Role:   "mod",
			Text:   "📁 Todos los archivos y diapositivas de las clases quedan almacenados de forma permanente en nuestro Google Drive de 5TB y pueden ser descargados directamente desde los mensajes del canal.",
		},

		// 8. #dudas
		{
			RoomID: "dudas",
			Sender: "EduMaster",
			Avatar: "cyber-3",
			Role:   "mod",
			Text:   "❓ #DUDAS — Preguntas y Respuestas Técnicas\n\nPara obtener la mejor ayuda de la comunidad, formula tus preguntas incluyendo:\n1. Qué herramienta o tecnología estás utilizando.\n2. Cuál es el error exacto (copia el log o sube una captura con 📎).\n3. Qué pasos ya intentaste para resolverlo.",
		},

		// 9. #talleres
		{
			RoomID: "talleres",
			Sender: "LeadMod",
			Avatar: "cyber-6",
			Role:   "host",
			Text:   "🎥 #TALLERES — Laboratorios Prácticos en Vivo\n\nEn este canal realizamos streaming de pantalla en ultra baja latencia con WebRTC. Cuando comience un directo, verás el reproductor automáticamente en la parte superior.\n\nPróximas temáticas de taller:\n• Análisis de malware en entornos sandbox (AnyRun / Cuckoo)\n• Configuración de proxys inversos seguros con TLS 1.3\n• Desarrollo de extensiones y herramientas en Go y Python.",
		},
	}

	baseTime := time.Now().Add(-2 * time.Hour).UnixMilli()

	for i, s := range seeds {
		var count int64
		DB.Model(&Message{}).Where("room_id = ? AND text = ?", s.RoomID, s.Text).Count(&count)
		if count == 0 {
			msg := Message{
				ID:        uuid.New().String(),
				Type:      EventChat,
				RoomID:    s.RoomID,
				UserID:    "system_" + s.Sender,
				Sender:    s.Sender,
				Avatar:    s.Avatar,
				Role:      s.Role,
				Text:      s.Text,
				CreatedAt: baseTime + int64(i*120000),
			}
			if err := DB.Create(&msg).Error; err != nil {
				log.Printf("[Database] Error sembrando mensaje informativo en %s: %v", s.RoomID, err)
			}
		}
	}
	log.Println("📚 [Database] Mensajes informativos de canales sembrados correctamente.")
}
