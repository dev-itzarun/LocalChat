// media/main.js — Local Chat webview UI (vanilla JS, zero deps)
// Lucide icons are inlined as SVG strings passed from chatViewProvider.js

/* ═══════════════════════════════════════════════════
   VS Code API bridge
═══════════════════════════════════════════════════ */
const vscode = acquireVsCodeApi();
function post(command, data) { vscode.postMessage({ command, ...data }); }

/* ═══════════════════════════════════════════════════
   Inline SVG icon helper (mirrors chatViewProvider.js)
   MUST live in main.js — chatViewProvider's icon() is
   server-side only and is not available in the webview.
═══════════════════════════════════════════════════ */
function icon(name) {
  const icons = {
    hash:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
    send:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    smile:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    settings:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    plus:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    x:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    sun:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sidebar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    copy:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check2:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`,
  };
  return icons[name] || '';
}

/* ═══════════════════════════════════════════════════
   State
═══════════════════════════════════════════════════ */
const INIT = window.__INIT__ || {};
if (INIT.setupComplete) {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('chat-screen').classList.remove('hidden');
}

const state = {
  username:    '',
  avatar:      '🧑',
  theme:       'dark',
  accentColor: '#3b82f6',
  soundEnabled: true,
  currentRoom: 'general',
  rooms:       ['general'],
  peers:       [],
  messages:    [],   // messages for current room (from persisted + live)
  status:      'online',
  typingPeers: new Set(),
  unread:      {},   // room → count
  reactions:   {},   // messageId → { emoji: count }
  readReceipts:{},   // messageId → [fromId]
  memory:      '0 MB',
  initialized: false,
};

/* ═══════════════════════════════════════════════════
   Avatars & accent colors
═══════════════════════════════════════════════════ */
const AVATARS = ['🧑','👩','👨','🧔','👱','🧕','👶','🧓','🦊','🐱','🐶','🐼','🦁','🐸','🦄','🐙','🎃','🤖','👾','🧙'];
const ACCENTS = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4'];
const STATUS_LIST = [
  { value: 'online', label: '🟢 Online'  },
  { value: 'away',   label: '🟡 Away'    },
  { value: 'busy',   label: '🔴 Busy'    },
  { value: 'dnd',    label: '⛔ Do Not Disturb' },
];
const QUICK_EMOJIS = ['😀','😂','🥲','😍','🤩','😎','🤔','😅','👍','👎','❤️','🔥','💯','🎉','🚀','✅','❌','⚡','🙏','😭','😤','🤯','💀','🫡','👀','💬','📌','🛠️','💡','📦'];

/* ═══════════════════════════════════════════════════
   DOM refs
═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const setupScreen   = $('setup-screen');
const chatScreen    = $('chat-screen');
const setupUsername = $('setup-username');
const myAvatar      = $('my-avatar');
const myName        = $('my-name');
const statusDot     = $('status-dot');
const statusLabel   = $('status-label');
const roomsList     = $('rooms-list');
const peersList     = $('peers-list');
const onlineCount   = $('online-count');
const roomName      = $('current-room-name');
const roomPeerCount = $('room-peer-count');
const messagesEl    = $('messages');
const typingEl      = $('typing-indicator');
const inputEl       = $('message-input');
const sendBtn       = $('send-btn');
const emojiBtn      = $('emoji-btn');
const emojiPicker   = $('emoji-picker');
const reactionPicker= $('reaction-picker');
const profilePopup  = $('profile-popup');
const setPopup      = $('settings-popup');

/* ═══════════════════════════════════════════════════
   Theme & accent helpers
═══════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  $('header-theme-btn').innerHTML = theme === 'dark'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  // Sync theme buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  // Derived glow
  document.documentElement.style.setProperty('--accent-glow', color + '33');
  state.accentColor = color;
}

/* ═══════════════════════════════════════════════════
   Init popups
═══════════════════════════════════════════════════ */
function buildAvatarGrid(gridEl, currentAvatar, onSelect) {
  gridEl.innerHTML = '';
  AVATARS.forEach(av => {
    const btn = document.createElement('button');
    btn.className = 'avatar-opt' + (av === currentAvatar ? ' selected' : '');
    btn.textContent = av;
    btn.title = av;
    btn.onclick = () => {
      gridEl.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(av);
    };
    gridEl.appendChild(btn);
  });
}

function renderAvatar(av) {
  if (!av) return '🧑';
  if (av.startsWith('http')) {
    return `<img src="${av}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.outerHTML='🧑'"/>`;
  }
  return escHtml(av);
}

function buildAccentSwatches() {
  const el = $('accent-swatches');
  el.innerHTML = '';
  ACCENTS.forEach(color => {
    const btn = document.createElement('button');
    btn.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid ${color === state.accentColor ? '#fff' : 'transparent'};cursor:pointer;transition:transform .18s;`;
    btn.title = color;
    btn.onclick = () => {
      applyAccent(color);
      post('set-accent', { color });
      el.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#fff';
    };
    btn.onmouseenter = () => btn.style.transform = 'scale(1.2)';
    btn.onmouseleave = () => btn.style.transform = '';
    el.appendChild(btn);
  });
}

