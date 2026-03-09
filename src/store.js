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

  getUsername() {
    return this.ctx.globalState.get('localChat.username') ||
           os.userInfo().username || 'Developer';
  }
  setUsername(v) { return this.ctx.globalState.update('localChat.username', v); }

  getAvatar() {
    return this.ctx.globalState.get('localChat.avatar') || '🧑';
  }
  setAvatar(v) { return this.ctx.globalState.update('localChat.avatar', v); }

  getTheme() {
    return this.ctx.globalState.get('localChat.theme') || 'dark';
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
    return this.ctx.globalState.get('localChat.rooms') || ['general'];
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
    try {
      if (fs.existsSync(this.histFile)) {
        return JSON.parse(fs.readFileSync(this.histFile, 'utf8'));
      }
    } catch (_) {}
    return {};
  }

  _saveHistory(hist) {
    try {
      fs.writeFileSync(this.histFile, JSON.stringify(hist), 'utf8');
    } catch (_) {}
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
    };
  }
}

module.exports = { Store };
