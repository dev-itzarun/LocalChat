// extension.js — Local Chat for VS Code & compatible environments (Antigravity, Cursor, etc.)
const vscode = require('vscode');
const { Store }            = require('./src/store');
const { ChatManager }      = require('./src/chatManager');
const { ChatViewProvider } = require('./src/chatViewProvider');
const { startAutoUpdater, checkForUpdate } = require('./src/updater');

/** @type {Store} */
let store = null;
/** @type {ChatManager} */
let mgr = null;
/** @type {vscode.WebviewPanel | null} — floating panel for environments w/o Activity Bar */
let floatingPanel = null;
/** @type {ChatViewProvider} */
let provider = null;

async function activate(context) {
  store = new Store(context);
  mgr   = new ChatManager(store);

  try {
    await mgr.start();
  } catch (err) {
    vscode.window.showErrorMessage(`Local Chat: failed to start — ${err.message}`);
    return;
  }

  // ── Activity Bar webview provider (standard VS Code) ──
  provider = new ChatViewProvider(context.extensionUri, mgr, store);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('localChat.chatView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // ── Commands ──────────────────────────────────────────
  context.subscriptions.push(

    // Primary open/toggle — tries Activity Bar first, falls back to floating panel
    vscode.commands.registerCommand('localChat.openPanel', () => {
      _openOrToggle(context);
    }),

    // Explicitly open as floating window (works in all environments)
    vscode.commands.registerCommand('localChat.openFloating', () => {
      _openFloating(context);
    }),

    // Close the floating panel if open
    vscode.commands.registerCommand('localChat.closePanel', () => {
      floatingPanel?.dispose();
    }),

    vscode.commands.registerCommand('localChat.setUsername', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Your Local Chat display name',
        value: mgr.username,
        validateInput: v => v.trim().length < 2 ? 'At least 2 characters' : null,
      });
      if (name) mgr.setUsername(name.trim());
    }),

    vscode.commands.registerCommand('localChat.changeRoom', async () => {
      const items = mgr.store.getRooms().map(r => ({
        label: `# ${r}`,
        description: r === mgr.currentRoom ? '← current' : '',
        room: r,
      }));
      items.push({ label: '+ Create new room…', room: '__new__' });
      const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Switch room' });
      if (!picked) return;
      if (picked.room === '__new__') {
        const name = await vscode.window.showInputBox({ prompt: 'Room name' });
        if (name) mgr.joinRoom(name);
      } else {
        mgr.switchRoom(picked.room);
      }
    }),

    // Manual update check
    vscode.commands.registerCommand('localChat.checkForUpdates', () => {
      checkForUpdate(context.extensionPath, false);
    })
  );

  // ── Status bar — always visible, works in ALL environments ──
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  bar.command  = 'localChat.openPanel';
  bar.text     = '$(comment-discussion) Local Chat';
  bar.tooltip  = 'Click to open Local Chat (Alt+Q)';
  bar.show();
  context.subscriptions.push(bar);

  mgr.on('peers-updated', peers => {
    const count = peers.length;
    bar.text    = count > 0
      ? `$(comment-discussion) Chat · ${count} online`
      : '$(comment-discussion) Local Chat';
  });

  mgr.on('message', msg => {
    if (msg.from !== mgr.username) {
      bar.text = `$(comment-discussion) 💬 ${msg.from}: ${msg.text.slice(0,20)}${msg.text.length>20?'…':''}`;
      setTimeout(() => {
        const count = mgr.getPeers().length;
        bar.text = count > 0 ? `$(comment-discussion) Chat · ${count} online` : '$(comment-discussion) Local Chat';
      }, 5000);
    }
  });

  // ── Auto-updater (checks GitHub Releases silently) ───
  startAutoUpdater(context.extensionPath);

  // ── Memory Monitoring ───
  const memoryInterval = setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    provider._post({ type: 'memory-update', memory: `${used.toFixed(1)} MB` });
  }, 30000);

  // Add memory to init state
  const originalPost = provider._post;
  provider._post = function(data) {
    if (data.type === 'init') {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      data.memory = `${used.toFixed(1)} MB`;
    }
    return originalPost.call(this, data);
  };

  context.subscriptions.push({ dispose: () => { 
    mgr?.stop(); 
    floatingPanel?.dispose(); 
    clearInterval(memoryInterval);
  } });
}

// ── Helpers ────────────────────────────────────────────

/**
 * Try to focus the Activity Bar sidebar first.
 * If that fails or it's already visible, toggle the floating panel.
 */
function _openOrToggle(context) {
  // If floating panel is already open, toggle it closed
  if (floatingPanel) {
    floatingPanel.dispose();
    return;
  }
  // Try activity bar focus first
  vscode.commands.executeCommand('localChat.chatView.focus').then(
    undefined,
    () => _openFloating(context) // fallback if activity bar unavailable
  );
}

/**
 * Open (or focus) the standalone floating webview panel.
 * Works in VS Code, Antigravity, Cursor, Windsurf, and other forks.
 */
function _openFloating(context) {
  if (floatingPanel) {
    floatingPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  floatingPanel = vscode.window.createWebviewPanel(
    'localChat.floating',
    '💬 Local Chat',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    }
  );

  // Reuse the same HTML and logic from the sidebar provider
  const fakeView = {
    webview: floatingPanel.webview,
    onDidChangeVisibility: floatingPanel.onDidChangeViewState,
    badge: undefined,
    description: '',
    title: 'Local Chat',
    visible: true,
  };
  provider.resolveWebviewView(fakeView, {}, { isCancellationRequested: false, onCancellationRequested: () => ({dispose:()=>{}}) });

  floatingPanel.onDidDispose(() => { floatingPanel = null; });
}

function deactivate() {
  mgr?.stop();
  floatingPanel?.dispose();
}

module.exports = { activate, deactivate };
