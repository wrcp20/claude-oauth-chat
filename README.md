# Chat Claude 042026

Chat que usa las **credenciales OAuth de Claude Code** — sin API key, sin cargos extra. Consume tu plan Pro/Max existente.

## Estructura

```
chat_claude042026/
├── backend/            ← API Express pura (sin frontend)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── web/            ← SPA — abre en navegador o servir con nginx
│   │   ├── index.html
│   │   ├── config.js   ← Editar aquí la URL del backend
│   │   ├── manifest.json
│   │   └── sw.js
│   └── mobile/         ← Configuración para generar APK con Capacitor
│       ├── capacitor.config.json
│       └── README_MOBILE.md
└── docker-compose.yml  ← Backend + nginx con un solo comando
```

## Requisitos

- Node.js 18+
- Claude Code instalado y autenticado (`~/.claude/.credentials.json`)

---

## Modo 1 — Web local (más simple)

```bash
cd backend
npm install
node server.js
```

Abrí `frontend/web/index.html` directamente en el navegador. La URL del backend ya apunta a `http://localhost:3200` por defecto en `config.js`.

---

## Modo 2 — Docker (backend + frontend con nginx)

```bash
docker-compose up --build
```

- Backend API: **http://localhost:3200**
- Frontend web: **http://localhost:8080**

Para acceder desde otro equipo en la red, editá `frontend/web/config.js`:

```js
window.CLAUDE_API_URL = 'http://192.168.1.100:3200';
```

---

## Modo 3 — PWA (instalar en móvil desde Chrome)

1. Abrí el frontend en Chrome mobile: `http://TU_IP:8080`
2. Menú → "Agregar a pantalla de inicio"
3. Se instala como app nativa (sin Store)

---

## Modo 4 — APK con Capacitor

Ver `frontend/mobile/README_MOBILE.md` para instrucciones completas.

---

## Cambiar el backend URL

Editá `frontend/web/config.js`:

```js
window.CLAUDE_API_URL = 'http://192.168.1.100:3200';
```

No hace falta recompilar nada — el archivo se carga dinámicamente.

---

## Modelos disponibles

| Modelo | Descripción |
|--------|-------------|
| `claude-haiku-4-5-20251001` | Más rápido y económico (default) |
| `claude-sonnet-4-6` | Equilibrio velocidad/capacidad |
| `claude-opus-4-6` | Máxima capacidad |

## Variables de entorno (backend)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3200` | Puerto del servidor |
| `ALLOWED_ORIGINS` | `*` | Orígenes permitidos para CORS |

## Notas

- El historial de conversación existe solo en memoria (se pierde al recargar)
- Las respuestas se **streamean** en tiempo real
- Un solo proceso `claude CLI` persiste durante toda la vida del servidor
