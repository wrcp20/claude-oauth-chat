# Ideas de despliegue — chat_claude042026

## Contexto

El chat web usa las credenciales OAuth de Claude Code (`~/.claude/.credentials.json`)
para llamar a la API de Anthropic **sin API key**. Funciona vía `claude CLI` como subprocess.

El problema central: **Anthropic permite una sola sesión OAuth activa por cuenta**.
Activar Claude Code en un segundo equipo revoca el token del primero.

---

## Escenarios posibles

### Escenario 1 — Server en tu equipo, acceso desde otro (lo que tenés ahora)

```
Equipo principal (tuyo)
├── Claude Code activo ✓
├── node server.js corriendo
└── ~/.claude/.credentials.json válido

Otro equipo
└── Browser → http://IP-tuya:3200
```

**Ventaja:** Sin configuración extra. Tu token nunca se toca.  
**Limitación:** El server tiene que estar corriendo en tu máquina principal.

---

### Escenario 2 — Server en equipo secundario, vos accedés desde el principal

```
Equipo secundario (siempre encendido)
├── Node.js instalado
├── chat_claude042026/ copiado
└── Necesita credenciales válidas ← EL PROBLEMA

Equipo principal (tuyo)
├── Claude Code activo ✓
└── Browser → http://IP-secundario:3200
```

**El problema de credenciales tiene 3 variantes:**

#### Variante A — Copiar credentials.json (frágil)
- Copiás `~/.claude/.credentials.json` al equipo secundario
- Funciona hasta que Claude Code en tu equipo refresca el token
- El token del secundario queda inválido sin previo aviso
- **Workaround:** Sync automático del archivo (rsync, Dropbox, etc.)

```bash
# En tu equipo principal, sync cada 5 min hacia secundario
while true; do
  scp ~/.claude/.credentials.json usuario@ip-secundario:~/.claude/.credentials.json
  sleep 300
done
```

#### Variante B — API key con límite de gasto (recomendada para este escenario)
- Creás una API key en https://console.anthropic.com
- Configurás límite mensual ($5 = ~2M tokens con Haiku, dura meses en uso personal)
- El equipo secundario usa esa key directamente → independiente de tu sesión OAuth
- Claude Code en tu equipo sigue intacto

```bash
# En equipo secundario
ANTHROPIC_API_KEY=sk-ant-api... node server.js
```

El server.js necesita un pequeño cambio para usar API key en lugar del CLI cuando
la env var `ANTHROPIC_API_KEY` está presente.

#### Variante C — Dos cuentas Claude (cara, no recomendada)
- Una cuenta por equipo
- Cada una con su propio plan Pro
- Sin conflictos de sesión

---

## Arquitectura recomendada según caso de uso

| Caso | Solución |
|------|----------|
| Solo vos, desde cualquier equipo en red local | Escenario 1 (server en tu equipo) |
| Equipo secundario siempre encendido como servidor | Variante B (API key con límite) |
| Acceso desde internet (no red local) | Variante B + ngrok/cloudflared |
| Prueba rápida en secundario | Variante A (sync manual del .json) |

---

## Implementación pendiente

### Modo dual OAuth/API key en server.js

```javascript
// Si existe ANTHROPIC_API_KEY, usar SDK directo (más rápido, ~1-2s)
// Si no, usar claude CLI con OAuth (actual, ~4-6s con sesión persistente)

if (process.env.ANTHROPIC_API_KEY) {
  // Llamada directa a api.anthropic.com con API key
  // Latencia: ~1-2s por mensaje
  // No necesita claude CLI instalado
} else {
  // Sesión persistente con claude CLI (implementación actual)
  // Latencia: ~4-6s después del calentamiento
  // Necesita claude CLI + credenciales OAuth
}
```

### Sincronización de token (Variante A)

Si se opta por copiar credenciales, el server debería detectar invalidación del token
y notificar al usuario en lugar de quedarse colgado silenciosamente.

---

## Notas técnicas relevantes

- `api.anthropic.com` **no acepta OAuth tokens** (`sk-ant-o...`). Solo API keys (`sk-ant-api...`)
- Los OAuth tokens de Claude Code son para uso interno del CLI, no para la API pública
- El CLI con `--input-format=stream-json` mantiene sesión persistente → mensajes siguientes ~4s
- El bug crítico en Windows: `req.on('close')` se dispara al recibir el body (TCP half-close),
  matando el proceso claude antes de responder. Fix: usar `res.on('close')` en su lugar.
- Con `CLAUDE_CODE_SIMPLE=1` el CLI arranca en 1.6s pero deshabilita OAuth
