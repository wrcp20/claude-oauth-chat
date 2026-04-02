# Documentación de archivos — chat_claude042026

## Estructura del proyecto

```
chat_claude042026/
├── server.js           ← Backend principal (Node.js)
├── package.json        ← Dependencias npm
├── public/
│   └── index.html      ← Frontend completo (HTML + CSS + JS)
├── README.md           ← Guía de uso rápido
├── FLUJO_DATOS.md      ← Diagrama y flujo de datos detallado
├── ARQUITECTURA.md     ← Este archivo — documentación de archivos
└── IDEAS_DEPLOY.md     ← Escenarios de despliegue multi-equipo
```

---

## `server.js` — Backend Node.js

**Responsabilidad:** Servidor HTTP + gestor de sesión persistente del claude CLI.

### Dependencias
- `express` — servidor HTTP, rutas, archivos estáticos
- `child_process.spawn` — lanza y controla el proceso `claude CLI`
- `path` — resolución de rutas de archivos

### Clase `ClaudeSession`

El núcleo del sistema. Mantiene UN proceso `claude CLI` vivo durante toda la vida del server.

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `model` | string | Modelo activo (ej: `claude-haiku-4-5-20251001`) |
| `proc` | ChildProcess | Referencia al subprocess de claude CLI |
| `buf` | string | Buffer para líneas incompletas del stdout |
| `ready` | boolean | `true` cuando la sesión terminó el probe y está lista |
| `probing` | boolean | `true` durante el mensaje de calentamiento inicial |
| `queue` | array | Cola de `{text, res}` esperando ser procesados |
| `activeRes` | Response | Respuesta HTTP SSE actualmente siendo escrita |
| `activeTextSent` | number | Contador de chunks de texto enviados al cliente activo |

| Método | Descripción |
|--------|-------------|
| `_start()` | Lanza el subprocess de claude con flags, envía probe |
| `_onData(chunk)` | Parsea líneas JSON del stdout de claude, rutea eventos |
| `_dispatch(text, res)` | Escribe mensaje al stdin de claude, asigna `activeRes` |
| `_next()` | Procesa el siguiente elemento de la cola si está listo |
| `_failAll(msg)` | Cierra todas las SSE pendientes con mensaje de error |
| `send(text, res)` | API pública — encola o despacha inmediatamente |
| `removeFromQueue(res)` | Elimina una res de la cola (cliente desconectado) |
| `reset(model?)` | Termina el proceso y arranca uno nuevo (nueva conversación) |
| `status()` | Retorna estado actual como JSON |

### Flags del claude CLI

```
-p                         No interactivo (print mode)
--input-format=stream-json Lee mensajes JSON por stdin (sesión persistente)
--output-format=stream-json Emite eventos JSON por stdout
--verbose                  Incluye eventos de sistema (init, hooks)
--include-partial-messages Emite text_delta mientras escribe (streaming real)
--dangerously-skip-permissions Sin prompts de permisos
--model <nombre>           Modelo a usar
```

### Endpoints HTTP

#### `GET /api/status`
Retorna el estado actual de la sesión.
```json
{
  "ok": true,
  "model": "claude-haiku-4-5-20251001",
  "ready": true,
  "warming": false,
  "queue": 0
}
```

#### `POST /api/chat`
Envía un mensaje y retorna la respuesta en streaming SSE.

**Request:**
```json
{
  "messages": [{"role": "user", "content": "hola"}],
  "model": "claude-haiku-4-5-20251001"
}
```

**Response (SSE):**
```
data: {"text":"¡Hola!"}

data: {"text":" ¿En qué puedo ayudarte?"}

data: [DONE]
```

#### `POST /api/reset`
Reinicia la sesión (nueva conversación o cambio de modelo).
```json
{ "model": "claude-sonnet-4-6" }  // opcional
```

#### `GET /` (estático)
Sirve `public/index.html` y cualquier archivo en `public/`.

### Bug crítico resuelto (Windows)

En Windows, `req.on('close')` se dispara cuando el cliente termina de
enviar el request body (TCP half-close). Si se usara para matar el proceso
claude, lo mataría antes de recibir la respuesta. **Solución:** usar
`res.on('close')` que solo dispara cuando la respuesta HTTP termina.

---

## `public/index.html` — Frontend

**Responsabilidad:** Interfaz de chat completa. Un solo archivo sin dependencias externas.

