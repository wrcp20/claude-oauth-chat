# Flujo de datos — chat_claude042026

## Diagrama general

```
BROWSER (index.html)
    │
    │  POST /api/chat  {messages, model}
    │  ──────────────────────────────────►
    │                                    │
    │                            server.js (Express :3200)
    │                                    │
    │                            ClaudeSession.send(text, res)
    │                                    │
    │                            proc.stdin.write(JSON msg)
    │                                    │
    │                            claude CLI (subprocess)
    │                                    │
    │                            api.anthropic.com
    │                            (con OAuth Bearer token)
    │                                    │
    │  SSE: data: {"text":"..."}         │
    │  ◄──────────────────────────────────
    │  SSE: data: {"text":"..."}
    │  ◄──────────────────────────────────
    │  SSE: data: [DONE]
    │  ◄──────────────────────────────────
```

---

## Flujo detallado paso a paso

### 1. Startup del server

```
node server.js
    │
    ├── Express escucha en :3200
    ├── Sirve public/ como archivos estáticos
    └── new ClaudeSession('claude-haiku-4-5-20251001')
            │
            ├── spawn('claude', [...flags...])
            │       stdio: stdin=pipe, stdout=pipe, stderr=pipe
            │
            └── Envía PROBE inmediato:
                {"type":"user","message":{"role":"user","content":[{"type":"text","text":"ok"}]}}
```

### 2. Calentamiento de sesión (probe)

```
claude CLI (subprocess)
    │
    ├── Carga hooks (SessionStart:startup → engram, MCP servers)
    ├── Autentica con OAuth token de ~/.claude/.credentials.json
    ├── Llama a api.anthropic.com con Bearer token
    └── Responde al probe
            │
            ▼
    server.js recibe el result del probe
            │
            ├── probing = false
            ├── ready = true
            └── Procesa queue de mensajes pendientes
```

### 3. Request de chat del usuario

```
Browser
    │
    ├── Usuario escribe mensaje y presiona Enter
    ├── JavaScript llama fetch('/api/chat', {method:'POST', body:{messages, model}})
    └── Abre EventSource (SSE) leyendo la respuesta
```

```
server.js POST /api/chat
    │
    ├── Valida messages[]
    ├── Setea headers SSE (Content-Type: text/event-stream)
    ├── res.flushHeaders()  ← envía headers sin cerrar la conexión
    ├── Extrae texto del último mensaje: messages[messages.length-1].content
    └── ClaudeSession.send(text, res)
            │
            ├── Si ready=false → encola, notifica "⏳ calentando..."
            └── Si ready=true  → ClaudeSession._dispatch(text, res)
                        │
                        └── proc.stdin.write(JSON message)
```

### 4. Procesamiento en claude CLI

```
claude CLI (subprocess persistente)
    │
    ├── Lee mensaje desde stdin
    ├── Construye contexto (conversación acumulada internamente)
    ├── POST https://api.anthropic.com/v1/messages
    │       Headers:
    │         Authorization: Bearer sk-ant-o... (OAuth token)
    │         anthropic-version: 2023-06-01
    │       Body:
    │         {model, messages, stream: true, max_tokens: 8096}
    │
    └── Recibe respuesta en streaming de Anthropic
```

### 5. Streaming de vuelta al browser

```
claude CLI stdout (stream-json lines)
    │
    ├── {"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hola"}}}
    ├── {"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":" mundo"}}}
    └── {"type":"result","result":"Hola mundo","is_error":false}
```

```
server.js _onData() — procesa línea a línea
    │
    ├── text_delta → res.write('data: {"text":"Hola"}\n\n')
    ├── text_delta → res.write('data: {"text":" mundo"}\n\n')
    └── result     → res.write('data: [DONE]\n\n') + res.end()
```

```
Browser EventSource
    │
    ├── Recibe data: {"text":"Hola"} → agrega al bubble del assistant
    ├── Recibe data: {"text":" mundo"} → agrega al bubble
    └── Recibe data: [DONE] → finaliza, re-habilita input
```

---

## Flujo de credenciales OAuth

```
~/.claude/.credentials.json
    {
      "claudeAiOauth": {
        "accessToken": "sk-ant-o...",   ← token OAuth
        "refreshToken": "sk-ant-o...",  ← para renovar
        "expiresAt": 1775162536601,
        "subscriptionType": "pro"
      }
    }
    │
    └── Leído por: claude CLI al iniciar el subprocess
                   (NO por server.js directamente)
```

**Importante:** `api.anthropic.com` no acepta tokens OAuth directamente.
El `claude CLI` los usa internamente con un mecanismo propio.

---

## Flujo de reset / nueva conversación

```
Browser: usuario hace click en "Nueva conversación"
    │
    ├── fetch('/api/reset', {method:'POST', body:{model?}})
    └── Limpia historial local (history = [])

server.js POST /api/reset
    │
    ├── ClaudeSession.reset(model)
    │       ├── _failAll() → cierra todas las SSE pendientes
    │       ├── proc.kill('SIGTERM')
    │       └── _start() → nuevo subprocess + nuevo probe
    └── res.json({ok: true})
```

---

## Flujo de cola (queue) — múltiples mensajes simultáneos

```
Si llegan 2 mensajes mientras el primero se procesa:

Mensaje A → _dispatch() → proc.stdin.write() → activeRes = resA
Mensaje B → queue.push({text, res}) → espera

Cuando llega result de A:
    → activeRes = null
    → _next() → saca B del queue → _dispatch(B)
```

Solo un mensaje a la vez por sesión (claude CLI es single-thread por conversación).

---

## Endpoints del server

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Sirve `public/index.html` |
| GET | `/api/status` | Estado de la sesión (ready, model, queue) |
| POST | `/api/chat` | Envía mensaje, responde con SSE streaming |
| POST | `/api/reset` | Reinicia sesión (nueva conversación o cambio de modelo) |

---

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3200` | Puerto del servidor HTTP |
| `USERPROFILE` | (Windows) | Ruta a `~/.claude/` para credenciales |
| `HOME` | (Linux/Mac) | Alternativa a USERPROFILE |
