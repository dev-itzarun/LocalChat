# install.ps1 — Local Chat one-click installer for Windows
# Usage: .\install.ps1
# Or remote: irm https://raw.githubusercontent.com/triode-devs/local-chat/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$ExtName = "local-chat"
$Version = "0.1.0"

function Write-Step($msg) { Write-Host "`n  --> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  [!!] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  ╔══════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║     Local Chat — Installer       ║" -ForegroundColor Blue
Write-Host "  ║     by Triode Devs               ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ── Check prerequisites ──────────────────────────────────
Write-Step "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js not found. Install it from https://nodejs.org"
}
Write-OK "Node.js $(node --version)"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm not found. Reinstall Node.js from https://nodejs.org"
}
Write-OK "npm $(npm --version)"

if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Fail "VS Code CLI 'code' not found. In VS Code, press Ctrl+Shift+P -> 'Shell Command: Install code command in PATH'"
}
Write-OK "VS Code CLI found"

# ── Install npm deps ─────────────────────────────────────
Write-Step "Installing dependencies..."
npm install --silent
Write-OK "Dependencies installed"

# ── Package VSIX ─────────────────────────────────────────
Write-Step "Packaging extension..."
npx vsce package --no-dependencies --allow-missing-repository --out "$ExtName-$Version.vsix" 2>&1 | Out-Null
if (-not (Test-Path "$ExtName-$Version.vsix")) {
    Write-Fail "Package failed. Run manually: npx vsce package --no-dependencies"
}
Write-OK "Packaged: $ExtName-$Version.vsix"

# ── Install into VS Code ──────────────────────────────────
Write-Step "Installing into VS Code..."
code --install-extension "$ExtName-$Version.vsix" --force
Write-OK "Extension installed!"

Write-Host ""
Write-Host "  ✅ Local Chat is installed!" -ForegroundColor Green
Write-Host "  👉 Open VS Code and press Alt+Q to start chatting." -ForegroundColor Yellow
Write-Host ""
