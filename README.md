# ⚡ Neuraljira Live Platform (PWA + Go Fiber + WebRTC + PostgreSQL + Google Drive 5TB)

Plataforma integral de mensajería y streaming en tiempo real diseñada para directos, presentaciones y colaboración con la identidad de marca **Neuraljira**.

---

## 🌟 Nuevas Funcionalidades Implementadas

### 1. 🔐 Autenticación de Usuarios y Persistencia (PostgreSQL 16)
* **Registro y Login:** Autenticación segura mediante contraseñas cifradas con **bcrypt** y tokens **JWT** persistentes (sesiones de 7 días).
* **Base de Datos PostgreSQL:** Almacenamiento y persistencia en tiempo real de usuarios, salas, mensajes e historial de archivos compartidos usando GORM.
* **Roles definidos:**
  * 👑 **Host:** Administrador del directo con capacidad para emitir pantalla y cámara en tiempo real.
  * 🛡️ **Mod:** Moderador de la sala.
  * 💎 **VIP:** Espectador destacado.
  * 👁️ **Viewer:** Espectador estándar.
* **Modo Invitado:** Acceso instantáneo con un clic para usuarios sin cuenta previa.

### 2. 📁 Compartir Archivos Pesados con tus 5TB de Google Drive
* **Subida en Streaming por Chunks (Resumable Upload):** El backend de Go transfiere archivos pesados por chunks directamente hacia la API de Google Drive, **sin agotar la memoria RAM ni el disco de tu VPS en Dokploy**.
* **Enlaces Compartibles:** Genera automáticamente enlaces de visualización previa y descarga directa para todos los participantes del directo.
* **Tarjetas Interactivas en el Chat:** Previsualización de imágenes, reproductor de video en línea, reproductor de audio y tarjetas de descarga con tamaño formateado (MB / GB) y enlace a Drive.
* **Fallback Automático:** Si no hay credenciales de Google Drive configuradas, la plataforma almacena automáticamente los archivos en almacenamiento local seguro.

### 3. 🔴 Live Streaming de Ultra Baja Latencia (<300ms) desde PC
* **WebRTC Nativo en Go (Pion):** Transmisión de video y audio en tiempo real con latencia inferior a medio segundo.
* **Para el Host en PC:**
  * **Compartir Pantalla Completa, Ventana de App o Pestaña del Navegador** con audio del sistema integrado.
  * **Cámara Web y Micrófono** con botón para silenciar audio o apagar video.
* **Para los Espectadores (PWA Móvil y PC):**
  * Reproductor WebRTC adaptativo encima del chat con auto-reproducción sincronizada.
  * Modo **Pantalla Completa** y **Picture-in-Picture (PiP)** para seguir viendo el live mientras navegas o chateas.

---

## 🚀 Despliegue en Dokploy

En tu panel de **Dokploy**:
1. Conecta este repositorio en un servicio tipo **Compose**.
2. Configura las variables de entorno en la pestaña **Environment Variables**:
   ```env
   DOMAIN=chat.neuraljira.com
   PORT=4000
   
   # PostgreSQL
   POSTGRES_USER=neuraluser
   POSTGRES_PASSWORD=neuralpass123
   POSTGRES_DB=neuraljira_live
   
   # JWT Secret
   JWT_SECRET=tu_secreto_super_seguro_2026
   
   # Google Drive 5TB (Opcional, activa el almacenamiento ilimitado en tu Drive)
   GOOGLE_DRIVE_FOLDER_ID=id_de_tu_carpeta_de_drive
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```
3. En la pestaña **Domains**, asigna `chat.neuraljira.com` con SSL activado (Let's Encrypt).
4. Haz clic en **Deploy**. Dokploy levantará los 4 servicios (Frontend PWA, Backend Go, PostgreSQL 16 y Redis) automáticamente.

---

## 🔑 Cómo Conectar tus 5TB de Google Drive

1. Ve a la consola de [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y habilita la **Google Drive API**.
3. En **IAM & Admin** -> **Cuentas de servicio**, crea una cuenta de servicio (ej: `neuraljira-drive-uploader`).
4. Genera una clave JSON y descárgala.
5. Ve a tu **Google Drive (5TB)**:
   * Crea una carpeta llamada por ejemplo `Neuraljira Directos`.
   * Haz clic derecho -> **Compartir** -> Pega el correo de la cuenta de servicio y dale permisos de **Editor**.
   * Copia el ID de la carpeta de la URL de Drive (los caracteres después de `/folders/...`).
6. En Dokploy (o tu `.env`), define `GOOGLE_DRIVE_FOLDER_ID` con ese ID y `GOOGLE_SERVICE_ACCOUNT_KEY` con el contenido del JSON.
