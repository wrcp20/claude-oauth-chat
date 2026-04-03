import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'api_service.dart';
import 'config.dart';

class Message {
  final String role; // 'user' | 'assistant'
  String content;
  bool isStreaming;

  Message({required this.role, required this.content, this.isStreaming = false});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Message> _messages = [];

  String _selectedModel = models.first['id']!;
  bool _isStreaming = false;
  bool _isReady = false;
  bool _isOnline = false;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    final status = await ApiService.getStatus();
    setState(() {
      _isOnline = status != null;
      _isReady = status?['ready'] == true;
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isStreaming) return;

    _inputController.clear();
    setState(() {
      _isStreaming = true;
      _messages.add(Message(role: 'user', content: text));
      _messages.add(Message(role: 'assistant', content: '', isStreaming: true));
    });
    _scrollToBottom();

    final history = _messages
        .where((m) => !m.isStreaming && m.content.isNotEmpty)
        .map((m) => {'role': m.role, 'content': m.content})
        .toList();
    // agregar el mensaje del usuario que acabamos de enviar
    history.add({'role': 'user', 'content': text});

    final assistantMsg = _messages.last;

    try {
      await for (final chunk in ApiService.chat(
        history: history,
        model: _selectedModel,
      )) {
        setState(() {
          assistantMsg.content += chunk;
          assistantMsg.isStreaming = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      setState(() {
        assistantMsg.content = '[Error de conexión: $e]';
        assistantMsg.isStreaming = false;
      });
    } finally {
      setState(() => _isStreaming = false);
    }
  }

  Future<void> _newConversation() async {
    setState(() => _messages.clear());
    await ApiService.reset();
    await _checkStatus();
  }

  Future<void> _changeModel(String model) async {
    setState(() {
      _selectedModel = model;
      _messages.clear();
      _isReady = false;
    });
    await ApiService.reset(model: model);
    await Future.delayed(const Duration(seconds: 3));
    await _checkStatus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildAppBar(),
      body: Column(
        children: [
          Expanded(child: _buildMessageList()),
          _buildInputArea(),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFF1A1D27),
      elevation: 0,
      titleSpacing: 12,
      title: Row(
        children: [
          // Logo
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF7C6AF5), Color(0xFFA855F7)],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text('✦', style: TextStyle(fontSize: 16, color: Colors.white)),
            ),
          ),
          const SizedBox(width: 10),
          const Text(
            'Chat Claude',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFFE2E4F0)),
          ),
          const SizedBox(width: 8),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _isOnline ? const Color(0xFF4ADE8010) : const Color(0xFF22263A),
              border: Border.all(
                color: _isOnline ? const Color(0xFF4ADE8040) : const Color(0xFF2E3250),
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _isOnline ? (_isReady ? 'listo' : 'calentando') : 'offline',
              style: TextStyle(
                fontSize: 11,
                color: _isOnline ? const Color(0xFF4ADE80) : const Color(0xFF7C80A0),
              ),
            ),
          ),
        ],
      ),
      actions: [
        // Model selector
        DropdownButton<String>(
          value: _selectedModel,
          dropdownColor: const Color(0xFF22263A),
          underline: const SizedBox(),
          style: const TextStyle(fontSize: 13, color: Color(0xFFE2E4F0)),
          items: models.map((m) => DropdownMenuItem(
            value: m['id'],
            child: Text(m['label']!),
          )).toList(),
          onChanged: (v) { if (v != null) _changeModel(v); },
        ),
        const SizedBox(width: 8),
        // New conversation
        TextButton(
          onPressed: _newConversation,
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF7C80A0),
            side: const BorderSide(color: Color(0xFF2E3250)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text('+ Nueva', style: TextStyle(fontSize: 13)),
        ),
        const SizedBox(width: 12),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: const Color(0xFF2E3250)),
      ),
    );
  }

  Widget _buildMessageList() {
    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('✦', style: TextStyle(fontSize: 48, color: Colors.white.withValues(alpha: 0.15))),
            const SizedBox(height: 12),
            const Text(
              'Empezá una conversación con Claude',
              style: TextStyle(fontSize: 15, color: Color(0xFF7C80A0)),
            ),
            const SizedBox(height: 4),
            Text(
              'Via OAuth · Sin consumir API key',
              style: TextStyle(fontSize: 12, color: const Color(0xFF7C80A0).withValues(alpha: 0.6)),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(20),
      itemCount: _messages.length,
      itemBuilder: (context, i) => _MessageBubble(message: _messages[i]),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: const BoxDecoration(
        color: Color(0xFF1A1D27),
        border: Border(top: BorderSide(color: Color(0xFF2E3250))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _inputController,
              maxLines: 5,
              minLines: 1,
              enabled: !_isStreaming,
              style: const TextStyle(fontSize: 14, color: Color(0xFFE2E4F0)),
              decoration: const InputDecoration(
                hintText: 'Escribí tu mensaje...',
              ),
              onSubmitted: (_) => _sendMessage(),
              textInputAction: TextInputAction.send,
            ),
          ),
          const SizedBox(width: 8),
          // Send button
          SizedBox(
            width: 44,
            height: 44,
            child: ElevatedButton(
              onPressed: _isStreaming ? null : _sendMessage,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C6AF5),
                disabledBackgroundColor: const Color(0xFF7C6AF5).withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: EdgeInsets.zero,
              ),
              child: const Text('↑', style: TextStyle(fontSize: 18, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Burbuja de mensaje ──────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Message message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: isUser
            ? [_bubble(isUser), const SizedBox(width: 8), _avatar(isUser)]
            : [_avatar(isUser), const SizedBox(width: 8), _bubble(isUser)],
      ),
    );
  }

  Widget _avatar(bool isUser) {
    return Container(
      width: 32, height: 32,
      decoration: BoxDecoration(
        color: isUser ? const Color(0xFF1E2A45) : null,
        gradient: isUser ? null : const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF7C6AF5), Color(0xFFA855F7)],
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Text(
          isUser ? '👤' : '✦',
          style: const TextStyle(fontSize: 16),
        ),
      ),
    );
  }

  Widget _bubble(bool isUser) {
    return Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser ? const Color(0xFF1E2A45) : const Color(0xFF1A1D27),
          border: isUser ? null : Border.all(color: const Color(0xFF2E3250)),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(12),
            topRight: const Radius.circular(12),
            bottomLeft: Radius.circular(isUser ? 12 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 12),
          ),
        ),
        child: message.isStreaming
            ? const _TypingIndicator()
            : isUser
                ? SelectableText(
                    message.content,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFFE2E4F0),
                      height: 1.6,
                    ),
                  )
                : MarkdownBody(
                    data: message.content,
                    selectable: true,
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(fontSize: 14, color: Color(0xFFE2E4F0), height: 1.6),
                      strong: const TextStyle(fontSize: 14, color: Color(0xFFC4B5FD), fontWeight: FontWeight.bold),
                      em: const TextStyle(fontSize: 14, color: Color(0xFFA5B4FC), fontStyle: FontStyle.italic),
                      h1: const TextStyle(fontSize: 18, color: Color(0xFFE2E4F0), fontWeight: FontWeight.w600),
                      h2: const TextStyle(fontSize: 16, color: Color(0xFFE2E4F0), fontWeight: FontWeight.w600),
                      h3: const TextStyle(fontSize: 14, color: Color(0xFFE2E4F0), fontWeight: FontWeight.w600),
                      code: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFA5F3FC),
                        fontFamily: 'monospace',
                        backgroundColor: Color(0xFF0D0F18),
                      ),
                      codeblockDecoration: BoxDecoration(
                        color: const Color(0xFF0D0F18),
                        border: Border.all(color: const Color(0xFF2E3250)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      blockquoteDecoration: const BoxDecoration(
                        border: Border(left: BorderSide(color: Color(0xFF7C6AF5), width: 3)),
                      ),
                      blockquotePadding: const EdgeInsets.only(left: 12),
                      blockquote: const TextStyle(color: Color(0xFF7C80A0), fontSize: 14, height: 1.6),
                      horizontalRuleDecoration: const BoxDecoration(
                        border: Border(top: BorderSide(color: Color(0xFF2E3250))),
                      ),
                      a: const TextStyle(color: Color(0xFF9585F8)),
                      listBullet: const TextStyle(color: Color(0xFFE2E4F0)),
                    ),
                  ),
      ),
    );
  }
}

// ── Typing indicator (3 puntos animados) ───────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 20,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) => _dot(i * 0.15)),
      ),
    );
  }

  Widget _dot(double delay) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        final t = ((_ctrl.value - delay) % 1.0).clamp(0.0, 1.0);
        final offset = t < 0.5 ? -5.0 * (t / 0.5) : -5.0 * (1.0 - (t - 0.5) / 0.5);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Transform.translate(
            offset: Offset(0, offset),
            child: Container(
              width: 6, height: 6,
              decoration: BoxDecoration(
                color: const Color(0xFF7C80A0).withValues(alpha: 0.4 + 0.6 * (1 - (offset.abs() / 5))),
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
      },
    );
  }
}
