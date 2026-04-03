import 'package:flutter/material.dart';
import 'chat_screen.dart';

void main() {
  runApp(const ChatClaudeApp());
}

class ChatClaudeApp extends StatelessWidget {
  const ChatClaudeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chat Claude',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F1117),
        colorScheme: const ColorScheme.dark(
          surface: Color(0xFF1A1D27),
          primary: Color(0xFF7C6AF5),
          secondary: Color(0xFF9585F8),
          onSurface: Color(0xFFE2E4F0),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF22263A),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF2E3250)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF2E3250)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF7C6AF5)),
          ),
          hintStyle: const TextStyle(color: Color(0xFF7C80A0)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        useMaterial3: true,
      ),
      home: const ChatScreen(),
    );
  }
}
