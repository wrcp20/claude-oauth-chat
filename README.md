# Chat Claude 042026

Chat web local que usa las **credenciales OAuth de Claude Code** — sin API key, sin cargos extra. Consume tu plan Pro/Max existente.

## Requisitos

- Node.js 18+
- Claude Code instalado y autenticado (que tengas `~/.claude/.credentials.json`)

## Instalación y uso

```bash
cd chat_claude042026
npm install
node server.js
```

Abrí el navegador en **http://localhost:3200**

## Cómo funciona

Claude Code autentica con tu cuenta de Claude.ai via OAuth y guarda el token en:
- Windows: `%USERPROFILE%\.claude\.credentials.json`
- Mac/Linux: `~/.claude/.credentials.json`

Este chat lee ese token y lo usa con `Authorization: Bearer <token>` para llamar a `api.anthropic.com/v1/messages`. No se necesita API key.

## Modelos disponibles

| Modelo | Descripción |
|--------|-------------|
| `claude-sonnet-4-6` | Equilibrio velocidad/capacidad (default) |
| `claude-opus-4-6` | Máxima capacidad |
| `claude-haiku-4-5-20251001` | Más rápido y liviano |

## Puerto personalizado

```bash
PORT=8080 node server.js
```

## Notas

- El token se **refresca automáticamente** cuando está por expirar
- El historial de conversación existe solo en memoria (se pierde al recargar)
- Las respuestas se **streamean** en tiempo real
