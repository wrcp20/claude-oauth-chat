# Generar APK con Capacitor

## Prerrequisitos

- Node.js 18+
- Android Studio instalado
- Java 17+
- Tu backend corriendo y accesible desde el dispositivo Android

## Pasos

### 1. Editar la URL del backend

Antes de generar el APK, edita `frontend/mobile/capacitor.config.json` y
reemplaza `TU_IP_LOCAL` con la IP real de tu equipo donde corre el backend:

```json
"server": {
  "url": "http://192.168.1.100:3200",
  "cleartext": true
}
```

También edita `frontend/web/config.js` con la misma IP:
```js
window.CLAUDE_API_URL = 'http://192.168.1.100:3200';
```

### 2. Instalar dependencias de Capacitor

Desde la raíz del proyecto o en una carpeta nueva:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 3. Inicializar Capacitor

```bash
npx cap init "Chat Claude" com.local.chatclaude --web-dir ../web
```

### 4. Agregar plataforma Android

```bash
npx cap add android
```

### 5. Copiar archivos web al proyecto Android

```bash
npx cap copy android
```

### 6. Opción A — Con Android Studio

```bash
npx cap open android
```

Dentro de Android Studio:
- Build → Generate Signed Bundle / APK
- Elegir APK
- Crear o seleccionar keystore
- Build Release

### 6. Opción B — Sin Android Studio (debug APK)

```bash
npx cap run android
```

O build directo:
```bash
cd android && ./gradlew assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notas importantes

- El backend debe estar accesible desde la red WiFi del dispositivo
- En Android 9+, `cleartext: true` permite HTTP (sin HTTPS) en la red local
- Para producción con HTTPS, quitar `cleartext` y configurar un certificado SSL
- El APK se conecta directamente a tu backend — no necesita internet si estás en la misma red

## Estructura final esperada

```
frontend/mobile/
├── capacitor.config.json   ← Configuración de Capacitor
├── README_MOBILE.md        ← Este archivo
└── android/                ← Generado por "npx cap add android"
    └── app/build/outputs/apk/debug/app-debug.apk
```
