import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

class ApiService {
  // GET /api/status
  static Future<Map<String, dynamic>?> getStatus() async {
    try {
      final res = await http
          .get(Uri.parse('$apiUrl/api/status'))
          .timeout(const Duration(seconds: 5));
      return jsonDecode(res.body);
    } catch (_) {
      return null;
    }
  }

  // POST /api/reset
  static Future<void> reset({String? model}) async {
    try {
      await http.post(
        Uri.parse('$apiUrl/api/reset'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(model != null ? {'model': model} : {}),
      );
    } catch (_) {}
  }

  // POST /api/chat — retorna Stream de texto (SSE)
  static Stream<String> chat({
    required List<Map<String, String>> history,
    required String model,
  }) async* {
    final client = http.Client();
    try {
      final request = http.Request('POST', Uri.parse('$apiUrl/api/chat'));
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode({'messages': history, 'model': model});

      final response = await client.send(request);

      String buffer = '';
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        buffer += chunk;
        final lines = buffer.split('\n');
        buffer = lines.removeLast(); // última línea puede estar incompleta

        for (final line in lines) {
          if (!line.startsWith('data: ')) continue;
          final data = line.substring(6).trim();
          if (data == '[DONE]') return;

          try {
            final json = jsonDecode(data) as Map<String, dynamic>;
            if (json['text'] != null) yield json['text'] as String;
            if (json['error'] != null) yield '[Error: ${json['error']}]';
          } catch (_) {}
        }
      }
    } finally {
      client.close();
    }
  }
}