function buildStatusRow(rowEl, onSelect) {
  rowEl.innerHTML = '';
  STATUS_LIST.forEach(s => {
    const btn = document.createElement('button');
    btn.style.cssText = `flex:1;padding:6px 4px;border-radius:9px;border:1.5px solid var(--border);background:${s.value===state.status?'var(--active-room)':'var(--glass)'};color:var(--text-0);font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .18s;`;
    btn.textContent = s.label;
    btn.onclick = () => {
      rowEl.querySelectorAll('button').forEach(b => b.style.background = 'var(--glass)');
      btn.style.background = 'var(--active-room)';
      onSelect(s.value);
    };
    rowEl.appendChild(btn);
  });
}

function buildEmojiPicker() {
  emojiPicker.innerHTML = '';
  QUICK_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.textContent = em;
    btn.onclick = () => {
      const start = inputEl.selectionStart;
      const val   = inputEl.value;
      inputEl.value = val.slice(0, start) + em + val.slice(inputEl.selectionEnd);
      inputEl.selectionStart = inputEl.selectionEnd = start + em.length;
      inputEl.focus();
      autoResize();
      hideAll();
    };
    emojiPicker.appendChild(btn);
  });
}

function buildReactionPicker(messageId, x, y) {
  const REACT_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👀'];
  reactionPicker.innerHTML = '';
  REACT_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.textContent = em;
    btn.onclick = () => {
      post('reaction', { messageId, emoji: em, room: state.currentRoom });
      hideAll();
    };
    reactionPicker.appendChild(btn);
  });
  reactionPicker.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  reactionPicker.style.top  = (y - 52) + 'px';
  reactionPicker.classList.remove('hidden');
}

function openProfilePopup() {
  buildAvatarGrid($('profile-avatar-grid'), state.avatar, av => { state.avatar = av; });
  buildAccentSwatches();
  buildStatusRow($('profile-status-row'), v => { state.status = v; });
  $('profile-username').value = state.username;
  $('profile-avatar-url').value = state.avatar.startsWith('http') ? state.avatar : '';

  // Sync theme buttons inside profile popup
  document.querySelectorAll('#profile-theme-row .theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === state.theme);
  });

  profilePopup.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════
   Rooms
═══════════════════════════════════════════════════ */
function renderRooms() {
  roomsList.innerHTML = '';
  state.rooms.forEach(r => {
    const div = document.createElement('div');
    div.className = 'room-item' + (r === state.currentRoom ? ' active' : '');
    div.dataset.room = r;
    const unread = state.unread[r] || 0;
    div.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r)}</span>
      ${unread > 0 ? `<span class="room-badge">${unread}</span>` : ''}
    `;
    div.onclick = () => switchRoom(r);
    roomsList.appendChild(div);
  });
  roomName.textContent = state.currentRoom;
  $('message-input').placeholder = `Message #${state.currentRoom}…`;
}