### Secciones del archivo

#### CSS (variables y componentes)
```css
:root {
  --bg, --surface, --surface2  /* Fondos dark mode */
  --border, --text, --text-muted
  --accent, --accent-hover      /* Violeta #7c6af5 */
  --user-bg, --assistant-bg
  --code-bg
}
```

Componentes estilizados:
- `header` — logo, título, badge de status, selector de modelo, botón nueva
- `#messages` — contenedor scrollable de burbujas
- `.msg.user` / `.msg.assistant` — burbujas con avatar
- `.typing-indicator` — animación de 3 puntos mientras carga
- `footer` — área de input con textarea auto-resize

#### JavaScript (funciones principales)

| Función | Descripción |
|---------|-------------|
| `checkStatus()` | GET /api/status → actualiza badge de conexión |
| `renderMarkdown(text)` | Convierte markdown a HTML seguro (sin librería externa) |
| `addMessage(role, content, streaming)` | Crea y agrega una burbuja al DOM |
| `sendMessage()` | Lee input, llama POST /api/chat, lee SSE, actualiza UI |

#### `renderMarkdown(text)` — detalles
Parser manual sin dependencias. Orden de procesamiento:
1. Escape HTML (`&`, `<`, `>`) — previene XSS
2. Bloques de código triple backtick
3. Código inline
4. Headers (`#`, `##`, `###`)
5. Bold/italic (`**`, `*`)
6. Separadores (`---`)
7. Blockquotes (`>`)
8. Listas (`-`, `*`, `1.`)
9. Links — **solo** `http://` y `https://` (bloquea `javascript:`)
10. Párrafos (bloques separados por línea vacía)

#### Estado global del cliente
```javascript
let history = [];      // Array de {role, content} — historial local
let isStreaming = false; // Mutex — evita enviar mientras espera respuesta
```

#### Flujo de sendMessage()
```
1. Lee inputEl.value → valida no vacío y no isStreaming
2. Agrega burbuja de usuario al DOM
3. Agrega burbuja assistant con typing indicator
4. fetch('/api/chat', POST) → obtiene ReadableStream
5. Lee chunks del SSE:
   - data: {"text":"..."} → agrega texto al bubble
   - data: {"error":"..."} → muestra error en rojo
   - data: [DONE] → termina
6. Guarda en history[]
7. Re-habilita input
```

#### Eventos del modelo y nueva conversación
- Cambio en `#model-select` → POST /api/reset con nuevo modelo
- Click en `#btn-new` → limpia DOM + history[] + POST /api/reset

---

## `package.json` — Configuración npm

```json
{
  "name": "chat-claude042026",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"    ← única dependencia de producción
  }
}
```

**Por qué solo Express:** Todo lo demás usa módulos nativos de Node.js:
- `child_process` → spawn del claude CLI
- `path` → rutas de archivos
- `https` → (no usado en versión final, el CLI maneja la conexión)

---

## `README.md` — Guía de uso

Contiene:
- Requisitos (Node.js 18+, Claude Code autenticado)
- Instalación y uso (`npm install && node server.js`)
- Cómo funciona la autenticación OAuth
- Tabla de modelos disponibles
- Puerto personalizado con `PORT=xxxx`

---

## `IDEAS_DEPLOY.md` — Escenarios de despliegue

Documenta las opciones para correr el chat en distintos equipos:

| Escenario | Viabilidad |
|-----------|-----------|
| Server en equipo principal, otro equipo accede por red | ✓ Funciona |
| Server en equipo secundario con credenciales copiadas | ⚠ Frágil (token expira) |
| Server en equipo secundario con API key | ✓ Robusto |
| Contenedor Docker en mismo equipo | ✓ Con volumen montado |
| Contenedor Docker en otro equipo | Requiere API key |

También documenta el bug de OAuth (1 sesión por cuenta), la limitación del
`CLAUDE_CODE_SIMPLE=1` (no usa OAuth) y la implementación pendiente del
modo dual OAuth/API key.

---

## `FLUJO_DATOS.md` — Diagrama de flujo

Contiene diagramas ASCII del flujo completo:
- Startup y probe de calentamiento
- Request de chat end-to-end
- Flujo de credenciales OAuth
- Flujo de reset y nueva conversación
- Sistema de cola (queue) para mensajes simultáneos
- Tabla de endpoints y variables de entorno
