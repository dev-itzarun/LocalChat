// src/chatViewProvider.js — bridges extension host ↔ webview
const vscode = require('vscode');
const path   = require('path');

class ChatViewProvider {
  constructor(extensionUri, chatManager, store) {
    this.extensionUri = extensionUri;
    this.mgr   = chatManager;
    this.store = store;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    webviewView.webview.html = this._buildHtml(webviewView.webview);
    this._wire(webviewView.webview);
  }

  _wire(wv) {
    const mgr   = this.mgr;
    const store = this.store;

    // ── Webview → Extension ──────────────────────────
    wv.onDidReceiveMessage(async msg => {
      switch (msg.command) {

        case 'ready': {
          const state = store.getFullState();
          this._post({
            type: 'init',
            ...state,
            peers:    mgr.getPeers(),
            messages: mgr.getMessages(state.currentRoom),
          });
          break;
        }

        case 'send-message':
          await mgr.sendMessage(msg.text, msg.room);
          break;

        case 'typing':
          await mgr.sendTyping(msg.room);
          break;

        case 'join-room':
          mgr.joinRoom(msg.room);
          break;

        case 'switch-room':
          mgr.switchRoom(msg.room);
          this._post({ type: 'room-switched', room: msg.room, messages: mgr.getMessages(msg.room) });
          break;

        case 'set-username':
          mgr.setUsername(msg.username);
          break;

        case 'set-avatar':
          mgr.setAvatar(msg.avatar);
          break;

        case 'set-theme':
          store.setTheme(msg.theme);
          this._post({ type: 'theme-changed', theme: msg.theme });
          break;

        case 'set-accent':
          store.setAccentColor(msg.color);
          this._post({ type: 'accent-changed', color: msg.color });
          break;

        case 'set-status':
          mgr.setStatus(msg.status);
          break;

        case 'set-sound':
          store.setSoundEnabled(msg.enabled);
          break;

        case 'reaction':
          await mgr.sendReaction(msg.messageId, msg.emoji, msg.room);
          break;

        case 'invite-peer':
          await mgr.invitePeer(msg.peerId, msg.room);
          break;

        case 'clear-room':
          mgr.clearRoom(msg.room);
          break;

        case 'clear-all-history':
          store.clearAllHistory();
          mgr.messages = {};
          this._post({ type: 'history-cleared' });
          break;

        case 'delete-message':
          mgr.deleteMessage(msg.messageId, msg.room);
          break;

        case 'show-info':
          vscode.window.showInformationMessage(msg.text);
          break;

        case 'setup-complete':
          store.setSetupComplete(true);
          break;

        case 'close-panel':
          // Works for floating panel — activity bar panel stays managed by VS Code
          vscode.commands.executeCommand('localChat.closePanel');
          break;

        case 'checkForUpdates':
          vscode.commands.executeCommand('localChat.checkForUpdates');
          break;
      }
    });

    // ── Extension → Webview ──────────────────────────
    mgr.on('message',        m  => this._post({ type: 'message', message: m }));
    mgr.on('peers-updated',  ps => this._post({ type: 'peers-updated', peers: ps }));
    mgr.on('peer-joined',    p  => {
      this._post({ type: 'peer-joined', peer: p });
      vscode.window.setStatusBarMessage(`💬 ${p.username} joined Local Chat`, 3000);
    });
    mgr.on('peer-left',      p  => this._post({ type: 'peer-left', peer: p }));
    mgr.on('typing-start',   d  => this._post({ type: 'typing-start', ...d }));
    mgr.on('typing-stop',    d  => this._post({ type: 'typing-stop',  ...d }));
    mgr.on('read-receipt',   d  => this._post({ type: 'read-receipt', ...d }));
    mgr.on('reaction',       d  => this._post({ type: 'reaction',     ...d }));
    mgr.on('room-changed',   d  => this._post({ type: 'room-changed', ...d, messages: mgr.getMessages(d.room) }));
    mgr.on('room-switched',  d  => this._post({ type: 'room-switched', ...d }));
    mgr.on('room-cleared',   r  => this._post({ type: 'room-cleared', room: r }));
    mgr.on('username-changed', n => this._post({ type: 'username-changed', username: n }));
    mgr.on('avatar-changed',   a => this._post({ type: 'avatar-changed', avatar: a }));
    mgr.on('status-changed',   s => this._post({ type: 'status-changed', status: s }));

    mgr.on('room-invite', d => {
      this._post({ type: 'room-invite', ...d });
      vscode.window.showInformationMessage(
        `${d.from} invited you to #${d.room}`, 'Join', 'Dismiss'
      ).then(v => { if (v === 'Join') mgr.joinRoom(d.room); });
    });
  }

  _post(data) {
    this._view?.webview.postMessage(data).then(undefined, () => {});
  }

