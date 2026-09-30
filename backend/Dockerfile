# Etapa 1: Compilación con Go
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copiar go.mod y descargar dependencias directamente desde el proxy oficial de Go
COPY go.mod ./
RUN go mod download

# Copiar el código fuente
COPY . .

# Compilar binario estático ultra optimizado sin símbolos de depuración
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# Etapa 2: Imagen mínima de producción
FROM alpine:3.20

WORKDIR /app

# Crear usuario sin privilegios por seguridad
RUN adduser -D -g '' appuser
USER appuser

COPY --from=builder /app/server /app/server

ENV PORT=4000
EXPOSE 4000

CMD ["/app/server"]
