package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

type DriveService struct {
	srv      *drive.Service
	folderID string
	isReady  bool
}

var GDrive *DriveService

// InitGoogleDrive inicializa el cliente de Google Drive API v3
func InitGoogleDrive() {
	GDrive = &DriveService{
		folderID: os.Getenv("GOOGLE_DRIVE_FOLDER_ID"),
		isReady:  false,
	}

	ctx := context.Background()
	var opt option.ClientOption

	// Opción 1: Archivo de cuenta de servicio
	saKeyFile := os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
	saKeyJSON := os.Getenv("GOOGLE_SERVICE_ACCOUNT_KEY")

	if saKeyFile != "" {
		opt = option.WithCredentialsFile(saKeyFile)
	} else if saKeyJSON != "" {
		opt = option.WithCredentialsJSON([]byte(saKeyJSON))
	} else if _, err := os.Stat("service_account.json"); err == nil {
		opt = option.WithCredentialsFile("service_account.json")
	} else {
		log.Println("[Google Drive] Sin credenciales configuradas. Modo de almacenamiento local activado como fallback.")
		os.MkdirAll("./uploads", 0755)
		return
	}

	srv, err := drive.NewService(ctx, opt, option.WithScopes(drive.DriveScope))
	if err != nil {
		log.Printf("[Google Drive] Error inicializando cliente: %v. Usando almacenamiento local.", err)
		os.MkdirAll("./uploads", 0755)
		return
	}

	GDrive.srv = srv
	GDrive.isReady = true
	log.Printf("✅ [Google Drive] Conectado exitosamente. Carpeta destino: %s", GDrive.folderID)
}

// UploadStreamFile sube un archivo grande por streaming a Google Drive o al almacenamiento local
func (ds *DriveService) UploadStreamFile(fileName string, mimeType string, fileSize int64, reader io.Reader) (*Attachment, error) {
	attachmentID := uuid.New().String()

	// Si Google Drive está listo, subir directamente a la nube
	if ds.isReady && ds.srv != nil {
		f := &drive.File{
			Name:     fileName,
			MimeType: mimeType,
		}
		if ds.folderID != "" {
			f.Parents = []string{ds.folderID}
		}

		// Crear archivo en Drive usando streaming en chunks (4MB por chunk) para archivos pesados
		call := ds.srv.Files.Create(f).Media(reader, googleapi.ChunkSize(4*1024*1024))
		call.Fields("id, name, webViewLink, webContentLink")
		res, err := call.Do()
		if err != nil {
			return nil, fmt.Errorf("error subiendo archivo a Google Drive: %w", err)
		}

		// Otorgar permisos de lectura a cualquiera con el enlace
		perm := &drive.Permission{
			Type: "anyone",
			Role: "reader",
		}
		_, _ = ds.srv.Permissions.Create(res.Id, perm).Do()

		viewLink := res.WebViewLink
		downloadLink := res.WebContentLink
		if downloadLink == "" {
			downloadLink = fmt.Sprintf("https://drive.google.com/uc?id=%s&export=download", res.Id)
		}

		return &Attachment{
			ID:           attachmentID,
			FileName:     fileName,
			FileSize:     fileSize,
			MimeType:     mimeType,
			DriveFileID:  res.Id,
			ViewLink:     viewLink,
			DownloadLink: downloadLink,
			CreatedAt:    time.Now(),
		}, nil
	}

	// Fallback local: guardar en disco del servidor
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/app/uploads"
	}
	_ = os.MkdirAll(uploadDir, 0755)

	cleanName := fmt.Sprintf("%s_%s", attachmentID[:8], filepath.Base(fileName))
	localPath := filepath.Join(uploadDir, cleanName)

	dst, err := os.Create(localPath)
	if err != nil {
		return nil, fmt.Errorf("error creando archivo local: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		return nil, fmt.Errorf("error escribiendo archivo: %w", err)
	}

	relativeURL := fmt.Sprintf("/api/files/%s", cleanName)

	return &Attachment{
		ID:           attachmentID,
		FileName:     fileName,
		FileSize:     fileSize,
		MimeType:     mimeType,
		DriveFileID:  "local_" + cleanName,
		ViewLink:     relativeURL,
		DownloadLink: relativeURL,
		CreatedAt:    time.Now(),
	}, nil
}

// SetupUploadRoutes configura las rutas de subida y descarga de archivos
func SetupUploadRoutes(app *fiber.App, hub *Hub) {
	// Servir archivos locales si se usa el fallback
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/app/uploads"
	}
	app.Static("/api/files", uploadDir)

	// Endpoint para subir archivos pesados
	app.Post("/api/upload", func(c *fiber.Ctx) error {
		// Validar si el usuario envía token en Authorization o en un campo de form
		var userID = "anonymous"
		var username = "Anónimo"
		var role = "viewer"

		authHeader := c.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			if claims, err := ValidateTokenString(strings.TrimPrefix(authHeader, "Bearer ")); err == nil {
				userID = claims.UserID
				username = claims.Username
				role = claims.Role
			}
		}

		roomID := c.FormValue("roomId", "main")

		// Recibir el archivo en stream multipart
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No se recibió ningún archivo"})
		}

		file, err := fileHeader.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudo leer el archivo"})
		}
		defer file.Close()

		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		log.Printf("[Upload] Recibiendo archivo '%s' (%d bytes) para la sala '%s'", fileHeader.Filename, fileHeader.Size, roomID)

		attachment, err := GDrive.UploadStreamFile(fileHeader.Filename, mimeType, fileHeader.Size, file)
		if err != nil {
			log.Printf("[Upload Error] %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}

		attachment.UserID = userID
		attachment.SenderName = username

		// Crear mensaje de chat asociado al archivo
		msgID := uuid.New().String()
		attachment.MessageID = msgID

		chatMsg := Message{
			ID:         msgID,
			Type:       EventFile,
			RoomID:     roomID,
			UserID:     userID,
			Sender:     username,
			Role:       role,
			Text:       fmt.Sprintf("compartió un archivo: %s", attachment.FileName),
			Attachment: attachment,
			CreatedAt:  time.Now().UnixMilli(),
		}

		if DB != nil {
			msgCopy := chatMsg
			msgCopy.Attachment = nil
			if err := DB.Create(&msgCopy).Error; err == nil {
				_ = DB.Create(attachment).Error
			}
		}

		// Difundir inmediatamente por WebSocket a todos en la sala del directo
		hub.Broadcast <- chatMsg

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"success":    true,
			"attachment": attachment,
			"message":    chatMsg,
		})
	})
}
