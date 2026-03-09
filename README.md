# Local Chat

<div align="center">

<img src="resources/icon.png" width="100" alt="Local Chat Logo"/>

### Private peer-to-peer chat for developers on the same local network — directly in VS Code.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat-square)](https://github.com/triode-devs/local-chat)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE.txt)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85-007ACC?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com/)
[![Made by Triode Devs](https://img.shields.io/badge/made%20by-Triode%20Devs-6366f1?style=flat-square)](https://github.com/triode-devs)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

**No external servers. No accounts. No configuration. Just chat.**

[Features](#-features) · [Installation](#-installation) · [How It Works](#-how-it-works) · [Contributing](#-contributing) · [License](#-license)

</div>

---

## 🗂 Overview

**Local Chat** is an open-source VS Code extension that lets developers chat instantly with teammates on the same local network (Wi-Fi or LAN) — without any external servers, cloud services, or accounts.

Inspired by [LocalSend](https://github.com/localsend/localsend), it uses **multicast UDP** for automatic peer discovery and a lightweight **HTTP server** on each device for message delivery. Everything stays on your local network.

```
Developer A (VS Code)         Developer B (VS Code)
      │                               │
      │  UDP Multicast 224.0.0.167    │
      │◄─────────────────────────────►│   ← Auto-discover each other
      │                               │
      │  HTTP POST /message           │
      │──────────────────────────────►│   ← Send message
      │                               │
      │◄──────────────────────────────│   ← Reply
```

---

## ✨ Features

| Feature                | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| 🏠 **Rooms**           | Create separate chat spaces (e.g. `#frontend`, `#ops`, `#standup`) |
| 🔍 **Auto-Discovery**  | Automatically finds teammates via multicast UDP — zero setup       |
| 🔒 **Private & Local** | All messages stay on your LAN, never touch the internet            |
| 💬 **Real-time Chat**  | Typing indicators, read receipts, emoji reactions                  |
| 😊 **Rich Messaging**  | Emoji picker, emoji-only messages, message reactions               |
| 👤 **Custom Profile**  | Username, emoji avatar, status (online/away/busy/DND)              |
| 🎨 **Themes**          | Light + Dark mode, 10 accent color options                         |
| 💾 **Persistent**      | Message history and settings saved locally across sessions         |
| 🔔 **Notifications**   | Sound alerts and VS Code status bar peer count                     |
| 🔄 **Auto-Updates**    | Automatically checks GitHub for new versions — zero manual work    |
| ⚡ **Zero Config**     | Works out of the box on the same subnet                            |

---

## 📦 Installation

### ⚡ One-liner from Git (Recommended for teammates)

> Requires [Node.js](https://nodejs.org) and VS Code with the `code` CLI in PATH.

**Windows (PowerShell):**

```powershell
git clone https://github.com/triode-devs/local-chat.git
cd local-chat
.\install.ps1
```

**macOS / Linux:**

```bash
git clone https://github.com/triode-devs/local-chat.git
cd local-chat
bash install.sh
```

The script automatically checks prerequisites → packages the `.vsix` → installs it into VS Code.

---

### Option A — Install from VSIX (no git needed)

1. Download the latest `.vsix` from [Releases](https://github.com/triode-devs/local-chat/releases)
2. Press `Ctrl+Shift+P` → **Extensions: Install from VSIX…**
3. Select the file and reload VS Code

Or via terminal:

```bash
code --install-extension local-chat-0.1.0.vsix
```

### Option B — Manual build

```bash
git clone https://github.com/triode-devs/local-chat.git
cd local-chat
npm install
npx vsce package --no-dependencies --allow-missing-repository
code --install-extension local-chat-0.1.0.vsix
```

### Option C — Development Mode (F5)

```bash
git clone https://github.com/triode-devs/local-chat.git
cd local-chat
```

Open the folder in VS Code and press **F5** — an Extension Development Host launches with Local Chat active.

---

## 🚀 Quick Start

1. After installing, click the **💬** icon in the Activity Bar (or press `Alt+Q`)
2. Choose your **avatar**, enter a **display name**, and pick a **theme**
3. Hit **Start Chatting** — teammates on the same network appear automatically
4. Start messaging in `#general`, or create a new room

> **Note:** All teammates must have the extension installed. They don't need to do anything extra — peer discovery is automatic.

---

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action                  |
| ------------- | ----------------------- |
| `Alt+Q`       | Open / focus Local Chat |
| `Enter`       | Send message            |
| `Shift+Enter` | New line in message     |

---

## ⚙️ Settings

| Setting                   | Default     | Description                 |
| ------------------------- | ----------- | --------------------------- |
| `localChat.username`      | OS username | Your display name           |
| `localChat.discoveryPort` | `53317`     | UDP port for peer discovery |
| `localChat.currentRoom`   | `general`   | Last active room            |
| `localChat.theme`         | `dark`      | UI theme (`dark` / `light`) |
| `localChat.soundEnabled`  | `true`      | Play sound on new messages  |

---

## 🏗 How It Works

Local Chat takes a protocol-first approach inspired by [LocalSend](https://github.com/localsend/localsend):

### 1. Peer Discovery — Multicast UDP

- On startup, each device announces itself to the multicast group **`224.0.0.167:53317`** every 4 seconds
- The announcement includes: alias, fingerprint, HTTP port, rooms, status, avatar
- Falls back to UDP broadcast (`255.255.255.255`) if multicast is unavailable
- Peers not seen for 15 seconds are removed automatically

### 2. Messaging — HTTP REST

- Each device runs a small **HTTP server** on a random available port
- Messages are sent via `POST /message` with a JSON body
- Device info is available at `GET /info`
- No persistent connections — fire-and-forget with a 3s timeout

### 3. Device Identity

- Each installation generates a **random fingerprint** (UUID) on first run
- Persisted in VS Code `globalState` — survives restarts
- Used to deduplicate self-announcements and identify devices

### 4. Persistence

- **Settings** (username, avatar, theme, rooms) → VS Code `globalState`
- **Message history** (per room, last 500 msgs) → JSON file in `globalStorageUri`

### Tech Stack

```
Extension Host (Node.js)          Webview (Vanilla JS/CSS)
├── src/store.js       ←──────────── Persistence layer
├── src/peerDiscovery.js           Media folder
│   └── dgram (UDP multicast)     ├── media/main.js
├── src/chatServer.js              │   └── Full UI state machine
│   └── http (REST server)        └── media/style.css
├── src/chatManager.js                 └── Glassmorphism theme
└── src/chatViewProvider.js ──────────► IPC bridge (postMessage)
```

---

## 🌐 Network Requirements

- All devices must be on the **same subnet** (same Wi-Fi router or LAN switch)
- **UDP port `53317`** must be reachable between devices (firewall)
- No internet access required at any point

**Firewall (Windows):**

```powershell
# Allow UDP discovery (run as Administrator)
New-NetFirewallRule -DisplayName "Local Chat Discovery" -Direction Inbound -Protocol UDP -LocalPort 53317 -Action Allow
```

---

## 🤝 Contributing

Contributions are welcome! Local Chat is an open-source project by **[Triode Devs](https://github.com/triode-devs)**.

```bash
# Fork and clone
git clone https://github.com/triode-devs/local-chat.git

# Create a feature branch
git checkout -b feature/my-feature

# Make your changes and test with F5

# Commit and push
git commit -m "feat: add my feature"
git push origin feature/my-feature

# Open a Pull Request
```

### Ideas for Contributions

- 📎 File sharing (drag & drop, inspired by LocalSend)
- 🔐 Message encryption (HTTPS with self-signed certificates)
- 📋 Code snippet sharing with syntax highlighting
- 🖼 Image paste support
- 🔔 VS Code notification popups for new messages
- 📌 Pinned messages
- 🔍 Message search

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

---

## 📁 Project Structure

```
local-chat/
├── extension.js              # Extension entry point & command registration
├── package.json              # Extension manifest & configuration schema
├── src/
│   ├── store.js              # Persistence (VS Code globalState + JSON file)
│   ├── chatManager.js        # Core orchestration (rooms, messages, peers)
│   ├── chatServer.js         # HTTP server receiving messages
│   ├── peerDiscovery.js      # Multicast UDP peer discovery
│   └── chatViewProvider.js   # Webview provider + IPC bridge
├── media/
│   ├── main.js               # Webview UI (vanilla JS, zero dependencies)
│   └── style.css             # Glassmorphism light/dark theme (Poppins)
├── resources/
│   ├── icon.png              # Extension icon (128×128)
│   └── chat-icon.svg         # Activity bar icon (Lucide MessageSquare)
├── .vscode/
│   └── launch.json           # F5 dev launch config
└── README.md
```

---

## 📄 License

MIT © 2026 [Triode Devs](https://github.com/triode-devs)

See [LICENSE.txt](LICENSE.txt) for details.

---

## 💙 Acknowledgements

- [LocalSend](https://github.com/localsend/localsend) — Protocol design inspiration (multicast UDP + HTTP)
- [Lucide Icons](https://lucide.dev/) — Icon design language
- [VS Code Extension API](https://code.visualstudio.com/api) — Extension platform

---

<div align="center">

**Made with ❤️ by [Triode Devs](https://github.com/triode-devs)**

_If you find this useful, please ⭐ star the repo!_

</div>