function switchRoom(room) {
  if (room === state.currentRoom) return;
  state.currentRoom = room;
  state.unread[room] = 0;
  state.messages = [];
  renderRooms();
  renderPeers();
  messagesEl.innerHTML = '';
  renderEmptyState();
  post('switch-room', { room });
}

/* ═══════════════════════════════════════════════════
   Peers
═══════════════════════════════════════════════════ */
function renderPeers() {
  const inRoom = state.peers.filter(p => p.rooms?.includes(state.currentRoom));
  const others = state.peers.filter(p => !p.rooms?.includes(state.currentRoom));

  peersList.innerHTML = '';
  onlineCount.textContent = state.peers.length;
  roomPeerCount.textContent = inRoom.length ? `· ${inRoom.length} here` : '';

  [...inRoom, ...others].forEach(peer => {
    const div = document.createElement('div');
    div.className = 'peer-item';
    const inCurRoom = peer.rooms?.includes(state.currentRoom);
    div.innerHTML = `
      <div class="peer-avatar">
        ${renderAvatar(peer.avatar)}
        <span class="peer-sdot ${peer.status || 'online'}"></span>
      </div>
      <div class="peer-info">
        <span class="peer-name">${escHtml(peer.username)}</span>
        <span class="peer-sub">${inCurRoom ? '#' + state.currentRoom : peer.rooms?.[0] ? '#'+peer.rooms[0] : ''}</span>
      </div>
    `;
    div.title = `${peer.username} — right-click to invite`;
    div.oncontextmenu = e => {
      e.preventDefault();
      if (!inCurRoom) post('invite-peer', { peerId: peer.id, room: state.currentRoom });
    };
    peersList.appendChild(div);
  });

  if (!state.peers.length) {
    peersList.innerHTML = `<div style="padding:10px 8px;font-size:11px;color:var(--text-3);text-align:center;line-height:1.7">No peers found yet.<br>Waiting for teammates…</div>`;
  }
}

