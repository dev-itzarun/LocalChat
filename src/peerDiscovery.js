// src/peerDiscovery.js
// LocalSend-inspired: Multicast UDP 224.0.0.167:53317 with broadcast fallback
const dgram = require('dgram');
const os = require('os');
const { EventEmitter } = require('events');

const MULTICAST_ADDR = '224.0.0.167';
const DEFAULT_PORT   = 53317;
const MAGIC          = 'LOCALCHAT_V1';
const ANNOUNCE_INTERVAL = 4000;
const PEER_TIMEOUT      = 15000;

function getLocalIPs() {
  const result = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) result.push(iface.address);
    }
  }
  return result.length ? result : ['127.0.0.1'];
}

class PeerDiscovery extends EventEmitter {
  /**
   * @param {number} discoveryPort  UDP port (usually 53317)
   * @param {number} httpPort       HTTP server port for this device
   * @param {object} deviceInfo     { username, alias, fingerprint, rooms, status, avatar }
   */
  constructor(discoveryPort, httpPort, deviceInfo) {
    super();
    this.port       = discoveryPort || DEFAULT_PORT;
    this.httpPort   = httpPort;
    this.device     = deviceInfo;
    this.peers      = new Map();   // fingerprint → peer
    this.socket     = null;
    this._timers    = [];
    this.localIPs   = getLocalIPs();
    this.running    = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', err => this.emit('error', err));

    this.socket.on('message', (raw, rinfo) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.magic !== MAGIC) return;
        // Ignore self
        if (data.fingerprint === this.device.fingerprint) return;

        const fp  = data.fingerprint;
        const isNew = !this.peers.has(fp);
        const peer  = {
          id:        fp,
          ip:        rinfo.address,
          httpPort:  data.httpPort,
          username:  data.alias || data.username || 'Unknown',
          alias:     data.alias || data.username,
          rooms:     data.rooms || ['general'],
          status:    data.status || 'online',
          avatar:    data.avatar || '🧑',
          lastSeen:  Date.now(),
        };

        this.peers.set(fp, peer);
        this.emit(isNew ? 'peer-joined' : 'peer-updated', peer);
      } catch (_) {}
    });

    this.socket.bind(this.port, () => {
      // Try multicast, fall back to broadcast silently
      try {
        this.socket.addMembership(MULTICAST_ADDR);
        this.socket.setMulticastTTL(128);
        this._multicast = true;
      } catch (_) {
        try { this.socket.setBroadcast(true); } catch (__) {}
        this._multicast = false;
      }

      this._announce();
      this._timers.push(setInterval(() => this._announce(), ANNOUNCE_INTERVAL));
      this._timers.push(setInterval(() => this._cleanup(), 5000));
    });
  }

  _buildPayload() {
    return Buffer.from(JSON.stringify({
      magic:       MAGIC,
      httpPort:    this.httpPort,
      fingerprint: this.device.fingerprint,
      alias:       this.device.username,
      username:    this.device.username,
      rooms:       this.device.rooms,
      status:      this.device.status || 'online',
      avatar:      this.device.avatar || '🧑',
      version:     '1.0',
    }));
  }

  _announce() {
    if (!this.socket || !this.running) return;
    const payload = this._buildPayload();
    const target  = this._multicast ? MULTICAST_ADDR : '255.255.255.255';
    this.socket.send(payload, this.port, target, () => {});
  }

  _cleanup() {
    const now = Date.now();
    for (const [fp, peer] of this.peers) {
      if (now - peer.lastSeen > PEER_TIMEOUT) {
        this.peers.delete(fp);
        this.emit('peer-left', peer);
      }
    }
  }

  updateDevice(info) {
    Object.assign(this.device, info);
    this._announce();
  }

  getPeers()                { return Array.from(this.peers.values()); }
  getPeersInRoom(room)      { return this.getPeers().filter(p => p.rooms?.includes(room)); }

  stop() {
    this.running = false;
    this._timers.forEach(t => clearInterval(t));
    this._timers = [];
    if (this.socket) {
      try { if (this._multicast) this.socket.dropMembership(MULTICAST_ADDR); } catch (_) {}
      try { this.socket.close(); } catch (_) {}
      this.socket = null;
    }
  }
}

module.exports = { PeerDiscovery, getLocalIPs, MULTICAST_ADDR, DEFAULT_PORT };
