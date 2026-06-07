/**
 * chat-widget.js — Widget embebible Claude OAuth
 *
 * Uso mínimo en cualquier página PHP:
 *   <script>
 *     window.CLAUDE_CHAT_CONFIG = { apiUrl: 'http://tu-servidor:3200' };
 *   </script>
 *   <script src="http://tu-servidor:3200/widget.js"></script>
 *
 * Opciones (window.CLAUDE_CHAT_CONFIG):
 *   apiUrl      {string}  URL base del backend        (requerida)
 *   title       {string}  Título del panel             (default: 'Asistente Claude')
 *   placeholder {string}  Placeholder del input        (default: 'Escribí tu consulta...')
 *   position    {string}  'bottom-right' | 'bottom-left' (default: 'bottom-right')
 */
(function () {
  'use strict';

  // Leer config del meta tag inyectado por la extensión Chrome (evita bloqueos CSP)
  const metaTag = document.querySelector('meta[name="__claude-oauth-config"]');
  const metaCfg = metaTag ? JSON.parse(metaTag.getAttribute('content') || '{}') : {};

  const cfg = Object.assign(
    {
      apiUrl:      'http://localhost:3200',
      title:       'Asistente Claude',
      placeholder: 'Escribí tu consulta...',
      position:    'bottom-right',
      token:       '',
    },
    metaCfg,
    window.CLAUDE_CHAT_CONFIG || {}
  );

  cfg.apiUrl = cfg.apiUrl.replace(/\/$/, '');

  // ── CSS (Shadow DOM — no afecta el documento host) ──────────────────────────
  const CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      color-scheme: dark;
    }
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      --bg:          #0f0f13;
      --surface:     #1a1a24;
      --surface2:    #242436;
      --border:      #2e2e48;
      --accent:      #7c6af5;
      --accent-glow: rgba(124,106,245,0.35);
      --text:        #e8e6f0;
      --text-muted:  #8882aa;
      --success:     #4caf7d;
      --error:       #f07070;
      --radius:      12px;
      --shadow:      0 8px 40px rgba(0,0,0,0.6);
    }

    /* Botón flotante */
    #toggle-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, #7c6af5, #a78bfa);
      box-shadow: 0 4px 20px var(--accent-glow);
      color: #fff;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 2147483646;
      user-select: none;
    }
    #toggle-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px var(--accent-glow); }
    #toggle-btn.open  { transform: rotate(45deg) scale(1.08); }
    :host([data-pos="bottom-left"]) #toggle-btn { right: auto; left: 24px; }
    :host([data-pos="bottom-left"]) #chat-panel { right: auto; left: 24px; }

    /* Panel */
    #chat-panel {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483645;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    #chat-panel.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    @media (max-width: 480px) {
      #chat-panel { bottom:0; right:0; left:0; width:100%; height:100%; border-radius:0; }
      #toggle-btn { bottom:16px; right:16px; }
    }

    /* Header */
    #header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #header-icon  { font-size: 18px; }
    #header-title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    #status-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--surface2);
      color: var(--text-muted);
      transition: background 0.3s, color 0.3s;
    }
    #status-badge.online { background: rgba(76,175,125,0.15); color: var(--success); }
    #new-chat-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-muted);
      font-size: 11px;
      padding: 3px 8px;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;
    }
    #new-chat-btn:hover { color: var(--text); border-color: var(--accent); }
    #close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 2px;
      transition: color 0.2s;
    }
    #close-btn:hover { color: var(--text); }

    /* Mensajes */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    #messages::-webkit-scrollbar { width: 4px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .msg {
      max-width: 88%;
      padding: 10px 13px;
      border-radius: var(--radius);
      font-size: 14px;
      line-height: 1.55;
      word-break: break-word;
    }
    .msg.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #7c6af5, #6053d4);
      color: #fff;
      border-bottom-right-radius: 3px;
    }
    .msg.assistant {
      align-self: flex-start;
      background: var(--surface2);
      color: var(--text);
      border-bottom-left-radius: 3px;
    }
    .msg.error {
      align-self: center;
      background: rgba(240,112,112,0.12);
      color: var(--error);
      border: 1px solid rgba(240,112,112,0.3);
      font-size: 13px;
    }
    .msg code {
      background: rgba(124,106,245,0.15);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 12.5px;
      color: #c3b8ff;
    }
    .msg pre {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .msg pre code { background: none; padding: 0; color: #b8c0d8; }
    .msg strong  { color: #d8d4f5; font-weight: 600; }
    .msg em      { color: #a89de8; font-style: italic; }
    .msg a       { color: var(--accent); text-decoration: underline; }
    .msg ul, .msg ol { padding-left: 1.4em; margin: 4px 0; }
    .msg li      { margin: 2px 0; }
    .msg blockquote {
      border-left: 3px solid var(--accent);
      margin: 6px 0;
      padding: 4px 12px;
      color: var(--text-muted);
    }
    .msg h1,.msg h2,.msg h3 { color: var(--text); margin: 8px 0 4px; font-weight: 600; }
    .msg h1 { font-size: 1.15em; }
    .msg h2 { font-size: 1.05em; }
    .msg h3 { font-size: 1em; }
    .msg hr { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
    .msg p  { margin: 4px 0; }

    /* Typing indicator */
    #typing {
      display: none;
      align-self: flex-start;
      background: var(--surface2);
      border-radius: var(--radius);
      border-bottom-left-radius: 3px;
      padding: 10px 14px;
      gap: 5px;
    }
    #typing.visible { display: flex; }
    #typing span {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--text-muted);
      animation: bounce 1.1s infinite ease-in-out;
    }
    #typing span:nth-child(2) { animation-delay: 0.18s; }
    #typing span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes bounce {
      0%,80%,100% { transform: translateY(0); opacity: 0.5; }
      40%          { transform: translateY(-5px); opacity: 1; }
    }

    /* Input */
    #input-area {
      border-top: 1px solid var(--border);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: var(--surface);
      flex-shrink: 0;
    }
    #input-row { display: flex; align-items: flex-end; gap: 8px; }
    #input {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      line-height: 1.45;
      resize: none;
      outline: none;
      max-height: 120px;
      overflow-y: auto;
      transition: border-color 0.2s;
    }
    #input::placeholder { color: var(--text-muted); }
    #input:focus { border-color: var(--accent); }
    #send-btn {
      width: 38px; height: 38px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #7c6af5, #6053d4);
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.2s, transform 0.15s;
    }
    #send-btn:hover    { opacity: 0.88; transform: scale(1.05); }
    #send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
    #hint {
      font-size: 11px;
      color: var(--text-muted);
      text-align: right;
      padding-right: 2px;
    }
  `;

  // ── Markdown básico (sin librerías) ─────────────────────────────────────────
  function renderMarkdown(text) {
    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const i = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
      return `\x00CODE${i}\x00`;
    });
    const inlineCodes = [];
    text = text.replace(/`([^`]+)`/g, (_, code) => {
      const i = inlineCodes.length;
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
      return `\x00INLINE${i}\x00`;
    });
    text = escapeHtml(text);
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    text = text.replace(/^---+$/gm, '<hr>');
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g,   '<em>$1</em>');
    text = text.replace(/__(.+?)__/g,   '<strong>$1</strong>');
    text = text.replace(/_(.+?)_/g,     '<em>$1</em>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/((?:^[*\-] .+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[*\-] /,'')}</li>`).join('');
      return `<ul>${items}</ul>`;
    });
    text = text.replace(/((?:^\d+\. .+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /,'')}</li>`).join('');
      return `<ol>${items}</ol>`;
    });
    text = text.replace(/\n{2,}/g, '</p><p>');
    text = `<p>${text}</p>`;
    text = text.replace(/<p><\/p>/g, '');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/\x00CODE(\d+)\x00/g,   (_, i) => codeBlocks[i]);
    text = text.replace(/\x00INLINE(\d+)\x00/g, (_, i) => inlineCodes[i]);
    return text;
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────
  const host   = document.createElement('div');
  host.setAttribute('data-pos', cfg.position);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${CSS}</style>
    <button id="toggle-btn" aria-label="Abrir chat" title="${cfg.title}">✦</button>
    <div id="chat-panel" role="dialog" aria-label="${cfg.title}" aria-modal="true">
      <div id="header">
        <span id="header-icon">✦</span>
        <span id="header-title">${cfg.title}</span>
        <span id="status-badge">offline</span>
        <button id="new-chat-btn" title="Nueva conversación">↺ Nueva</button>
        <button id="close-btn" aria-label="Cerrar chat">✕</button>
      </div>
      <div id="messages" role="log" aria-live="polite"></div>
      <div id="typing" aria-hidden="true"><span></span><span></span><span></span></div>
      <div id="input-area">
        <div id="input-row">
          <textarea id="input" rows="1" placeholder="${cfg.placeholder}" aria-label="Mensaje"></textarea>
          <button id="send-btn" aria-label="Enviar" title="Enviar (Enter)">➤</button>
        </div>
        <div id="hint">Enter para enviar · Shift+Enter nueva línea</div>
      </div>
    </div>
  `;

  const $        = id => shadow.getElementById(id);
  const toggleBtn  = $('toggle-btn');
  const panel      = $('chat-panel');
  const messages   = $('messages');
  const typing     = $('typing');
  const input      = $('input');
  const sendBtn    = $('send-btn');
  const statusBadge= $('status-badge');
  const closeBtn   = $('close-btn');
  const newChatBtn = $('new-chat-btn');

  let history   = [];
  let streaming = false;
  let isOpen    = false;

  function openPanel() {
    isOpen = true;
    panel.classList.add('visible');
    toggleBtn.classList.add('open');
    toggleBtn.setAttribute('aria-label', 'Cerrar chat');
    setTimeout(() => input.focus(), 230);
    checkStatus();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('visible');
    toggleBtn.classList.remove('open');
    toggleBtn.setAttribute('aria-label', 'Abrir chat');
  }

  function scrollBottom() { messages.scrollTop = messages.scrollHeight; }

  function setStatus(online) {
    statusBadge.textContent = online ? 'online' : 'offline';
    statusBadge.className   = online ? 'online' : '';
  }

  function setStreaming(on) {
    streaming = on;
    sendBtn.disabled = on;
    input.disabled   = on;
    typing.className = on ? 'visible' : '';
    if (on) scrollBottom();
  }

  function addMessage(role, content) {
    if (role === 'assistant') typing.className = '';
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    if (role === 'assistant' || role === 'error') {
      div.innerHTML = renderMarkdown(content);
    } else {
      div.textContent = content;
    }
    messages.appendChild(div);
    scrollBottom();
    return div;
  }

  function authHeaders() {
    return cfg.token ? { 'Authorization': `Bearer ${cfg.token}` } : {};
  }

  async function checkStatus() {
    try {
      const r    = await fetch(`${cfg.apiUrl}/api/status`, { headers: authHeaders() });
      const data = await r.json();
      setStatus(data.ok && data.ready);
    } catch { setStatus(false); }
  }

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || streaming) return;

    input.value = '';
    input.style.height = 'auto';
    history.push({ role: 'user', content: text });
    addMessage('user', text);
    setStreaming(true);

    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'msg assistant';
    messages.appendChild(assistantDiv);

    let accumulated = '';

    try {
      const response = await fetch(`${cfg.apiUrl}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({ messages: history }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              assistantDiv.innerHTML = renderMarkdown(accumulated);
              scrollBottom();
            }
          } catch {}
        }
      }

      if (accumulated) history.push({ role: 'assistant', content: accumulated });

    } catch (err) {
      assistantDiv.remove();
      addMessage('error', `Error de conexión: ${err.message}`);
      history.pop();
    }

    setStreaming(false);
    scrollBottom();
    input.focus();
  }

  toggleBtn.addEventListener('click',  () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click',   closePanel);
  newChatBtn.addEventListener('click', () => { messages.innerHTML = ''; history = []; input.focus(); });
  input.addEventListener('input',      autoResize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', sendMessage);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closePanel(); });

  document.body.appendChild(host);
  checkStatus();
})();
