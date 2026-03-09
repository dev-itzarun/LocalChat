// src/chatManager.js — orchestrates peers, rooms, messages (LocalSend-style HTTP + multicast)
const { EventEmitter } = require('events');
const { PeerDiscovery } = require('./peerDiscovery');
const { ChatServer, sendToPeer } = require('./chatServer');

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

const MAX_HISTORY = 500;

class ChatManager extends EventEmitter {
  /**
   * @param {import('./store').Store} store
   */
  constructor(store) {
    super();
    this.store       = store;
    this.discovery   = null;
    this.server      = null;
    this.running     = false;
    this._typingMap  = {}; // `room:peerId` → timer

    // Live in-memory messages (room → array)
    // Seed from persisted history
    this.messages = {};
  }

  // Convenience getters (always read from store so they stay in sync)
  get username()    { return this.store.getUsername(); }
  get avatar()      { return this.store.getAvatar(); }
  get status()      { return this.store.getStatus(); }
  get fingerprint() { return this.store.getFingerprint(); }
  get currentRoom() { return this.store.getCurrentRoom(); }
  get rooms()       { return new Set(this.store.getRooms()); }

  // ── Startup ──────────────────────────────────────────
  async start() {
    if (this.running) return;

    // Preload persisted messages into memory
    for (const room of this.store.getRooms()) {
      this.messages[room] = this.store.getMessages(room);
    }

    // HTTP server
    this.server = new ChatServer();
    const httpPort = await this.server.start();

    // Respond to /info requests
    this.server.on('info-request', (req, res) => {
      const info = JSON.stringify({
        alias:       this.username,
        fingerprint: this.fingerprint,
        avatar:      this.avatar,
        rooms:       this.store.getRooms(),
        status:      this.status,
        version:     '1.0',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(info);
    });

    this.server.on('message', (msg, fromIP) => this._handleIncoming(msg, fromIP));

    // Discovery
    this.discovery = new PeerDiscovery(
      this.store.getDiscoveryPort(),
      httpPort,
      { username: this.username, avatar: this.avatar, fingerprint: this.fingerprint,
        rooms: this.store.getRooms(), status: this.status }
    );

    this.discovery.on('peer-joined',  p => { this.emit('peers-updated', this.getPeers()); this.emit('peer-joined', p); });
    this.discovery.on('peer-updated', p => { this.emit('peers-updated', this.getPeers()); });
    this.discovery.on('peer-left',    p => { this.emit('peers-updated', this.getPeers()); this.emit('peer-left', p); });

    this.discovery.start();
    this.running = true;
    this.emit('started', { httpPort });
  }

  // ── Incoming ──────────────────────────────────────────
  _handleIncoming(msg, fromIP) {
    switch (msg.type) {
      case 'message': {
        const room = msg.room || 'general';
        if (!this.messages[room]) this.messages[room] = [];
        this.messages[room].push(msg);
        if (this.messages[room].length > MAX_HISTORY) this.messages[room].shift();
        this.store.appendMessage(room, msg);
        this.emit('message', msg);
        // Auto-send read receipt if we're in the same room
        if (room === this.currentRoom) this._sendRead(fromIP, msg.id);
        break;
      }
      case 'typing': {
        const { from, fromId, room } = msg;
        const key = `${room}:${fromId}`;
        clearTimeout(this._typingMap[key]);
        this.emit('typing-start', { from, room, peerId: fromId });
        this._typingMap[key] = setTimeout(() => this.emit('typing-stop', { from, room, peerId: fromId }), 3500);
        break;
      }
      case 'read': {
        this.emit('read-receipt', msg);
        break;
      }
      case 'reaction': {
        this.emit('reaction', msg);
        break;
      }
      case 'room-invite': {
        this.emit('room-invite', msg);
        break;
      }
    }
  }

  async _sendRead(toIP, messageId) {
    const peer = this.getPeers().find(p => p.ip === toIP);
    if (!peer) return;
    try {
      await sendToPeer(peer.ip, peer.httpPort, {
        type: 'read', messageId,
        from: this.username, fromId: this.fingerprint, timestamp: Date.now(),
      });
    } catch (_) {}
  }

  // ── Outgoing ──────────────────────────────────────────
  async sendMessage(text, room) {
    room = room || this.currentRoom;
    if (!text?.trim()) return;
    const msg = {
      type: 'message', id: uid(),
      from: this.username, fromId: this.fingerprint,
      avatar: this.avatar, room,
      text: text.trim(), timestamp: Date.now(), readBy: [],
    };
    if (!this.messages[room]) this.messages[room] = [];
    this.messages[room].push(msg);
    if (this.messages[room].length > MAX_HISTORY) this.messages[room].shift();
    this.store.appendMessage(room, msg);
    this.emit('message', msg);

    const peers = this.discovery?.getPeersInRoom(room) || [];
    await Promise.allSettled(peers.map(p => sendToPeer(p.ip, p.httpPort, msg)));
  }

  async sendTyping(room) {
    room = room || this.currentRoom;
    const payload = { type: 'typing', from: this.username, fromId: this.fingerprint, room, timestamp: Date.now() };
    const peers = this.discovery?.getPeersInRoom(room) || [];
    await Promise.allSettled(peers.map(p => sendToPeer(p.ip, p.httpPort, payload)));
  }

  async sendReaction(messageId, emoji, room) {
    room = room || this.currentRoom;
    const payload = { type: 'reaction', messageId, emoji, from: this.username, fromId: this.fingerprint, room, timestamp: Date.now() };
    this.emit('reaction', payload);
    const peers = this.discovery?.getPeersInRoom(room) || [];
    await Promise.allSettled(peers.map(p => sendToPeer(p.ip, p.httpPort, payload)));
  }

  async invitePeer(peerId, room) {
    const peer = this.getPeers().find(p => p.id === peerId);
    if (!peer) return;
    await sendToPeer(peer.ip, peer.httpPort, {
      type: 'room-invite', from: this.username, fromId: this.fingerprint, room, timestamp: Date.now(),
    });
  }

  // ── Setters (persist via store) ────────────────────────
  setUsername(name) {
    this.store.setUsername(name);
    this._syncDiscovery();
    this.emit('username-changed', name);
  }
  setAvatar(emoji) {
    this.store.setAvatar(emoji);
    this._syncDiscovery();
    this.emit('avatar-changed', emoji);
  }
  setStatus(status) {
    this.store.setStatus(status);
    this._syncDiscovery();
    this.emit('status-changed', status);
  }

  joinRoom(room) {
    room = room.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
    if (!room) return;
    const rooms = Array.from(this.rooms);
    if (!rooms.includes(room)) rooms.push(room);
    this.store.setRooms(rooms);
    this.store.setCurrentRoom(room);
    if (!this.messages[room]) this.messages[room] = this.store.getMessages(room);
    this._syncDiscovery();
    this.emit('room-changed', { room, rooms });
  }

  switchRoom(room) {
    this.store.setCurrentRoom(room);
    this.emit('room-switched', { room, messages: this.messages[room] || [] });
  }

  _syncDiscovery() {
    this.discovery?.updateDevice({
      username: this.username, avatar: this.avatar,
      rooms: this.store.getRooms(), status: this.status,
    });
  }

  // ── Queries ───────────────────────────────────────────
  getPeers()           { return this.discovery?.getPeers() || []; }
  getMessages(room)    { return this.messages[room] || this.store.getMessages(room); }

  clearRoom(room) {
    this.messages[room] = [];
    this.store.clearRoom(room);
    this.emit('room-cleared', room);
  }

  stop() {
    this.running = false;
    this.discovery?.stop();
    this.server?.stop();
  }
}

module.exports = { ChatManager };
