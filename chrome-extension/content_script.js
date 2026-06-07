// Inyecta el widget Claude en cada página usando la config guardada en storage
(function () {
  'use strict';

  // No inyectar en páginas especiales del browser
  const url = window.location.href;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) return;

  // Evitar inyección doble
  if (document.getElementById('__claude-oauth-widget-host')) return;

  const DEFAULTS = {
    apiUrl:   'http://localhost:3200',
    token:    '',
    title:    'Asistente Claude',
    position: 'bottom-right',
    enabled:  true,
  };

  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    if (!cfg.enabled) return;

    // Inyectar config antes de cargar el widget
    const cfgScript = document.createElement('script');
    cfgScript.textContent = `
      window.CLAUDE_CHAT_CONFIG = {
        apiUrl:      ${JSON.stringify(cfg.apiUrl)},
        title:       ${JSON.stringify(cfg.title)},
        position:    ${JSON.stringify(cfg.position)},
        token:       ${JSON.stringify(cfg.token)},
        placeholder: 'Escribí tu consulta...',
      };
    `;
    document.head.appendChild(cfgScript);

    // Cargar el widget desde los recursos de la extensión
    const widgetScript = document.createElement('script');
    widgetScript.src = chrome.runtime.getURL('widget/chat-widget.js');
    widgetScript.id  = '__claude-oauth-widget-host';
    document.head.appendChild(widgetScript);
  });
})();
