// Cambiar esta URL para apuntar al backend en otra IP
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3200',
);

// Modelos disponibles
const List<Map<String, String>> models = [
  {'id': 'claude-haiku-4-5-20251001', 'label': 'Haiku 4.5'},
  {'id': 'claude-sonnet-4-6', 'label': 'Sonnet 4.6'},
  {'id': 'claude-opus-4-6', 'label': 'Opus 4.6'},
];
