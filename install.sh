#!/usr/bin/env bash
# install.sh — Local Chat one-click installer for macOS / Linux
# Usage: bash install.sh
# Or remote: curl -sSL https://raw.githubusercontent.com/triode-devs/local-chat/main/install.sh | bash

set -e

EXT_NAME="local-chat"
VERSION="0.1.0"
VSIX="${EXT_NAME}-${VERSION}.vsix"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${CYAN}  --> $1${NC}"; }
ok()   { echo -e "${GREEN}  [OK] $1${NC}"; }
fail() { echo -e "${RED}  [!!] $1${NC}"; exit 1; }

echo ""
echo -e "${BLUE}  ╔══════════════════════════════════╗${NC}"
echo -e "${BLUE}  ║     Local Chat — Installer       ║${NC}"
echo -e "${BLUE}  ║     by Triode Devs               ║${NC}"
echo -e "${BLUE}  ╚══════════════════════════════════╝${NC}"
echo ""

# ── Check prerequisites ──────────────────────────────────
step "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || fail "Node.js not found. Install from https://nodejs.org"
ok "Node.js $(node --version)"

command -v npm   >/dev/null 2>&1 || fail "npm not found. Reinstall Node.js from https://nodejs.org"
ok "npm $(npm --version)"

command -v code  >/dev/null 2>&1 || fail "VS Code CLI 'code' not found.\n  macOS: Open VS Code → Cmd+Shift+P → 'Shell Command: Install code in PATH'\n  Linux: VS Code should add it automatically"
ok "VS Code CLI found"

# ── Install npm deps ─────────────────────────────────────
step "Installing dependencies..."
npm install --silent
ok "Dependencies installed"

# ── Package VSIX ─────────────────────────────────────────
step "Packaging extension..."
npx vsce package --no-dependencies --allow-missing-repository --out "$VSIX" 2>/dev/null
[ -f "$VSIX" ] || fail "Package failed. Try: npx vsce package --no-dependencies"
ok "Packaged: $VSIX"

# ── Install into VS Code ──────────────────────────────────
step "Installing into VS Code..."
code --install-extension "$VSIX" --force
ok "Extension installed!"

echo ""
echo -e "${GREEN}  ✅ Local Chat is installed!${NC}"
echo -e "${YELLOW}  👉 Open VS Code and press Alt+Q to start chatting.${NC}"
echo ""