/* ═══════════════════════════════════════════════════
   Messages
═══════════════════════════════════════════════════ */
function renderEmptyState() {
  if (!messagesEl.querySelector('.empty-state') && !messagesEl.children.length) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>No messages yet in <strong>#${escHtml(state.currentRoom)}</strong><br>
        Say hi to your teammates!</p>
      </div>
    `;
  }
}

function msgTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function msgDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let _lastDate = null;
let _lastFrom = null;
let _lastTs   = 0;

function appendMessage(msg, prepend = false) {
  // Remove empty state
  const empty = messagesEl.querySelector('.empty-state');
  if (empty) empty.remove();

  const mine = msg.fromId === state.fingerprint || msg.from === state.username;
  const dateLabel = msgDate(msg.timestamp);
  const consecutive = !prepend && _lastFrom === msg.fromId && (msg.timestamp - _lastTs) < 60000;

  // Date divider
  if (dateLabel !== _lastDate && !prepend) {
    _lastDate = dateLabel;
    const div = document.createElement('div');
    div.className = 'date-divider';
    div.textContent = dateLabel;
    if (prepend) messagesEl.insertBefore(div, messagesEl.firstChild);
    else messagesEl.appendChild(div);
  }

  const row = document.createElement('div');
  row.className = `msg${mine ? ' mine' : ''}${consecutive ? ' consecutive' : ''}`;
  row.dataset.id = msg.id;

  const emojiText = msg.text.length <= 3 && /^\p{Emoji}+$/u.test(msg.text.trim())
    ? `<span style="font-size:28px;background:none;border:none;padding:0;box-shadow:none"> ${escHtml(msg.text)}</span>`
    : `<div class="msg-bubble">${escHtml(msg.text).replace(/\n/g,'<br>')}</div>`;

  row.innerHTML = `
    <div class="msg-avatar">${renderAvatar(msg.avatar)}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-author">${escHtml(msg.from)}</span>
        <span class="msg-time">${msgTimestamp(msg.timestamp)}</span>
      </div>
      ${emojiText}
      <div class="msg-reactions" id="reactions-${msg.id}"></div>
      ${mine ? `<div class="msg-read" id="read-${msg.id}">Sent</div>` : ''}
    </div>
    <div class="msg-actions">
      <button class="action-btn" title="Copy" onclick="copyMsg('${msg.id}')">${icon('copy')}</button>
      <button class="action-btn" title="React" onclick="triggerReactionPicker(event,'${msg.id}')">😊</button>
      ${mine ? `<button class="action-btn" title="Delete" onclick="deleteMsg('${msg.id}')">${icon('trash')}</button>` : ''}
    </div>
  `;

  if (prepend) messagesEl.insertBefore(row, messagesEl.firstChild);
  else {
    messagesEl.appendChild(row);
    _lastFrom = msg.fromId || msg.from;
    _lastTs   = msg.timestamp;
  }

  // Apply stored reactions
  if (state.reactions[msg.id]) {
    updateReactionsUI(msg.id);
  }

  return row;
}

function renderAllMessages(messages) {
  messagesEl.innerHTML = '';
  _lastDate = null; _lastFrom = null; _lastTs = 0;
  if (!messages || !messages.length) { renderEmptyState(); return; }
  messages.forEach(m => appendMessage(m));
  scrollToBottom();
}

function scrollToBottom(smooth = false) {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

function updateReactionsUI(messageId) {
  const el = document.getElementById('reactions-' + messageId);
  if (!el) return;
  const reacts = state.reactions[messageId] || {};
  el.innerHTML = Object.entries(reacts).map(([emoji, { count, mine }]) =>
    `<button class="reaction-pill${mine?' mine':''}" onclick="post('reaction',{messageId:'${messageId}',emoji:'${emoji}',room:state.currentRoom})" title="${count} reaction${count>1?'s':''}">${emoji} <span>${count}</span></button>`
  ).join('');
}

/* Global helpers called from inline onclick */
window.triggerReactionPicker = (e, msgId) => {
  e.stopPropagation();
  buildReactionPicker(msgId, e.clientX, e.clientY);
};
window.deleteMsg = (msgId) => {
  if (confirm('Delete this message?')) {
    post('delete-message', { messageId: msgId, room: state.currentRoom });
    document.querySelector(`[data-id="${msgId}"]`)?.remove();
    renderEmptyState();
  }
};
window.copyMsg = (msgId) => {
  const row = document.querySelector(`[data-id="${msgId}"]`);
  const bubble = row?.querySelector('.msg-bubble');
  if (bubble) {
    const text = bubble.innerText;
    navigator.clipboard.writeText(text);
    vscode.postMessage({ command: 'show-info', text: 'Copied to clipboard!' });
  }
};
window.post = post;
window.state = state;

/* ═══════════════════════════════════════════════════
   Sound
═══════════════════════════════════════════════════ */
function playPop() {
  if (!state.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain= ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  } catch (_) {}
}

/* ═══════════════════════════════════════════════════
   Typing indicator
═══════════════════════════════════════════════════ */
function updateTyping() {
  if (!state.typingPeers.size) { typingEl.innerHTML = ''; return; }
  const names = [...state.typingPeers];
  const label = names.length === 1
    ? `${escHtml(names[0])} is typing`
    : `${names.slice(0,-1).map(escHtml).join(', ')} and ${escHtml(names.at(-1))} are typing`;
  typingEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>${label}…`;
}

