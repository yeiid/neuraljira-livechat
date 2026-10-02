package main

import (
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AdminMiddleware protege rutas exclusivas para Super Admins
func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(*UserClaims)
		if !ok || (user.Role != "admin" && user.Role != "superadmin") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso restringido: requiere permisos de Super Administrador",
			})
		}
		return c.Next()
	}
}

// AdminOrModMiddleware permite acceso a Super Admins y Moderadores
func AdminOrModMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(*UserClaims)
		if !ok || (user.Role != "admin" && user.Role != "superadmin" && user.Role != "mod") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso restringido: requiere permisos de Moderador o Administrador",
			})
		}
		return c.Next()
	}
}

// SetupModerationRoutes configura las rutas de administración, roles y moderación de chat
func SetupModerationRoutes(app *fiber.App, hub *Hub) {
	adminSecret := os.Getenv("ADMIN_SECRET")
	if adminSecret == "" {
		adminSecret = "neuraladmin2026"
	}

	// POST /api/admin/claim - Permite reclamar el rol de Super Admin con la clave maestra
	app.Post("/api/admin/claim", JWTMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		claims := c.Locals("user").(*UserClaims)

		var req struct {
			Secret string `json:"secret"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}

		if strings.TrimSpace(req.Secret) != adminSecret {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Clave maestra de administrador incorrecta"})
		}

		var user User
		if err := DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario no encontrado"})
		}

		user.Role = "admin"
		if err := DB.Save(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al actualizar rol de administrador"})
		}

		newToken, err := GenerateJWT(&user)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando nuevo token de sesión"})
		}

		return c.JSON(fiber.Map{
			"success": true,
			"message": "¡Has reclamado con éxito los privilegios de Super Admin!",
			"token":   newToken,
			"user": fiber.Map{
				"id":        user.ID,
				"username":  user.Username,
				"email":     user.Email,
				"avatar":    user.Avatar,
				"role":      user.Role,
				"createdAt": user.CreatedAt,
			},
		})
	})

	// GET /api/admin/users - Lista de usuarios registrados (Super Admin)
	app.Get("/api/admin/users", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var users []User
		if err := DB.Order("created_at desc").Limit(100).Find(&users).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error obteniendo lista de usuarios"})
		}

		type UserDTO struct {
			ID        string    `json:"id"`
			Username  string    `json:"username"`
			Email     string    `json:"email"`
			Avatar    string    `json:"avatar"`
			Role      string    `json:"role"`
			CreatedAt time.Time `json:"createdAt"`
		}

		var response []UserDTO
		for _, u := range users {
			response = append(response, UserDTO{
				ID:        u.ID,
				Username:  u.Username,
				Email:     u.Email,
				Avatar:    u.Avatar,
				Role:      u.Role,
				CreatedAt: u.CreatedAt,
			})
		}

		return c.JSON(response)
	})

	// POST /api/admin/set-role - Asignar roles (mod, vip, viewer, host, admin) a cualquier usuario (Super Admin)
	app.Post("/api/admin/set-role", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var req struct {
			UserID string `json:"userId"`
			Role   string `json:"role"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Datos inválidos"})
		}

		req.Role = strings.ToLower(strings.TrimSpace(req.Role))
		validRoles := map[string]bool{"admin": true, "mod": true, "vip": true, "viewer": true, "host": true}
		if !validRoles[req.Role] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Rol no válido. Permitidos: admin, mod, vip, viewer, host"})
		}

		var user User
		if err := DB.First(&user, "id = ?", req.UserID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario objetivo no encontrado"})
		}

		user.Role = req.Role
		if err := DB.Save(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al actualizar rol del usuario"})
		}

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Rol actualizado correctamente",
			"user": fiber.Map{
				"id":       user.ID,
				"username": user.Username,
				"role":     user.Role,
			},
		})
	})

	// DELETE /api/moderation/messages/:id - Elimina un mensaje indebido (Super Admin o Mod)
	app.Delete("/api/moderation/messages/:id", JWTMiddleware(), AdminOrModMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		messageID := c.Params("id")
		var msg Message
		if err := DB.First(&msg, "id = ?", messageID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mensaje no encontrado"})
		}

		roomID := msg.RoomID

		// Eliminar de base de datos
		DB.Delete(&Message{}, "id = ?", messageID)

		// Remover del historial en memoria de la sala
		hub.Mu.RLock()
		room, exists := hub.Rooms[roomID]
		hub.Mu.RUnlock()
		if exists {
			room.Mu.Lock()
			newHistory := make([]Message, 0, len(room.History))
			for _, m := range room.History {
				if m.ID != messageID {
					newHistory = append(newHistory, m)
				}
			}
			room.History = newHistory
			room.Mu.Unlock()
		}

		// Emitir evento de eliminación en tiempo real a todos los conectados en la sala
		delBroadcast := Message{
			ID:        uuid.New().String(),
			Type:      EventMessageDelete,
			RoomID:    roomID,
			Text:      messageID,
			CreatedAt: time.Now().UnixMilli(),
		}
		hub.BroadcastToRoom(roomID, delBroadcast, false)

		return c.JSON(fiber.Map{
			"success":   true,
			"messageId": messageID,
			"message":   "Mensaje eliminado por moderación",
		})
	})
}
