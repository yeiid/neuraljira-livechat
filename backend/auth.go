package main

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "neuraljira_live_ultra_jwt_secret_2026"
	}
	jwtSecret = []byte(secret)
}

// UserClaims estructura el contenido del token JWT
type UserClaims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateJWT crea un token firmado para el usuario
func GenerateJWT(user *User) (string, error) {
	claims := UserClaims{
		UserID:   user.ID,
		Username: user.Username,
		Avatar:   user.Avatar,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 días de sesión
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "neuraljira-live",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateTokenString valida un token y devuelve los claims
func ValidateTokenString(tokenStr string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token inválido")
}

// JWTMiddleware protege rutas HTTP
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token de autenticación requerido",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Formato de autorización inválido (Bearer <token>)",
			})
		}

		claims, err := ValidateTokenString(parts[1])
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token inválido o expirado",
			})
		}

		c.Locals("user", claims)
		return c.Next()
	}
}

// SetupAuthRoutes configura los endpoints de autenticación
func SetupAuthRoutes(app *fiber.App) {
	auth := app.Group("/api/auth")

	// Registro de nuevo usuario
	auth.Post("/register", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var req struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Avatar   string `json:"avatar"`
			Role     string `json:"role"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud inválido"})
		}

		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if req.Username == "" || req.Email == "" || len(req.Password) < 6 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Datos inválidos. La contraseña debe tener al menos 6 caracteres."})
		}

		// Validar unicidad
		var count int64
		DB.Model(&User{}).Where("username = ? OR email = ?", req.Username, req.Email).Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El nombre de usuario o correo ya está en uso"})
		}

		// Hash de contraseña con bcrypt
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error cifrando contraseña"})
		}

		avatar := req.Avatar
		if avatar == "" {
			avatar = "cyber-1"
		}

		role := req.Role
		if role == "" || (role != "host" && role != "mod" && role != "vip") {
			role = "viewer"
		}

		user := User{
			ID:           uuid.New().String(),
			Username:     req.Username,
			Email:        req.Email,
			PasswordHash: string(hash),
			Avatar:       avatar,
			Role:         role,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := DB.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error guardando usuario"})
		}

		token, err := GenerateJWT(&user)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando sesión"})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"token": token,
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

	// Login de usuario existente
	auth.Post("/login", func(c *fiber.Ctx) error {
		if DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Base de datos no disponible"})
		}

		var req struct {
			Login    string `json:"login"` // Puede ser username o email
			Password string `json:"password"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud inválido"})
		}

		login := strings.TrimSpace(req.Login)
		if login == "" || req.Password == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Credenciales incompletas"})
		}

		var user User
		err := DB.Where("username = ? OR email = ?", login, strings.ToLower(login)).First(&user).Error
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario o contraseña incorrectos"})
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario o contraseña incorrectos"})
		}

		token, err := GenerateJWT(&user)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error generando sesión"})
		}

		return c.JSON(fiber.Map{
			"token": token,
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

	// Perfil del usuario actual
	auth.Get("/me", JWTMiddleware(), func(c *fiber.Ctx) error {
		claims := c.Locals("user").(*UserClaims)
		var user User
		if err := DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario no encontrado"})
		}

		return c.JSON(fiber.Map{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"avatar":    user.Avatar,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
		})
	})
}
