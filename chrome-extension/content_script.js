// Inyecta el widget Claude en cada página usando la config guardada en storage.
// Usa un <meta> tag para pasar la config al widget — evita bloqueos de CSP
// que impiden inyectar scripts inline en páginas con política estricta.
(function () {
  'use strict';

  const url = window.location.href;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) return;
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

    // Pasar config via <meta> — no es bloqueado por CSP
    const meta = document.createElement('meta');
    meta.name    = '__claude-oauth-config';
    meta.content = JSON.stringify({
      apiUrl:   cfg.apiUrl,
      token:    cfg.token,
      title:    cfg.title,
      position: cfg.position,
    });
    document.head.appendChild(meta);

    // Cargar el widget desde los recursos de la extensión
    const script  = document.createElement('script');
    script.src    = chrome.runtime.getURL('widget/chat-widget.js');
    script.id     = '__claude-oauth-widget-host';
    document.head.appendChild(script);
  });
})();
