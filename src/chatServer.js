// src/chatServer.js
// LocalSend-inspired: HTTP server instead of raw TCP.
// Each device runs a small HTTP server to receive messages.
// POST /message  — receive a chat message / reaction / typing / etc.
// GET  /info     — returns device info (used for manual peer discovery)

const http = require('http');
const { EventEmitter } = require('events');

class ChatServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port   = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/info') {
          // Handled in extension.js — respond with device info
          this.emit('info-request', req, res);
          return;
        }

        if (req.method === 'POST' && req.url === '/message') {
          const MAX_BODY = 50 * 1024 * 1024; // 50 MB for files
          let body = '';
          let size = 0;
          req.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY) {
              res.writeHead(413);
              res.end('Payload too large');
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (res.writableEnded) return;
            try {
              const msg = JSON.parse(body);
              this.emit('message', msg, req.socket.remoteAddress);
              res.writeHead(204);
              res.end();
            } catch {
              res.writeHead(400);
              res.end('Bad JSON');
            }
          });
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.server.on('error', reject);
      // Port 0 = OS picks a free port
      this.server.listen(0, '0.0.0.0', () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    });
  }

  getPort() { return this.port; }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

/**
 * Send a message to a peer via HTTP POST /message
 */
function sendToPeer(ip, port, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req  = http.request(
      { hostname: ip, port, path: '/message', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 3000 },
      (res) => {
        res.resume(); // drain
        resolve();
      }
    );
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { ChatServer, sendToPeer };