/* ═══════════════════════════════════════════════════
   Hide all overlays
═══════════════════════════════════════════════════ */
function hideAll() {
  emojiPicker.classList.add('hidden');
  reactionPicker.classList.add('hidden');
  setPopup.classList.add('hidden');
  $('status-popup').classList.add('hidden');
}

/* ═══════════════════════════════════════════════════
   Auto-resize textarea
═══════════════════════════════════════════════════ */
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
}

/* ═══════════════════════════════════════════════════
   Send message
═══════════════════════════════════════════════════ */
let typingDebounce = null;
function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  autoResize();
  post('send-message', { text, room: state.currentRoom });
}

/* ═══════════════════════════════════════════════════
   Event listeners
═══════════════════════════════════════════════════ */

// Setup screen
$('setup-start-btn').onclick = () => {
  const name = setupUsername.value.trim();
  if (!name) { setupUsername.focus(); return; }
  post('set-username', { username: name });
  post('set-avatar',   { avatar: state.avatar });
  post('set-theme',    { theme: state.theme });
  post('setup-complete', {});
  setupScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  state.username = name;
  myName.textContent = name;
  myAvatar.innerHTML = renderAvatar(state.avatar);
  inputEl.focus();
};

setupUsername.addEventListener('keydown', e => { if (e.key === 'Enter') $('setup-start-btn').click(); });

// Theme buttons (setup + profile)
document.querySelectorAll('.theme-btn').forEach(b => {
  b.onclick = () => {
    applyTheme(b.dataset.theme);
    post('set-theme', { theme: b.dataset.theme });
    document.querySelectorAll('.theme-btn').forEach(x => x.classList.toggle('active', x.dataset.theme === b.dataset.theme));
  };
});

// Settings btn
$('settings-btn').onclick = e => {
  e.stopPropagation();
  setPopup.innerHTML = `
    <div class="popup-title">Settings</div>
    <div class="popup-item" id="sp-profile">✏️ Edit Profile</div>
    <div class="popup-item" id="sp-sound">🔊 Sound: ${state.soundEnabled?'On':'Off'}</div>
    <div class="popup-item" id="sp-update">🔄 Check for Updates</div>
    <hr>
    <div class="popup-item danger" id="sp-clear">🗑 Clear All History</div>
  `;
  $('sp-profile').onclick = () => { hideAll(); openProfilePopup(); };
  $('sp-update').onclick = () => { hideAll(); post('checkForUpdates', {}); };
  $('sp-sound').onclick = () => {
    state.soundEnabled = !state.soundEnabled;
    post('set-sound', { enabled: state.soundEnabled });
    $('sp-sound').textContent = `🔊 Sound: ${state.soundEnabled?'On':'Off'}`;
  };
  $('sp-clear').onclick = () => { if (confirm('Clear all message history?')) post('clear-all-history', {}); hideAll(); };

  const rect = e.currentTarget.getBoundingClientRect();
  setPopup.style.top  = (rect.bottom + 4) + 'px';
  setPopup.style.left = rect.left + 'px';
  setPopup.classList.toggle('hidden');
};

// My avatar click → open profile
myAvatar.onclick = () => openProfilePopup();

// Profile popup
$('profile-close-btn').onclick = () => profilePopup.classList.add('hidden');
$('profile-popup').onclick = e => { if (e.target === profilePopup) profilePopup.classList.add('hidden'); };

$('profile-save-btn').onclick = () => {
  const name = $('profile-username').value.trim();
  if (name && name !== state.username) {
    post('set-username', { username: name });
    state.username = name;
    myName.textContent = name;
  }
  const customAvi = $('profile-avatar-url').value.trim();
  if (customAvi) state.avatar = customAvi;

  post('set-avatar',  { avatar: state.avatar });
  post('set-status',  { status: state.status });
  profilePopup.classList.add('hidden');
  myAvatar.innerHTML = renderAvatar(state.avatar);
  updateStatusUI();
};

// Header theme toggle
$('header-theme-btn').onclick = () => {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  post('set-theme', { theme: next });
};

