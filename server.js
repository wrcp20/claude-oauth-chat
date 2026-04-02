const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Sesión persistente con probe de calentamiento ──────────────────────────────
//
// Al iniciar, envía un mensaje "ping" silencioso para que el proceso cargue
// todos sus hooks y quede listo. Las consultas del usuario llegan calientes.
//

class ClaudeSession {
  constructor(model) {
    this.model = model;
    this.proc = null;
    this.buf = '';
    this.ready = false;
    this.probing = true;   // true mientras esperamos respuesta al probe
    this.queue = [];
    this.activeRes = null;
    this.activeTextSent = 0;
    this._start();
  }

  _start() {
    this.buf = '';
    this.ready = false;
    this.probing = true;
    this.activeRes = null;
    this.activeTextSent = 0;

    this.proc = spawn('claude', [
      '-p',
      '--input-format=stream-json',
      '--output-format=stream-json',
      '--verbose',
      '--include-partial-messages',
      '--dangerously-skip-permissions',
      '--model', this.model,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      cwd: __dirname
    });

    this.proc.stdout.on('data', c => this._onData(c));
    this.proc.stderr.on('data', () => {});

    this.proc.on('error', e => {
      console.error('[session] error:', e.message);
      this._failAll('No se pudo iniciar claude CLI');
    });

    this.proc.on('close', (code, signal) => {
      this.ready = false;
      if (signal !== 'SIGTERM') {
        this._failAll('Sesión cerrada, reiniciando...');
        setTimeout(() => this._start(), 1500);
      }
    });

    // Enviar probe inmediatamente para calentar la sesión
    const probe = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: 'ok' }] }
    }) + '\n';
    this.proc.stdin.write(probe);

    console.log(`[session] calentando (${this.model})...`);
  }

  _onData(chunk) {
    this.buf += chunk.toString();
    const lines = this.buf.split('\n');
    this.buf = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);

        // Probe terminó → sesión lista
        if (this.probing && ev.type === 'result') {
          this.probing = false;
          this.ready = true;
          console.log(`[session] lista · ${this.model}`);
          this._next();
          continue;
        }

        if (this.probing) continue; // descartar output del probe

        if (!this.activeRes) continue;

        if (ev.type === 'stream_event' && ev.event?.delta?.type === 'text_delta' && ev.event.delta.text) {
          this.activeTextSent++;
          this.activeRes.write(`data: ${JSON.stringify({ text: ev.event.delta.text })}\n\n`);
        }

        if (ev.type === 'result') {
          if (!this.activeTextSent && ev.result) {
            this.activeRes.write(`data: ${JSON.stringify({ text: ev.result })}\n\n`);
          }
          if (ev.is_error) {
            this.activeRes.write(`data: ${JSON.stringify({ error: ev.result || 'Error CLI' })}\n\n`);
          }
          this.activeRes.write('data: [DONE]\n\n');
          if (!this.activeRes.writableEnded) this.activeRes.end();
          this.activeRes = null;
          this.activeTextSent = 0;
          this._next();
        }
      } catch { }
    }
  }

  _next() {
    if (this.activeRes || !this.ready || this.queue.length === 0) return;
    const item = this.queue.shift();
    if (!item) return;
    const { text, res } = item;
    if (res.writableEnded) { this._next(); return; }
    this._dispatch(text, res);
  }

  _dispatch(text, res) {
    this.activeRes = res;
    this.activeTextSent = 0;
    const msg = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text }] }
    }) + '\n';
    this.proc.stdin.write(msg);
  }

  _failAll(msg) {
    if (this.activeRes && !this.activeRes.writableEnded) {
      this.activeRes.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      this.activeRes.write('data: [DONE]\n\n');
      this.activeRes.end();
    }
    this.activeRes = null;
    for (const { res } of this.queue) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
    this.queue = [];
    this.probing = false;
  }

  send(text, res) {
    if (!this.ready) {
      // Sesión calentando — encolar y notificar
      this.queue.push({ text, res });
      res.write(`data: ${JSON.stringify({ text: '⏳ Calentando sesión, un momento...' })}\n\n`);
      return;
    }
    this.queue.push({ text, res });
    this._next();
  }

  removeFromQueue(res) {
    this.queue = this.queue.filter(q => q.res !== res);
  }

  reset(model) {
    if (model) this.model = model;
    this._failAll('Nueva conversación');
    if (this.proc && !this.proc.killed) this.proc.kill('SIGTERM');
    this._start();
  }

  status() {
    return {
      ok: true,
      model: this.model,
      ready: this.ready,
      warming: this.probing,
      queue: this.queue.length
    };
  }
}

// Haiku: modelo más rápido y económico
const session = new ClaudeSession('claude-haiku-4-5-20251001');

// ── Routes ─────────────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => res.json(session.status()));

app.post('/api/reset', (req, res) => {
  const { model } = req.body || {};
  session.reset(model || null);
  res.json({ ok: true });
});

app.post('/api/chat', (req, res) => {
  const { messages, model } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages vacío' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const text = messages[messages.length - 1].content;
  session.send(text, res);

  res.on('close', () => session.removeFromQueue(res));
});

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n✓ Chat Claude → http://localhost:${PORT}`);
  console.log('  Modelo: Haiku (rápido y económico)');
  console.log('  Calentando en background... 1er mensaje ~2-4s después de "lista"\n');
});
