# 🎮 Xbox Cast — WebRTC Screen Mirroring

<div align="center">

![Xbox Cast Banner](https://img.shields.io/badge/Xbox-Series%20X%7CS%20%26%20One-107C10?style=for-the-badge&logo=xbox&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Direct-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![E2EE](https://img.shields.io/badge/Security-AES--GCM%20256--bit%20E2EE-emerald?style=for-the-badge&logo=security&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2014-App%20Router-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-10--foot%20UI-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-Efficient-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

**Transmite la pantalla y audio de tu Mac o PC directamente a tu consola Xbox con latencia ultra-baja (&lt;50ms), a 1080p 60 FPS, con cifrado de extremo a extremo (E2EE) y sin necesidad de apps de pago ni servidores intermedios de vídeo.**

[Características](#-características) • [Seguridad y Privacidad](#-seguridad-y-privacidad-e2ee) • [Inicio Rápido](#-inicio-rápido-local) • [Despliegue en Vercel](#-despliegue-en-vercel--supabase) • [Arquitectura](#-arquitectura-técnica)

</div>

---

## 💡 ¿Qué es Xbox Cast?

**Xbox Cast** es una aplicación web de alto rendimiento optimizada para el navegador **Microsoft Edge en consolas Xbox** (Series X, Series S y Xbox One).

Permite duplicar la pantalla completa de tu ordenador, una ventana de aplicación o una pestaña concreta del navegador con audio estéreo sincronizado, conectándose **directamente de dispositivo a dispositivo (Peer-to-Peer) a través de la red local (Wi-Fi o cable Ethernet)**.

Al utilizar WebRTC nativo sobre UDP local:
- 🚫 **Cero intermediarios de vídeo:** El flujo de vídeo y audio **nunca** viaja a servidores en la nube ni consume ancho de banda de tu conexión de internet.
- ⚡ **Latencia imperceptible:** Retardo sub-50ms (típicamente 15-30ms en Wi-Fi 5/6 o cable), ideal para ver contenido multimedia, streaming o presentaciones.
- 📺 **Experiencia 10-foot UI:** Interfaz diseñada específicamente para mando de consola (D-Pad y botón A), márgenes de sobreescaneo (*overscan safe areas*) para TVs y pantalla completa automática.
- 🧼 **Pantalla limpia por defecto:** Interfaz 100% limpia sin popups ni paneles técnicos a menos que actives el modo debug (`?debug=true`).

---

## 🛡️ Seguridad y Privacidad (E2EE)

Si decides alojar Xbox Cast en un subdominio público (por ejemplo, `https://cast.tudominio.com` o en Vercel), la aplicación incorpora múltiples capas de seguridad bancaria:

1. 🔐 **Cifrado de Extremo a Extremo (E2EE 256-bit):**
   - Implementado mediante la **Web Crypto API** nativa del navegador.
   - A partir del PIN de 6 dígitos se deriva una clave criptográfica `AES-GCM de 256 bits` mediante `PBKDF2` (50.000 iteraciones con hash `SHA-256` y sal única por sala).
   - Todos los mensajes de señalización (ofertas SDP, respuestas y candidatos ICE) viajan cifrados. Ni el servidor de señalización ni Supabase ni ningún observador externo pueden descifrar el contenido.
2. 🔢 **Código PIN de 6 Dígitos (`XXX — XXX`):**
   - 1.000.000 de combinaciones posibles.
   - Agrupado visualmente en bloques de 3 dígitos para máxima legibilidad desde la distancia del sofá.
3. 🛑 **Protección Anti Fuerza Bruta (Rate Limiting):**
   - El receptor en Xbox bloquea automáticamente la entrada durante 30 segundos si se detectan 3 intentos fallidos consecutivos.
4. ✋ **Confirmación de Conexión del Anfitrión (Host Approval):**
   - Cuando la Xbox solicita unirse, el Mac muestra un diálogo emergente para autorizar o rechazar la transmisión antes de emitir un solo fotograma (desactivable si estás solo en casa).

---

## ✨ Características

- 🎯 **Streaming 1080p @ 60 FPS:** Selección dinámica de calidad (1080p/720p y 60fps/30fps).
- 🔊 **Transmisión de Audio Estéreo:** Soporte completo de audio del sistema o de la pestaña transmitida (YouTube, Twitch, reproductores, etc.).
- 🕹️ **Diseño Optimizado para Mandos de Consola:**
  - Teclado virtual numérico en pantalla navegable con D-Pad.
  - Casillas de PIN de 6 dígitos grandes y accesibles.
  - Detección de foco de alta visibilidad estilo Xbox (`#107C10`).
  - HUD de controles auto-ocultable tras 3 segundos de inactividad.
- 🌐 **Doble Arquitectura de Señalización:**
  - **Local WebSocket (`server/signaling.mjs`):** 100% offline para uso doméstico en tu red local.
  - **Supabase Realtime Broadcast:** Señalización serverless gratuita para cuando la aplicación está desplegada en Vercel o la nube.
- 🛡️ **Des-enmascarado Dinámico de mDNS:** Resuelve la privacidad de Chromium (que oculta IPs locales como `.local`), permitiendo que la Xbox enlace directamente por IP privada en la LAN sin recurrir a STUN exterior.

---

## 🚀 Inicio Rápido (Local)

### Requisitos
- **Node.js** v18+ en tu ordenador.
- **pnpm** (recomendado) o `npm`.
- Ordenador y Xbox conectados al **mismo router** (Wi-Fi o cable Ethernet).

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/Alexgmatosc/xbox-cast.git
cd xbox-cast
pnpm install
```

### 2. Iniciar el entorno de desarrollo
```bash
pnpm run dev
```
*Arrancará tanto la aplicación Next.js (`http://localhost:3000`) como el servidor de señalización local WebSocket (`puerto 3001`).*

### 3. Emitir desde tu Mac / PC
1. Abre en tu navegador (Chrome, Edge o Brave recomendados):  
   👉 **`http://localhost:3000/cast`**
2. Verás en pantalla el **PIN de 6 dígitos** generado (ej. `482 — 915`).
3. Pulsa **"Iniciar Transmisión"** y selecciona la pantalla, ventana o pestaña que deseas emitir (marca *"Compartir audio"*).

### 4. Recibir en tu Xbox
1. Abre **Microsoft Edge** en tu consola Xbox.
2. Escribe la dirección que te muestra el Mac (ej. `http://192.168.1.10:3000/tv`).
3. Introduce el PIN de 6 dígitos con el mando y pulsa **"Conectar y Ver"**.
4. En el Mac aparecerá un aviso de confirmación: pulsa **"Permitir Conexión"**.
5. ¡Listo! La imagen aparecerá al instante a pantalla completa con latencia ultra-baja.

---

## ☁️ Despliegue en Vercel + Supabase

Puedes desplegar Xbox Cast en tu propio subdominio público (ej. `cast.tudominio.com`) de forma 100% gratuita utilizando **Vercel** y **Supabase Realtime**.

> [!NOTE]
> Aunque la web y la señalización estén en la nube, **el flujo de vídeo y audio sigue siendo 100% Peer-to-Peer directo por tu red local**. Supabase solo intercambia unos pocos kilobytes cifrados al inicio para que los dispositivos se encuentren.

### Paso 1: Crear proyecto en Supabase (Gratis)
1. Entra en [supabase.com](https://supabase.com) y crea un nuevo proyecto gratuito.
2. Ve a **Project Settings** -> **API**.
3. Copia:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon / public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Paso 2: Desplegar en Vercel
1. Conecta tu repositorio de GitHub `xbox-cast` a [Vercel](https://vercel.com).
2. En la sección **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = *Tu URL de Supabase*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *Tu clave pública anon*
3. Haz clic en **Deploy**.
4. Asigna tu dominio o subdominio personalizado en Vercel (ej. `cast.tudominio.com`).

¡Ya puedes abrir `cast.tudominio.com` en tu Mac y en la Xbox desde cualquier sitio!

---

## 🧩 Solución de Problemas y Tips

### 1. Error 404 en la Xbox (en modo local)
- Asegúrate de incluir el puerto **`:3000`** en la barra de direcciones de Edge:  
  ✅ `http://192.168.1.XX:3000/tv`  
  ❌ `http://192.168.1.XX/tv` *(sin el :3000 intentará conectar al puerto 80 por defecto)*.  
  *(En Vercel con dominio HTTPS no hace falta especificar puerto).*

### 2. Tienes una VPN activa en el Mac
- Si tienes una VPN activa (Wireguard, Tailscale, NordVPN, etc.):
  - Asegúrate de activar la casilla **"Permitir tráfico de red local / Allow LAN traffic"**.
  - O desactiva la VPN mientras transmites, ya que algunas VPN redirigen todo el tráfico UDP fuera de la casa.

### 3. Activar el Panel de Diagnóstico
- La interfaz está diseñada para estar 100% limpia. Si necesitas ver estadísticas detalladas de ICE, candidatos LAN/WAN, latencia y FPS en vivo, añade `?debug=true` a la URL:  
  👉 `http://localhost:3000/cast?debug=true`  
  👉 `http://192.168.1.XX:3000/tv?debug=true`

---

## 🏗️ Arquitectura Técnica

```
xbox-cast/
├── app/
│   ├── api/ip/route.ts         # Endpoint de detección de IP local del host
│   ├── cast/page.tsx           # Panel del emisor: captura, PIN 6 dígitos, preview y control de acceso
│   ├── tv/page.tsx             # Visor TV: 10-foot UI, entrada PIN con mando, rate limiting y E2EE
│   ├── layout.tsx              # Shell base, fuentes y metadatos PWA
│   ├── page.tsx                # Selector de rol inicial
│   └── globals.css             # Estilos TV y prevención de sobreescaneo
├── components/
│   ├── VideoPlayer.tsx         # Reproductor WebRTC con HUD auto-ocultable y controles
│   ├── PinInput.tsx            # Teclado en pantalla y casillas accesibles para D-Pad
│   ├── ConnectionBadge.tsx     # Métricas en tiempo real (estado, FPS, latencia estimada)
│   ├── DebugPanel.tsx          # Panel desplegable de telemetría (oculto salvo ?debug=true)
│   └── TVSafeLayout.tsx        # Contenedor con márgenes de seguridad para televisores
├── hooks/
│   └── useWebRTC.ts            # Ciclo de vida WebRTC (mutex atómico, candidatos ICE y reconexión)
├── lib/
│   ├── crypto.ts               # Cifrado E2EE nativo con Web Crypto (AES-GCM 256 + PBKDF2)
│   ├── codecs.ts               # Negociación de códecs H.264
│   └── signaling/
│       ├── index.ts            # Factory que selecciona automáticamente Supabase o WebSocket local
│       ├── local-ws.ts         # Cliente WebSocket para red local
│       ├── supabase.ts         # Adaptador Supabase Realtime con cifrado E2EE integrado
│       └── types.ts            # Tipado TypeScript de señales y telemetría
├── server/
│   └── signaling.mjs           # Servidor WebSocket local ultraligero con unmasking mDNS
└── store/
│   └── useCastStore.ts         # Estado global Zustand (requerir aprobación, PIN, streams)
├── .env.example                # Plantilla de variables de entorno para Vercel
└── README.md                   # Documentación completa del proyecto
```

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
