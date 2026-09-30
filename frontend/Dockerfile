# Etapa 1: Compilación
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Argumento para pasar URL de backend si se compila con URL absoluta fija (opcional)
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Etapa 2: Servidor Web Nginx ultra ligero
FROM nginx:alpine

# Reemplazar configuración por defecto
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build de la PWA
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
