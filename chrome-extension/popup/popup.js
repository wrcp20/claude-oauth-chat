'use strict';

const DEFAULTS = {
  apiUrl:   'http://localhost:3200',
  token:    '',
  title:    'Asistente Claude',
  position: 'bottom-right',
  enabled:  true,
};

const $ = id => document.getElementById(id);

// Cargar config guardada
chrome.storage.sync.get(DEFAULTS, (cfg) => {
  $('apiUrl').value      = cfg.apiUrl;
  $('token').value       = cfg.token;
  $('title').value       = cfg.title;
  $('position').value    = cfg.position;
  $('enabled').checked   = cfg.enabled;
  checkStatus(cfg.apiUrl, cfg.token);
});

// Guardar config
$('save-btn').addEventListener('click', () => {
  const cfg = {
    apiUrl:   $('apiUrl').value.trim().replace(/\/$/, ''),
    token:    $('token').value.trim(),
    title:    $('title').value.trim() || DEFAULTS.title,
    position: $('position').value,
    enabled:  $('enabled').checked,
  };

  chrome.storage.sync.set(cfg, () => {
    const msg = $('saved-msg');
    msg.classList.add('visible');
    setTimeout(() => msg.classList.remove('visible'), 2000);
    checkStatus(cfg.apiUrl, cfg.token);
  });
});

// Verificar estado del backend
async function checkStatus(apiUrl, token) {
  const badge = $('status-badge');
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const r = await fetch(`${apiUrl}/api/status`, { headers });
    const d = await r.json();
    badge.textContent = d.ready ? 'online ✓' : 'calentando...';
    badge.className   = d.ok ? 'badge online' : 'badge';
  } catch {
    badge.textContent = 'offline';
    badge.className   = 'badge';
  }
}
