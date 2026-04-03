# Chat Claude — Frontend Flutter

App Flutter que se conecta al backend Express. Funciona en Android, iOS y Web desde el mismo código.

## Prerrequisitos

- Flutter SDK 3.x instalado ([flutter.dev](https://flutter.dev/docs/get-started/install))
- Android Studio (para APK) o Chrome (para web)
- Backend corriendo en alguna IP

## Configurar la URL del backend

Editar `lib/config.dart`:

```dart
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://192.168.1.100:3200',  // ← tu IP aquí
);
```

O pasarla en tiempo de compilación (sin tocar el código):

```bash
flutter run --dart-define=API_URL=http://192.168.1.100:3200
```

## Inicializar el proyecto

```bash
cd frontend/flutter
flutter pub get
```

## Correr en desarrollo

```bash
# Android (con dispositivo/emulador conectado)
flutter run

# Web
flutter run -d chrome

# Con URL custom
flutter run --dart-define=API_URL=http://192.168.1.100:3200
```

## Generar APK

```bash
# Debug (para probar)
flutter build apk --dart-define=API_URL=http://192.168.1.100:3200

# Release (para distribuir)
flutter build apk --release --dart-define=API_URL=http://192.168.1.100:3200
```

El APK queda en: `build/app/outputs/flutter-apk/app-release.apk`

## Permitir HTTP en Android (red local)

Android bloquea HTTP por defecto en Release. Agregar en `android/app/src/main/AndroidManifest.xml`:

```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

O crear `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.1.100</domain>
  </domain-config>
</network-security-config>
```

Y referenciarlo en el `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

## Estructura

```
lib/
├── main.dart          ← App entry, MaterialApp con dark theme
├── config.dart        ← URL del backend y lista de modelos
├── api_service.dart   ← GET /status, POST /reset, POST /chat (SSE stream)
└── chat_screen.dart   ← UI completa: mensajes, input, modelo, nueva conv.
```

## Diferencias con el frontend web

| Feature | Web | Flutter |
|---------|-----|---------|
| Markdown renderizado | Sí (parser custom) | Texto plano (SelectableText) |
| SSE streaming | EventSource nativo | `http.StreamedResponse` |
| API URL | `config.js` editable | `config.dart` o `--dart-define` |
| Instalar como app | PWA (manifest.json) | APK nativo |
