package main

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ============ MODELOS RED SOCIAL (estilo FB/X/TG, infra propia) ============

// Post es una publicación del feed (texto + media opcional vía /api/upload)
type Post struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	UserID       string    `gorm:"type:varchar(64);index;not null" json:"userId"`
	Username     string    `gorm:"type:varchar(64)" json:"username"`
	Avatar       string    `gorm:"type:varchar(64)" json:"avatar"`
	Text         string    `gorm:"type:text;not null" json:"text"`
	MediaURL     string    `gorm:"type:text" json:"mediaUrl,omitempty"`
	MediaType    string    `gorm:"type:varchar(32)" json:"mediaType,omitempty"` // image, video, file
	LikeCount    int       `gorm:"default:0" json:"likeCount"`
	CommentCount int       `gorm:"default:0" json:"commentCount"`
	CreatedAt    time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	// Solo respuesta, no columna:
	LikedByMe bool `gorm:"-" json:"likedByMe,omitempty"`
}

// PostLike evita doble-like (compuesto único)
type PostLike struct {
	ID        string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	PostID    string    `gorm:"type:varchar(64);index;not null;uniqueIndex:idx_post_user" json:"postId"`
	UserID    string    `gorm:"type:varchar(64);index;not null;uniqueIndex:idx_post_user" json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

// PostComment comentario en un post
type PostComment struct {
	ID        string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	PostID    string    `gorm:"type:varchar(64);index;not null" json:"postId"`
	UserID    string    `gorm:"type:varchar(64);index" json:"userId"`
	Username  string    `gorm:"type:varchar(64)" json:"username"`
	Avatar    string    `gorm:"type:varchar(64)" json:"avatar"`
	Text      string    `gorm:"type:text;not null" json:"text"`
	CreatedAt time.Time `gorm:"index" json:"createdAt"`
}

// Follow relación seguidor -> seguido (estilo X/IG)
type Follow struct {
	FollowerID  string    `gorm:"type:varchar(64);primaryKey" json:"followerId"`
	FollowingID string    `gorm:"type:varchar(64);primaryKey" json:"followingId"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Story historia / clip efímero 24h (estilo TG/FB/IG)
type Story struct {
	ID        string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	UserID    string    `gorm:"type:varchar(64);index;not null" json:"userId"`
	Username  string    `gorm:"type:varchar(64)" json:"username"`
	Avatar    string    `gorm:"type:varchar(64)" json:"avatar"`
	Text      string    `gorm:"type:varchar(500)" json:"text,omitempty"`
	MediaURL  string    `gorm:"type:text" json:"mediaUrl,omitempty"`
	MediaType string    `gorm:"type:varchar(32);default:'image'" json:"mediaType"` // image, video
	Views     int       `gorm:"default:0" json:"views"`
	ExpiresAt time.Time `gorm:"index" json:"expiresAt"`
	CreatedAt time.Time `gorm:"index" json:"createdAt"`
}

func getClaims(c *fiber.Ctx) *UserClaims {
	if v, ok := c.Locals("user").(*UserClaims); ok {
		return v
	}
	return nil
}

// tryBroadcastSocial notifica por WS a la sala social-feed si existe (no bloquea)
func tryBroadcastSocial(hub *Hub, msgType EventType, text string, userID, username string) {
	if hub == nil {
		return
	}
	hub.Mu.RLock()
	_, exists := hub.Rooms["social-feed"]
	hub.Mu.RUnlock()
	if !exists {
		return
	}
	hub.BroadcastToRoom("social-feed", Message{
		ID:        uuid.New().String(),
		Type:      msgType,
		RoomID:    "social-feed",
		UserID:    userID,
		Sender:    username,
		Text:      text,
		CreatedAt: time.Now().UnixMilli(),
	}, false)
}

// SetupSocialRoutes registra /api/social (feed + follows + stories)
func SetupSocialRoutes(app *fiber.App, hub *Hub) {
	s := app.Group("/api/social")

	// ---------- POSTS ----------
	// Crear post (requiere login)
	s.Post("/posts", JWTMiddleware(), func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "DB no disponible"})
		}
		claims := getClaims(c)
		var req struct {
			Text      string `json:"text"`
			MediaURL  string `json:"mediaUrl"`
			MediaType string `json:"mediaType"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}
		req.Text = strings.TrimSpace(req.Text)
		if req.Text == "" || len(req.Text) > 2000 {
			return c.Status(400).JSON(fiber.Map{"error": "Texto requerido (1-2000 caracteres)"})
		}
		if req.MediaType == "" && req.MediaURL != "" {
			req.MediaType = "image"
		}
		post := Post{
			ID:        uuid.New().String(),
			UserID:    claims.UserID,
			Username:  claims.Username,
			Avatar:    claims.Avatar,
			Text:      req.Text,
			MediaURL:  req.MediaURL,
			MediaType: req.MediaType,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := DB.Create(&post).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "No se pudo publicar"})
		}
		tryBroadcastSocial(hub, EventPost, post.ID, post.UserID, post.Username)
		return c.Status(201).JSON(post)
	})

	// Feed público: ?filter=all|following&limit=20&offset=0
	s.Get("/feed", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "DB no disponible"})
		}
		limit := c.QueryInt("limit", 20)
		if limit <= 0 || limit > 50 {
			limit = 20
		}
		offset := c.QueryInt("offset", 0)
		filter := c.Query("filter", "all")

		// Usuario opcional para likedByMe y following
		var meID string
		if h := c.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
			if cl, err := ValidateTokenString(strings.TrimPrefix(h, "Bearer ")); err == nil {
				meID = cl.UserID
			}
		}

		q := DB.Model(&Post{}).Order("created_at desc").Limit(limit).Offset(offset)
		if filter == "following" {
			if meID == "" {
				return c.Status(401).JSON(fiber.Map{"error": "Login requerido para ver seguidos"})
			}
			var ids []string
			DB.Model(&Follow{}).Where("follower_id = ?", meID).Pluck("following_id", &ids)
			ids = append(ids, meID) // incluir propios
			q = q.Where("user_id IN ?", ids)
		}
		var posts []Post
		if err := q.Find(&posts).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Error cargando feed"})
		}
		if meID != "" && len(posts) > 0 {
			var postIDs []string
			for _, p := range posts {
				postIDs = append(postIDs, p.ID)
			}
			var likes []PostLike
			DB.Where("post_id IN ? AND user_id = ?", postIDs, meID).Find(&likes)
			liked := map[string]bool{}
			for _, l := range likes {
				liked[l.PostID] = true
			}
			for i := range posts {
				posts[i].LikedByMe = liked[posts[i].ID]
			}
		}
		return c.JSON(fiber.Map{"posts": posts, "limit": limit, "offset": offset})
	})

	// Detalle + borrar (solo dueño)
	s.Get("/posts/:id", func(c *fiber.Ctx) error {
		var p Post
		if err := DB.First(&p, "id = ?", c.Params("id")).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Post no encontrado"})
		}
		return c.JSON(p)
	})
	s.Delete("/posts/:id", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		var p Post
		if err := DB.First(&p, "id = ?", c.Params("id")).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Post no encontrado"})
		}
		if p.UserID != claims.UserID {
			return c.Status(403).JSON(fiber.Map{"error": "Solo el autor puede borrar"})
		}
		DB.Where("post_id = ?", p.ID).Delete(&PostComment{})
		DB.Where("post_id = ?", p.ID).Delete(&PostLike{})
		DB.Delete(&p)
		return c.JSON(fiber.Map{"success": true})
	})

	// Like toggle
	s.Post("/posts/:id/like", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		postID := c.Params("id")
		var p Post
		if err := DB.First(&p, "id = ?", postID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Post no encontrado"})
		}
		var existing PostLike
		err := DB.Where("post_id = ? AND user_id = ?", postID, claims.UserID).First(&existing).Error
		liked := true
		if err == nil {
			// quitar like
			DB.Delete(&existing)
			DB.Model(&Post{}).Where("id = ?", postID).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)"))
			liked = false
		} else {
			DB.Create(&PostLike{ID: uuid.New().String(), PostID: postID, UserID: claims.UserID, CreatedAt: time.Now()})
			DB.Model(&Post{}).Where("id = ?", postID).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
		}
		var updated Post
		DB.First(&updated, "id = ?", postID)
		updated.LikedByMe = liked
		tryBroadcastSocial(hub, EventPostLike, postID, claims.UserID, claims.Username)
		return c.JSON(updated)
	})

	// Comentarios
	s.Get("/posts/:id/comments", func(c *fiber.Ctx) error {
		var comments []PostComment
		DB.Where("post_id = ?", c.Params("id")).Order("created_at asc").Limit(100).Find(&comments)
		return c.JSON(fiber.Map{"comments": comments})
	})
	s.Post("/posts/:id/comments", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		postID := c.Params("id")
		var p Post
		if err := DB.First(&p, "id = ?", postID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Post no encontrado"})
		}
		var req struct {
			Text string `json:"text"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}
		req.Text = strings.TrimSpace(req.Text)
		if req.Text == "" || len(req.Text) > 500 {
			return c.Status(400).JSON(fiber.Map{"error": "Comentario 1-500 caracteres"})
		}
		comment := PostComment{
			ID: uuid.New().String(), PostID: postID,
			UserID: claims.UserID, Username: claims.Username, Avatar: claims.Avatar,
			Text: req.Text, CreatedAt: time.Now(),
		}
		DB.Create(&comment)
		DB.Model(&Post{}).Where("id = ?", postID).UpdateColumn("comment_count", gorm.Expr("comment_count + 1"))
		return c.Status(201).JSON(comment)
	})

	// ---------- FOLLOWS (estilo X) ----------
	s.Post("/follow/:userId", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		target := c.Params("userId")
		if target == claims.UserID {
			return c.Status(400).JSON(fiber.Map{"error": "No puedes seguirte a ti mismo"})
		}
		DB.FirstOrCreate(&Follow{}, Follow{FollowerID: claims.UserID, FollowingID: target})
		return c.JSON(fiber.Map{"success": true, "following": target})
	})
	s.Delete("/follow/:userId", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		DB.Delete(&Follow{}, "follower_id = ? AND following_id = ?", claims.UserID, c.Params("userId"))
		return c.JSON(fiber.Map{"success": true})
	})
	s.Get("/follow/status/:userId", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		var count int64
		DB.Model(&Follow{}).Where("follower_id = ? AND following_id = ?", claims.UserID, c.Params("userId")).Count(&count)
		var followers, following int64
		DB.Model(&Follow{}).Where("following_id = ?", c.Params("userId")).Count(&followers)
		DB.Model(&Follow{}).Where("follower_id = ?", c.Params("userId")).Count(&following)
		return c.JSON(fiber.Map{"isFollowing": count > 0, "followers": followers, "following": following})
	})

	// ---------- STORIES 24h (estilo TG/FB) ----------
	s.Post("/stories", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		var req struct {
			Text      string `json:"text"`
			MediaURL  string `json:"mediaUrl"`
			MediaType string `json:"mediaType"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cuerpo inválido"})
		}
		if strings.TrimSpace(req.Text) == "" && strings.TrimSpace(req.MediaURL) == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Texto o imagen/video requerido"})
		}
		if req.MediaType == "" {
			req.MediaType = "image"
		}
		now := time.Now()
		story := Story{
			ID: now.Format("20060102150405") + "_" + uuid.New().String()[:8],
			UserID: claims.UserID, Username: claims.Username, Avatar: claims.Avatar,
			Text: strings.TrimSpace(req.Text), MediaURL: req.MediaURL, MediaType: req.MediaType,
			ExpiresAt: now.Add(24 * time.Hour), CreatedAt: now,
		}
		// ID legible + único
		story.ID = uuid.New().String()
		if err := DB.Create(&story).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "No se pudo publicar story"})
		}
		tryBroadcastSocial(hub, EventStory, story.ID, story.UserID, story.Username)
		return c.Status(201).JSON(story)
	})
	s.Get("/stories/feed", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "DB no disponible"})
		}
		// Limpieza oportunista de expiradas
		DB.Where("expires_at < ?", time.Now()).Delete(&Story{})
		var stories []Story
		DB.Where("expires_at > ?", time.Now()).Order("created_at desc").Limit(100).Find(&stories)
		// Agrupar por usuario (como IG/WA)
		type Group struct {
			UserID   string  `json:"userId"`
			Username string  `json:"username"`
			Avatar   string  `json:"avatar"`
			Items    []Story `json:"items"`
		}
		groups := []Group{}
		idx := map[string]int{}
		for _, st := range stories {
			if i, ok := idx[st.UserID]; ok {
				groups[i].Items = append(groups[i].Items, st)
			} else {
				idx[st.UserID] = len(groups)
				groups = append(groups, Group{UserID: st.UserID, Username: st.Username, Avatar: st.Avatar, Items: []Story{st}})
			}
		}
		return c.JSON(fiber.Map{"groups": groups})
	})
	s.Post("/stories/:id/view", func(c *fiber.Ctx) error {
		DB.Model(&Story{}).Where("id = ?", c.Params("id")).UpdateColumn("views", gorm.Expr("views + 1"))
		return c.JSON(fiber.Map{"success": true})
	})
	s.Delete("/stories/:id", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := getClaims(c)
		var st Story
		if err := DB.First(&st, "id = ?", c.Params("id")).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Story no encontrada"})
		}
		if st.UserID != claims.UserID {
			return c.Status(403).JSON(fiber.Map{"error": "Solo el autor puede borrar"})
		}
		DB.Delete(&st)
		return c.JSON(fiber.Map{"success": true})
	})

	// ---------- PERFIL PÚBLICO ----------
	s.Get("/users/:userId/profile", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "DB no disponible"})
		}
		target := c.Params("userId")
		var u User
		// Buscar por ID o username
		if err := DB.Where("id = ? OR username = ?", target, target).First(&u).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Usuario no encontrado"})
		}
		var postsCount, followers, following int64
		DB.Model(&Post{}).Where("user_id = ?", u.ID).Count(&postsCount)
		DB.Model(&Follow{}).Where("following_id = ?", u.ID).Count(&followers)
		DB.Model(&Follow{}).Where("follower_id = ?", u.ID).Count(&following)
		isFollowing := false
		isSelf := false
		if h := c.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
			if cl, err := ValidateTokenString(strings.TrimPrefix(h, "Bearer ")); err == nil {
				isSelf = cl.UserID == u.ID
				if !isSelf {
					var cnt int64
					DB.Model(&Follow{}).Where("follower_id = ? AND following_id = ?", cl.UserID, u.ID).Count(&cnt)
					isFollowing = cnt > 0
				}
			}
		}
		return c.JSON(fiber.Map{
			"id": u.ID, "username": u.Username, "avatar": u.Avatar, "role": u.Role,
			"createdAt": u.CreatedAt, "postsCount": postsCount,
			"followers": followers, "following": following,
			"isFollowing": isFollowing, "isSelf": isSelf,
		})
	})
	s.Get("/users/:userId/posts", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "DB no disponible"})
		}
		target := c.Params("userId")
		var u User
		if err := DB.Where("id = ? OR username = ?", target, target).First(&u).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Usuario no encontrado"})
		}
		limit := c.QueryInt("limit", 20)
		if limit <= 0 || limit > 50 {
			limit = 20
		}
		offset := c.QueryInt("offset", 0)
		var posts []Post
		DB.Where("user_id = ?", u.ID).Order("created_at desc").Limit(limit).Offset(offset).Find(&posts)
		return c.JSON(fiber.Map{"posts": posts})
	})
}
