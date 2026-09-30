# ⚡ Neuraljira LiveChat (PWA + Go Fiber WebSockets)

Aplicación de mensajería en tiempo real y alta concurrencia diseñada para directos y streaming en vivo con la identidad de marca **Neuraljira**. 

Construida con un backend en **Go (Fiber v2 + WebSockets)** de ultra bajo consumo y un frontend en **React + Vite + Tailwind CSS + PWA (instalable en móviles y PC)**, optimizada para desplegarse en **Dokploy**.

---

## 🌟 Características Principales

* ⚡ **Ultra Bajo Consumo:** El backend en Go consume apenas ~20MB de memoria RAM y compila en una imagen Docker de solo ~18MB.
* 📱 **PWA Nativa:** Funciona como aplicación instalable en Android, iOS y Escritorio (con Service Worker, offline cache y Web Manifest).
* 💬 **Chat Dinámico para Directos:**
  * Soporte de múltiples salas vía URL: `/live?room=nombre-sala`.
  * Contador de espectadores en vivo en tiempo real.
  * Reacciones animadas flotantes (❤️, 🔥, 🚀, 👏, 💡, 💯) estilo TikTok/Instagram Live.
  * Autoscroll inteligente (se detiene si subes a leer mensajes anteriores y muestra botón de alerta).
  * Selector de avatares estilo Cyberpunk y roles visuales (**HOST**, **MOD**, **VIP**, **VIEWER**).
  * Reconexión automática con exponential backoff.
* 🚀 **Listo para Dokploy:** Configuración con Traefik, soporte nativo de WebSockets (`WSS`) y certificados SSL automáticos con Let's Encrypt.

---

## 🏗️ Arquitectura del Proyecto

```
neuraljira-livechat/
├── backend/                  # Servidor en Go (Fiber + WebSockets)
│   ├── main.go               # Enrutador HTTP, CORS, health check y WS
│   ├── hub.go                # Hub concurrente con Goroutines y salas
│   ├── models.go             # Estructuras de mensajes y eventos
│   ├── go.mod                # Dependencias Go
│   └── Dockerfile            # Compilación multi-stage (~18MB)
├── frontend/                 # Aplicación PWA
│   ├── src/
│   │   ├── components/       # Header, MessageList, MessageInput, etc.
│   │   ├── hooks/            # useLiveChat (WebSocket hook)
│   │   ├── types.ts          # Tipos e interfaces
│   │   ├── App.tsx           # Contenedor principal responsive
│   │   └── main.tsx          # Entrada y registro de Service Worker
│   ├── public/               # Favicon SVG y assets PWA
│   ├── nginx.conf            # Configuración Nginx para SPA & PWA
│   ├── vite.config.ts        # Vite + plugin PWA
│   └── Dockerfile            # Multi-stage Nginx Alpine
├── docker-compose.yml        # Orquestación Dokploy con Traefik y Redis
└── .env.example              # Variables de entorno
```

---

## 🚀 Despliegue en Dokploy (Paso a Paso)

### Opción 1: Despliegue con Docker Compose (Recomendado)

1. **Sube este repositorio a tu GitHub o GitLab.**
2. En tu panel de **Dokploy**:
   * Haz clic en **Projects** -> Selecciona tu proyecto o crea uno nuevo.
   * Haz clic en **Create Service** y selecciona **Compose**.
   * Conecta tu repositorio Git o pega el contenido de `docker-compose.yml`.
3. **Configura las Variables de Entorno en Dokploy:**
   ```env
   DOMAIN=chat.tudominio.com
   PORT=4000
   ```
4. **Asigna el Dominio:**
   * En la pestaña **Domains** de tu servicio en Dokploy, apunta tu dominio `chat.tudominio.com` a la IP de tu VPS con SSL activado (Let's Encrypt).
5. Haz clic en **Deploy**. ¡Listo! Dokploy levantará el frontend, el backend en Go y Redis automáticamente.

---

## 💻 Desarrollo Local (Sin Docker)

### 1. Iniciar el Backend (Go):
```bash
cd backend
go run .
# El backend iniciará en http://localhost:4000
```

### 2. Iniciar el Frontend (PWA):
```bash
cd frontend
npm install
npm run dev
# Abrir en el navegador http://localhost:3000
```

---

## 📲 Cómo Probar e Instalar la PWA en Móviles

1. Entra desde tu teléfono (Chrome en Android o Safari en iOS) a la URL de tu directo:
   `https://chat.tudominio.com?room=directo-especial`
2. **Android:** Aparecerá el banner de instalación *"Instala Neuraljira Live en tu dispositivo"* o pulsa los 3 puntos -> **Instalar aplicación**.
3. **iOS (iPhone/iPad):** Pulsa el botón de Compartir en Safari -> **Añadir a pantalla de inicio**.
4. ¡La app se abrirá a pantalla completa sin barras de navegador, exactamente igual que una app nativa de la tienda!
