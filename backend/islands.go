package main

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// SetupIslandRoutes registra las rutas para la gestión y visualización de Islas y Canales
func SetupIslandRoutes(app *fiber.App, hub *Hub) {
	group := app.Group("/api/islands")

	// GET /api/islands - Lista todas las islas y canales con contadores en vivo
	group.Get("/", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var islands []Island
		if err := DB.Preload("Channels").Order("\"order\" asc, created_at asc").Find(&islands).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar islas"})
		}

		// Enriquecer canales con espectadores activos en tiempo real desde el hub
		type ChannelResponse struct {
			Channel
			LiveViewers int  `json:"liveViewers"`
			IsLive      bool `json:"isLive"`
		}

		type IslandResponse struct {
			ID          string            `json:"id"`
			Name        string            `json:"name"`
			Icon        string            `json:"icon"`
			Description string            `json:"description"`
			Order       int               `json:"order"`
			Channels    []ChannelResponse `json:"channels"`
		}

		var response []IslandResponse
		for _, isl := range islands {
			var chList []ChannelResponse
			for _, ch := range isl.Channels {
				hub.Mu.RLock()
				room, exists := hub.Rooms[ch.Slug]
				viewers := 0
				isLive := false
				if exists {
					room.Mu.RLock()
					viewers = len(room.Clients)
					isLive = room.IsLive
					room.Mu.RUnlock()
				}
				hub.Mu.RUnlock()

				chList = append(chList, ChannelResponse{
					Channel:     ch,
					LiveViewers: viewers,
					IsLive:      isLive,
				})
			}

			response = append(response, IslandResponse{
				ID:          isl.ID,
				Name:        isl.Name,
				Icon:        isl.Icon,
				Description: isl.Description,
				Order:       isl.Order,
				Channels:    chList,
			})
		}

		return c.JSON(response)
	})

	// POST /api/islands - Crear nueva isla (Sólo Super Admin)
	group.Post("/", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var req struct {
			Name        string `json:"name"`
			Icon        string `json:"icon"`
			Description string `json:"description"`
			Order       int    `json:"order"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Datos inválidos"})
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El nombre de la isla es obligatorio"})
		}

		if req.Icon == "" {
			req.Icon = "Terminal"
		}

		island := Island{
			ID:          "island_" + strings.ToLower(uuid.New().String()[:8]),
			Name:        req.Name,
			Icon:        req.Icon,
			Description: req.Description,
			Order:       req.Order,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := DB.Create(&island).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al crear isla"})
		}

		return c.Status(fiber.StatusCreated).JSON(island)
	})

	// DELETE /api/islands/:id - Eliminar una isla y sus canales (Sólo Super Admin)
	group.Delete("/:id", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		id := c.Params("id")
		// Eliminar canales primero
		DB.Where("island_id = ?", id).Delete(&Channel{})
		// Eliminar isla
		if err := DB.Delete(&Island{}, "id = ?", id).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al eliminar isla"})
		}

		return c.JSON(fiber.Map{"success": true, "message": "Isla eliminada correctamente"})
	})

	// POST /api/islands/:id/channels - Crear un nuevo canal en la isla (Sólo Super Admin)
	group.Post("/:id/channels", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		islandID := c.Params("id")
		var island Island
		if err := DB.First(&island, "id = ?", islandID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Isla no encontrada"})
		}

		var req struct {
			Name        string `json:"name"`
			Slug        string `json:"slug"`
			Description string `json:"description"`
			Icon        string `json:"icon"`
			MinRole     string `json:"minRole"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Datos inválidos"})
		}

		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El nombre del canal es obligatorio"})
		}

		req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
		if req.Slug == "" {
			req.Slug = strings.ReplaceAll(strings.ToLower(req.Name), " ", "-")
		}

		if req.MinRole == "" {
			req.MinRole = "viewer"
		}
		if req.Icon == "" {
			req.Icon = "Hash"
		}

		channel := Channel{
			ID:          "ch_" + strings.ToLower(uuid.New().String()[:8]),
			IslandID:    islandID,
			Name:        req.Name,
			Slug:        req.Slug,
			Description: req.Description,
			Icon:        req.Icon,
			MinRole:     req.MinRole,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := DB.Create(&channel).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al crear canal"})
		}

		return c.Status(fiber.StatusCreated).JSON(channel)
	})

	// DELETE /api/channels/:id - Eliminar canal (Sólo Super Admin)
	app.Delete("/api/channels/:id", JWTMiddleware(), AdminMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		id := c.Params("id")
		if err := DB.Delete(&Channel{}, "id = ?", id).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al eliminar canal"})
		}

		return c.JSON(fiber.Map{"success": true, "message": "Canal eliminado correctamente"})
	})
}
