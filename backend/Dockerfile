# Etapa 1: Compilación con Go
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copiar go.mod y descargar dependencias
COPY go.mod go.sum* ./
RUN go mod download

# Copiar el código fuente
COPY . .

# Compilar binario estático ultra optimizado
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# Etapa 2: Imagen mínima de producción
FROM alpine:3.20

WORKDIR /app

# Crear usuario sin privilegios y carpeta uploads por seguridad
RUN adduser -D -g '' appuser && mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads
USER appuser

COPY --from=builder /app/server /app/server

ENV PORT=4000
EXPOSE 4000

CMD ["/app/server"]
