// extension.js — Local Chat VS Code extension entry point
const vscode = require('vscode');
const { Store }          = require('./src/store');
const { ChatManager }    = require('./src/chatManager');
const { ChatViewProvider } = require('./src/chatViewProvider');

/** @type {Store} */        let store = null;
/** @type {ChatManager} */  let mgr   = null;

async function activate(context) {
  store = new Store(context);
  mgr   = new ChatManager(store);

  try {
    await mgr.start();
  } catch (err) {
    vscode.window.showErrorMessage(`Local Chat: failed to start — ${err.message}`);
    return;
  }

  // Webview provider
  const provider = new ChatViewProvider(context.extensionUri, mgr, store);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('localChat.chatView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // ── Commands ────────────────────────────────────────
  context.subscriptions.push(

    vscode.commands.registerCommand('localChat.openPanel', () => {
      vscode.commands.executeCommand('localChat.chatView.focus');
    }),

    vscode.commands.registerCommand('localChat.setUsername', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Your Local Chat display name',
        value: mgr.username,
        validateInput: v => v.trim().length < 2 ? 'At least 2 characters' : null,
      });
      if (name) { mgr.setUsername(name.trim()); }
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
    })
  );

  // ── Status Bar ──────────────────────────────────────
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  bar.command  = 'localChat.openPanel';
  bar.text     = '$(comment-discussion) Local Chat';
  bar.tooltip  = 'Open Local Chat';
  bar.show();
  context.subscriptions.push(bar);

  mgr.on('peers-updated', peers => {
    bar.text = peers.length
      ? `$(comment-discussion) Chat (${peers.length})`
      : '$(comment-discussion) Local Chat';
  });

  context.subscriptions.push({ dispose: () => mgr?.stop() });
}

function deactivate() { mgr?.stop(); }

module.exports = { activate, deactivate };