  _buildHtml(wv) {
    const media  = vscode.Uri.joinPath(this.extensionUri, 'media');
    const script = wv.asWebviewUri(vscode.Uri.joinPath(media, 'main.js'));
    const style  = wv.asWebviewUri(vscode.Uri.joinPath(media, 'style.css'));
    const nonce  = Math.random().toString(36).slice(2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    img-src * data:;
    font-src https://fonts.cdnfonts.com;
    style-src ${wv.cspSource} 'unsafe-inline' https://fonts.cdnfonts.com;
    script-src 'nonce-${nonce}';
  ">
  <title>Local Chat</title>
  <link rel="preconnect" href="https://fonts.cdnfonts.com">
  <link href="https://fonts.cdnfonts.com/css/anokha" rel="stylesheet">
  <link rel="stylesheet" href="${style}">
</head>
<body>
<div class="blob-bg">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>
<div class="noise-overlay"></div>

<div id="app">
  <!-- ══ SETUP SCREEN ══════════════════════════════ -->
  <div id="setup-screen" class="screen">
    <div class="setup-card">
      <div class="setup-logo">💬</div>
      <h1>Local Chat</h1>
      <p class="subtitle">Private peer-to-peer chat for your local network team</p>

      <span class="setup-label">Choose your avatar</span>
      <div class="avatar-grid" id="setup-avatar-grid"></div>

      <span class="setup-label">Your name</span>
      <input class="setup-input" id="setup-username" type="text" placeholder="Display name…" maxlength="32" autocomplete="off" spellcheck="false"/>

      <span class="setup-label">Theme</span>
      <div class="theme-toggle-row">
        <button class="theme-btn active" data-theme="dark" id="theme-dark">🌙 Dark</button>
        <button class="theme-btn" data-theme="light" id="theme-light">☀️ Light</button>
      </div>

      <button class="btn-primary" id="setup-start-btn">Start Chatting →</button>
    </div>
  </div>

  <!-- ══ CHAT SCREEN ═══════════════════════════════ -->
  <div id="chat-screen" class="screen hidden">

    <!-- Sidebar -->
    <div id="sidebar">
      <div class="sidebar-header">
        <div class="my-avatar" id="my-avatar" title="Edit profile">🧑</div>
        <div class="my-info">
          <span class="my-name" id="my-name">You</span>
          <span class="my-status">
            <span class="status-dot online" id="status-dot"></span>
            <span id="status-label">Online</span>
          </span>
        </div>
        <button class="icon-btn" id="settings-btn" title="Settings">${icon('settings')}</button>
      </div>

      <div class="section-label">
        Rooms
        <button class="icon-btn" id="add-room-btn" title="New room" style="width:20px;height:20px">${icon('plus')}</button>
      </div>
      <div id="rooms-list" class="rooms-list"></div>
      <div class="add-room-row hidden" id="add-room-row">
        <input class="add-room-input" id="new-room-input" placeholder="room-name…" maxlength="32" spellcheck="false"/>
      </div>

      <div class="section-label">Online <span id="online-count" style="color:var(--green);font-weight:700">0</span></div>
      <div id="peers-list" class="peers-list"></div>
    </div>

    <!-- Main -->
    <div id="main">
        <div id="chat-header">
          <button class="icon-btn" id="sidebar-toggle-btn" title="Toggle sidebar">${icon('sidebar')}</button>
          <span class="room-hash-ico">${icon('hash')}</span>
          <span id="current-room-name">general</span>
          <span class="room-peer-count" id="room-peer-count"></span>
          <div class="header-actions">
            <button class="icon-btn" id="header-theme-btn" title="Toggle theme">${icon('sun')}</button>
            <button class="icon-btn" id="clear-room-btn" title="Clear history">${icon('trash')}</button>
            <button class="icon-btn" id="close-panel-btn" title="Close Local Chat">${icon('x')}</button>
          </div>
        </div>

      <div id="messages" class="messages"></div>
      <div id="typing-indicator" class="typing-indicator"></div>

      <div id="input-area">
        <div id="emoji-picker" class="emoji-picker hidden"></div>
        <button class="icon-btn emoji-btn" id="emoji-btn" title="Emoji">${icon('smile')}</button>
        <textarea id="message-input" placeholder="Message #general…" rows="1" maxlength="2000" spellcheck="true"></textarea>
        <button class="send-btn" id="send-btn" title="Send (Enter)">${icon('send')}</button>
      </div>
    </div>
  </div>

  <!-- ══ PROFILE POPUP ═════════════════════════════ -->
  <div id="profile-popup" class="profile-popup hidden">
    <div class="profile-card">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h3>Edit Profile</h3>
        <button class="icon-btn" id="profile-close-btn">${icon('x')}</button>
      </div>

      <span class="setup-label">Avatar</span>
      <div class="avatar-grid" id="profile-avatar-grid"></div>

      <span class="setup-label">Display name</span>
      <input class="setup-input" id="profile-username" type="text" maxlength="32" autocomplete="off" spellcheck="false"/>

      <span class="setup-label">Theme</span>
      <div class="theme-toggle-row" id="profile-theme-row">
        <button class="theme-btn" data-theme="dark">🌙 Dark</button>
        <button class="theme-btn" data-theme="light">☀️ Light</button>
      </div>

      <span class="setup-label">Accent color</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap" id="accent-swatches"></div>

      <span class="setup-label">Status</span>
      <div style="display:flex;gap:6px" id="profile-status-row"></div>

      <span class="setup-label">Custom Avatar URL</span>
      <input class="setup-input" id="profile-avatar-url" type="text" placeholder="https://… (optional)" autocomplete="off" spellcheck="false"/>

      <button class="btn-primary" id="profile-save-btn">Save Changes</button>
    </div>
  </div>

  <!-- ══ POPUPS ════════════════════════════════════ -->
  <div id="status-popup"   class="popup hidden"></div>
  <div id="settings-popup" class="popup hidden"></div>
  <div id="reaction-picker" class="reaction-picker hidden"></div>
</div>

<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}

// Small inline Lucide-style SVG helper (avoids CDN dependency in webview)
function icon(name) {
  const icons = {
    hash:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
    send:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    smile:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    settings: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    plus:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    x:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    sun:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sidebar:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    copy:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check2:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`,
  };
  return icons[name] || '';
}

module.exports = { ChatViewProvider };