// Clear room
$('clear-room-btn').onclick = () => {
  if (confirm(`Clear history for #${state.currentRoom}?`)) {
    post('clear-room', { room: state.currentRoom });
  }
};

// Sidebar toggle
let sidebarVisible = false; // Default closed
$('sidebar-toggle-btn').onclick = () => {
  sidebarVisible = !sidebarVisible;
  applySidebarState();
};

function applySidebarState() {
  const sidebar = $('sidebar');
  sidebar.style.transition = 'width .2s cubic-bezier(.4,0,.2,1), opacity .2s';
  if (sidebarVisible) {
    sidebar.style.width = '';
    sidebar.style.minWidth = '';
    sidebar.style.opacity = '1';
    sidebar.style.overflow = '';
  } else {
    sidebar.style.width = '0';
    sidebar.style.minWidth = '0';
    sidebar.style.opacity = '0';
    sidebar.style.overflow = 'hidden';
  }
}
// Initial state
applySidebarState();

// Close panel button (works for floating panel; sidebar panel managed by VS Code)
$('close-panel-btn').onclick = () => {
  post('close-panel', {});
};

// Add room
$('add-room-btn').onclick = () => {
  const row = $('add-room-row');
  row.classList.toggle('hidden');
  if (!row.classList.contains('hidden')) $('new-room-input').focus();
};

$('new-room-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const name = $('new-room-input').value.trim();
    if (name) {
      post('join-room', { room: name });
      $('new-room-input').value = '';
      $('add-room-row').classList.add('hidden');
    }
  }
  if (e.key === 'Escape') { $('add-room-row').classList.add('hidden'); }
});

// Emoji picker
emojiBtn.onclick = e => {
  e.stopPropagation();
  buildEmojiPicker();
  emojiPicker.classList.toggle('hidden');
};

// Send
sendBtn.onclick = sendMessage;
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// Typing broadcast
inputEl.addEventListener('input', () => {
  autoResize();
  clearTimeout(typingDebounce);
  typingDebounce = setTimeout(() => post('typing', { room: state.currentRoom }), 400);
});

// Close popups by clicking outside
document.addEventListener('click', hideAll);

/* ═══════════════════════════════════════════════════
   Status UI
═══════════════════════════════════════════════════ */
function updateStatusUI() {
  const s = state.status;
  statusDot.className = `status-dot ${s}`;
  statusLabel.textContent = s.charAt(0).toUpperCase() + s.slice(1);
}

