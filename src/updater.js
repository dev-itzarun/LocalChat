// src/updater.js — Self-update from GitHub Releases
// Downloads VSIX, extracts it, copies files into the live extension folder, prompts reload.
// Works for VS Code, Antigravity, Cursor, and any VS Code fork.

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const { execFile, spawn } = require('child_process');
const vscode   = require('vscode');

const REPO           = 'triode-devs/local-chat';
const API_URL        = `https://api.github.com/repos/${REPO}/releases/latest`;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const CURRENT_VER    = require('../package.json').version;

// ── Semver compare ────────────────────────────────────
function isNewer(latest, current) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  return la > ca || (la === ca && lb > cb) || (la === ca && lb === cb && lc > cc);
}

// ── HTTP(S) GET helper ────────────────────────────────
function get(url, opts = {}, _redirects = 0) {
  return new Promise((resolve, reject) => {
    if (_redirects > 5) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { ...opts, headers: { 'User-Agent': 'local-chat-updater', ...(opts.headers||{}) } }, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, opts, _redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Download file to disk ─────────────────────────────
function download(url, dest, _redirects = 0) {
  return new Promise((resolve, reject) => {
    if (_redirects > 5) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'local-chat-updater' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest, _redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('download timeout')); });
  });
}

// ── Extract VSIX → target dir (Windows PowerShell / unix unzip) ───
function extractVsix(vsixPath, destDir) {
  return new Promise((resolve, reject) => {
    // VSIX is a ZIP. On Windows use Expand-Archive; on Unix use unzip.
    if (os.platform() === 'win32') {
      const ps = spawn('powershell.exe', [
        '-NoProfile', '-Command',
        `Expand-Archive -Force -LiteralPath '${vsixPath}' -DestinationPath '${destDir}'`
      ]);
      ps.on('close', code => code === 0 ? resolve() : reject(new Error(`Expand-Archive failed: ${code}`)));
      ps.on('error', reject);
    } else {
      execFile('unzip', ['-o', vsixPath, '-d', destDir], (err) => err ? reject(err) : resolve());
    }
  });
}

// ── Copy directory recursively ────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ── Main update check ─────────────────────────────────
async function checkForUpdate(extensionPath, silent = false) {
  try {
    const { status, body } = await get(API_URL);
    if (status !== 200) return;

    const release   = JSON.parse(body);
    const latest    = release.tag_name?.replace(/^v/, '');
    if (!latest || !isNewer(latest, CURRENT_VER)) {
      if (!silent) vscode.window.showInformationMessage(`Local Chat v${CURRENT_VER} is up to date.`);
      return;
    }

    // Find VSIX asset
    const asset = release.assets?.find(a => a.name.endsWith('.vsix'));
    if (!asset) return;

    const action = await vscode.window.showInformationMessage(
      `🆕 Local Chat v${latest} is available (you have v${CURRENT_VER})`,
      'Update Now', 'Later'
    );
    if (action !== 'Update Now') return;

    await installUpdate(asset.browser_download_url, extensionPath, latest);
  } catch (err) {
    if (!silent) vscode.window.showErrorMessage(`Local Chat update check failed: ${err.message}`);
  }
}

async function installUpdate(downloadUrl, extensionPath, newVersion) {
  const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'local-chat-update-'));
  const vsixPath = path.join(tmpDir, `local-chat-${newVersion}.vsix`);
  const extractTo = path.join(tmpDir, 'extracted');

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Local Chat: Updating…', cancellable: false },
      async progress => {
        progress.report({ message: 'Downloading…', increment: 10 });
        await download(downloadUrl, vsixPath);

        progress.report({ message: 'Extracting…', increment: 40 });
        await extractVsix(vsixPath, extractTo);

        progress.report({ message: 'Installing…', increment: 40 });

        // VSIX structure: extracted/extension/ contains the actual files
        const srcExtension = path.join(extractTo, 'extension');
        if (!fs.existsSync(srcExtension)) throw new Error('Unexpected VSIX structure');

        // Copy into current extension folder (replaces files in place)
        copyDir(srcExtension, extensionPath);

        // Update package.json version marker so we don't re-update
        const pkgPath = path.join(extensionPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          pkg.version = newVersion;
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        }

        progress.report({ message: 'Done!', increment: 10 });
      }
    );

    const reload = await vscode.window.showInformationMessage(
      `✅ Local Chat updated to v${newVersion}! Reload to apply.`,
      'Reload Now'
    );
    if (reload === 'Reload Now') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  } finally {
    // Clean up temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ── Start auto-update scheduler ───────────────────────
function startAutoUpdater(extensionPath) {
  // Check silently on startup after 5s delay (don't block activation)
  setTimeout(() => checkForUpdate(extensionPath, true), 5000);
  // Then every 4 hours
  setInterval(() => checkForUpdate(extensionPath, true), CHECK_INTERVAL);
}

module.exports = { startAutoUpdater, checkForUpdate };
