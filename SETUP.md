# Wilduit VoiceMeet — Guía de Despliegue

Sigue estos pasos **en orden** para tener la app corriendo en Vercel.

---

## Paso 1 — Crear proyecto en Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuevo proyecto: **"wilduit-voicemeet"**
3. Ve a **APIs & Services → Library** y habilita:
   - ✅ **Google Calendar API**
   - ✅ **Gmail API**
4. Ve a **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
   - Tipo: **Web application**
   - Nombre: `wilduit-voicemeet`
   - Authorized redirect URIs: `https://TU-APP.vercel.app/api/auth/callback/google`
5. Copia el **Client ID** y **Client Secret** — los necesitas en el Paso 5.

---

## Paso 2 — Crear cuenta en Recall.ai

> Recall.ai es el bot que se une a tus reuniones de Google Meet y graba el audio de forma independiente — no necesitas tener el micrófono abierto ni estar en una computadora.

1. Ve a [app.recall.ai](https://app.recall.ai) y crea una cuenta (hay free tier)
2. Entra a **Settings → API Keys** → crea una nueva key → cópiala
3. Ve a **Settings → Webhooks → Add Webhook**:
   - **URL**: `https://TU-APP.vercel.app/api/recall/webhook`
   - **Event**: `bot.status_change`
   - Guarda

La API key la ingresas luego desde la pantalla de Configuración de la app (paso 8).

---

## Paso 3 — Subir el código a GitHub

```bash
cd wilduit-voicemeet
git init
git add .
git commit -m "feat: Wilduit VoiceMeet app"
# Crea un repo en github.com y sigue las instrucciones de push
git remote add origin https://github.com/TU-USUARIO/wilduit-voicemeet.git
git push -u origin main
```

---

## Paso 4 — Crear el proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repo de GitHub
3. Framework: **Next.js** (detectado automático)

---

## Paso 5 — Crear Storage en Vercel

**Vercel KV (para metadatos):**
1. En tu proyecto Vercel → **Storage → Create → KV**
2. Nombre: `voicemeet-kv`
3. Región: `iad1`
4. Vercel copiará automáticamente las variables al proyecto

**Vercel Blob (para audio):**
1. En tu proyecto Vercel → **Storage → Create → Blob**
2. Nombre: `voicemeet-blob`
3. Vercel copiará `BLOB_READ_WRITE_TOKEN` automáticamente

---

## Paso 6 — Configurar Variables de Entorno en Vercel

En tu proyecto Vercel → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `NEXTAUTH_SECRET` | Resultado de `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Del Paso 1 |
| `GOOGLE_CLIENT_SECRET` | Del Paso 1 |

> Las variables de KV y Blob se agregan automáticamente al vincular el Storage en el Paso 5.

---

## Paso 7 — Hacer Deploy

1. Vuelve a **Deployments → Redeploy** (o haz un push al repo)
2. Espera ~2 minutos
3. Abre tu URL de Vercel

---

## Paso 8 — Configurar las API Keys en la app

1. Entra a la app con tu cuenta de Gmail (info@wilduitmarketing.com)
2. Haz clic en el ícono ⚙️ (Configuración) en el header
3. Ingresa tu **OpenRouter API Key** ([openrouter.ai/keys](https://openrouter.ai/keys))
4. Ingresa tu **Recall.ai API Key** (del Paso 2)
5. Activa las notificaciones por email si deseas
6. Guarda

---

## Uso

### 🎙 Grabaciones de Voz
- Pestaña **"Grabaciones"** → clic en **"Grabar"**
- Pausa o detén cuando termines
- La IA transcribe y genera resumen + puntos clave + tareas automáticamente

### 📅 Reuniones con Google Meet (vía Recall.ai bot)
- Pestaña **"Reuniones"** → sub-tab **"Mi Calendario"**
- Verás tus próximas reuniones de las siguientes 48h con Meet link
- Clic en **"Enviar bot a grabar"** → el bot entra como "Wilduit Notetaker"
- Al terminar la reunión, el bot envía el audio → se transcribe y resume automáticamente
- Recibirás un email con el reporte completo

### Colores de tiempo (estilo Google Calendar)
- 🟢 **Verde** — reunión en curso
- 🔴 **Rojo** — empieza en menos de 15 minutos
- 🔵 **Azul** — hoy, más tarde
- ⚫ **Gris** — mañana o más adelante

### 🌙 Modo noche/día
- Clic en el ícono ☀️/🌙 en el header

### 🗑️ Eliminar
- En cualquier tarjeta → clic en el ícono de basura

---

## Estructura de archivos

```
wilduit-voicemeet/
├── app/
│   ├── page.tsx                         ← Login
│   ├── (dashboard)/
│   │   ├── recordings/page.tsx          ← Pestaña Grabaciones
│   │   └── meetings/page.tsx            ← Pestaña Reuniones + Calendario
│   └── api/
│       ├── auth/[...nextauth]/          ← Google OAuth
│       ├── recordings/                  ← CRUD grabaciones de voz
│       ├── meetings/                    ← CRUD reuniones
│       ├── calendar/                    ← Google Calendar API
│       ├── recall/                      ← Recall.ai bot (crear/stop/status)
│       │   └── webhook/                 ← Webhook Recall → transcripción
│       └── settings/                    ← API keys storage
├── components/
│   ├── CalendarEventCard.tsx            ← Tarjeta evento calendario
│   ├── VoiceRecorder.tsx                ← Grabador de voz
│   ├── RecordingCard.tsx                ← Tarjeta grabación
│   ├── SummaryBox.tsx                   ← Caja de resumen IA
│   └── SettingsModal.tsx                ← Modal configuración
├── lib/
│   ├── openrouter.ts                    ← GPT-4o transcripción + resúmenes
│   ├── recall.ts                        ← Recall.ai API client
│   ├── google-calendar.ts               ← Google Calendar API
│   ├── email.ts                         ← Gmail API emails
│   ├── auth.ts                          ← NextAuth config
│   └── storage.ts                       ← Vercel KV + Blob
└── types/index.ts                       ← TypeScript types
```

---

*Wilduit Marketing — wilduitmarketing.com*