/* ═══════════════════════════════════════════════════
   Message from Extension Host
═══════════════════════════════════════════════════ */
window.addEventListener('message', ({ data: msg }) => {
  switch (msg.type) {

    case 'init': {
      state.username    = msg.username;
      state.avatar      = msg.avatar;
      state.theme       = msg.theme;
      state.accentColor = msg.accentColor;
      state.soundEnabled= msg.soundEnabled;
      state.currentRoom = msg.currentRoom;
      state.rooms       = msg.rooms || ['general'];
      state.peers       = msg.peers || [];
      state.status      = msg.status || 'online';
      state.fingerprint = msg.fingerprint;
      state.memory      = msg.memory || '0 MB';
      state.initialized = true;

      const memEl = $('mem-usage'); if (memEl) memEl.textContent = state.memory;

      applyTheme(state.theme);
      applyAccent(state.accentColor);

      // Build setup avatar grid
      buildAvatarGrid($('setup-avatar-grid'), state.avatar, av => { state.avatar = av; });

      if (msg.setupComplete || INIT.setupComplete) {
        // Already configured — go straight to chat
        setupScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
      } else {
        setupUsername.value = (state.username && state.username !== 'Developer') ? state.username : '';
        setupScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        setTimeout(() => setupUsername.focus(), 100);
      }

      myName.textContent   = state.username;
      myAvatar.innerHTML = renderAvatar(state.avatar);
      updateStatusUI();
      renderRooms();
      renderPeers();
      renderAllMessages(msg.messages || []);
      break;
    }

    case 'message': {
      const m = msg.message;
      if (m.room === state.currentRoom) {
        appendMessage(m);
        scrollToBottom(true);
        if (m.from !== state.username) playPop();
      } else {
        state.unread[m.room] = (state.unread[m.room] || 0) + 1;
        renderRooms();
      }
      break;
    }

    case 'peers-updated': {
      state.peers = msg.peers;
      renderPeers();
      break;
    }

    case 'peer-joined': {
      state.peers = [...state.peers.filter(p => p.id !== msg.peer.id), msg.peer];
      renderPeers();
      break;
    }

    case 'peer-left': {
      state.peers = state.peers.filter(p => p.id !== msg.peer.id);
      renderPeers();
      break;
    }

    case 'typing-start': {
      if (msg.room === state.currentRoom) {
        state.typingPeers.add(msg.from);
        updateTyping();
      }
      break;
    }

    case 'typing-stop': {
      state.typingPeers.delete(msg.from);
      updateTyping();
      break;
    }

    case 'read-receipt': {
      if (!state.readReceipts[msg.messageId]) state.readReceipts[msg.messageId] = [];
      state.readReceipts[msg.messageId].push(msg.fromId);
      const el = document.getElementById('read-' + msg.messageId);
      if (el) el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg> Seen`;
      break;
    }

    case 'reaction': {
      const { messageId, emoji, from } = msg;
      if (!state.reactions[messageId]) state.reactions[messageId] = {};
      const r = state.reactions[messageId];
      if (!r[emoji]) r[emoji] = { count: 0, mine: false };
      r[emoji].count++;
      if (from === state.username) r[emoji].mine = true;
      updateReactionsUI(messageId);
      break;
    }

    case 'room-changed':
    case 'room-switched': {
      if (!state.rooms.includes(msg.room)) state.rooms.push(msg.room);
      state.currentRoom = msg.room;
      state.unread[msg.room] = 0;
      state.messages = msg.messages || [];
      renderRooms();
      renderPeers();
      renderAllMessages(msg.messages || []);
      break;
    }

    case 'room-cleared': {
      if (msg.room === state.currentRoom) {
        state.messages = [];
        messagesEl.innerHTML = '';
        renderEmptyState();
      }
      break;
    }

    case 'history-cleared': {
      state.messages = [];
      messagesEl.innerHTML = '';
      renderEmptyState();
      break;
    }

    case 'username-changed': {
      state.username = msg.username;
      myName.textContent = msg.username;
      break;
    }

    case 'avatar-changed': {
      state.avatar = msg.avatar;
      myAvatar.innerHTML = renderAvatar(msg.avatar);
      break;
    }

    case 'status-changed': {
      state.status = msg.status;
      updateStatusUI();
      break;
    }

    case 'theme-changed': {
      applyTheme(msg.theme);
      break;
    }

    case 'accent-changed': {
      applyAccent(msg.color);
      break;
    }

    case 'room-invite': {
      const banner = document.createElement('div');
      banner.className = 'system-msg';
      banner.innerHTML = `📩 <strong>${escHtml(msg.from)}</strong> invited you to <strong>#${escHtml(msg.room)}</strong> — <a href="#" onclick="post('join-room',{room:'${msg.room}'});this.parentElement.remove();return false;">Join</a>`;
      messagesEl.appendChild(banner);
      scrollToBottom(true);
      break;
    }

    case 'memory-update': {
      state.memory = msg.memory;
      const memEl2 = $('mem-usage'); if (memEl2) memEl2.textContent = msg.memory;
      break;
    }
  }
});

/* ═══════════════════════════════════════════════════
   Bootstrap
═══════════════════════════════════════════════════ */
// Apply saved theme (default light) before init message arrives
document.documentElement.setAttribute('data-theme', 'light');
post('ready', {});