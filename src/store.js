// src/store.js
// Local persistence: saves settings and message history using VS Code globalState + fs JSON file.
// Inspired by LocalSend's persistent fingerprint/device identity approach.

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');

/**
 * Generate a stable device fingerprint (LocalSend uses cert SHA-256 hash;
 * we derive ours from hostname + random UUID, persisted across sessions).
 */
function generateFingerprint() {
  return crypto.randomBytes(16).toString('hex');
}

class Store {
  /**
   * @param {import('vscode').ExtensionContext} context
   */
  constructor(context) {
    this.ctx      = context;
    this.dataDir  = context.globalStorageUri.fsPath;
    this.histFile = path.join(this.dataDir, 'history.json');
    this._histCache = null;
    this._savePending = false;
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // ── Identity ──────────────────────────────────────────
  getFingerprint() {
    let fp = this.ctx.globalState.get('localChat.fingerprint');
    if (!fp) {
      fp = generateFingerprint();
      this.ctx.globalState.update('localChat.fingerprint', fp);
    }
    return fp;
  }

  isSetupComplete() {
    return !!this.ctx.globalState.get('localChat.setupComplete');
  }
  setSetupComplete(v) { return this.ctx.globalState.update('localChat.setupComplete', v); }

  getUsername() {
    return this.ctx.globalState.get('localChat.username') || 'Developer';
  }
  setUsername(v) { return this.ctx.globalState.update('localChat.username', v); }

  getAvatar() {
    return this.ctx.globalState.get('localChat.avatar') || '🧑';
  }
  setAvatar(v) { return this.ctx.globalState.update('localChat.avatar', v); }

  getTheme() {
    return this.ctx.globalState.get('localChat.theme') || 'light';
  }
  setTheme(v) { return this.ctx.globalState.update('localChat.theme', v); }

  getAccentColor() {
    return this.ctx.globalState.get('localChat.accentColor') || '#3b82f6';
  }
  setAccentColor(v) { return this.ctx.globalState.update('localChat.accentColor', v); }

  getSoundEnabled() {
    const v = this.ctx.globalState.get('localChat.soundEnabled');
    return v === undefined ? true : v;
  }
  setSoundEnabled(v) { return this.ctx.globalState.update('localChat.soundEnabled', v); }

  getCurrentRoom() {
    return this.ctx.globalState.get('localChat.currentRoom') || 'general';
  }
  setCurrentRoom(v) { return this.ctx.globalState.update('localChat.currentRoom', v); }

  getRooms() {
    let rooms = this.ctx.globalState.get('localChat.rooms') || ['general'];
    if (!rooms.includes('general')) rooms.unshift('general');
    return rooms;
  }
  setRooms(v) { return this.ctx.globalState.update('localChat.rooms', v); }

  getStatus() {
    return this.ctx.globalState.get('localChat.status') || 'online';
  }
  setStatus(v) { return this.ctx.globalState.update('localChat.status', v); }

  getDiscoveryPort() {
    return this.ctx.globalState.get('localChat.discoveryPort') || 53317;
  }

  // ── Message History (persisted to JSON file) ──────────
  _loadHistory() {
    if (this._histCache) return this._histCache;
    try {
      if (fs.existsSync(this.histFile)) {
        this._histCache = JSON.parse(fs.readFileSync(this.histFile, 'utf8'));
      }
    } catch (_) {}
    if (!this._histCache) this._histCache = {};
    return this._histCache;
  }

  _saveHistory(hist) {
    this._histCache = hist;
    if (this._savePending) return;
    this._savePending = true;
    setImmediate(() => {
      this._savePending = false;
      try {
        fs.writeFileSync(this.histFile, JSON.stringify(this._histCache), 'utf8');
      } catch (_) {}
    });
  }

  getMessages(room) {
    const hist = this._loadHistory();
    return hist[room] || [];
  }

  appendMessage(room, msg) {
    const hist = this._loadHistory();
    if (!hist[room]) hist[room] = [];
    hist[room].push(msg);
    // Cap at 500 per room
    if (hist[room].length > 500) hist[room] = hist[room].slice(-500);
    this._saveHistory(hist);
  }

  clearRoom(room) {
    const hist = this._loadHistory();
    delete hist[room];
    this._saveHistory(hist);
  }

  deleteMessage(room, messageId) {
    const hist = this._loadHistory();
    if (hist[room]) {
      hist[room] = hist[room].filter(m => m.id !== messageId);
      this._saveHistory(hist);
    }
  }

  clearAllHistory() {
    try { fs.writeFileSync(this.histFile, '{}', 'utf8'); } catch (_) {}
  }

  // ── Full state snapshot (sent to webview on init) ─────
  getFullState() {
    return {
      fingerprint:  this.getFingerprint(),
      username:     this.getUsername(),
      avatar:       this.getAvatar(),
      theme:        this.getTheme(),
      accentColor:  this.getAccentColor(),
      soundEnabled: this.getSoundEnabled(),
      currentRoom:  this.getCurrentRoom(),
      rooms:        this.getRooms(),
      status:       this.getStatus(),
      setupComplete:this.isSetupComplete(),
    };
  }
}

module.exports = { Store };
