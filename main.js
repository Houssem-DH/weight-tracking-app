// main.js
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public/favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'WeightWise',
  });

  // Remove menu completely
  Menu.setApplicationMenu(null);

  if (isDev) {
    win.loadURL('http://localhost:3000');
    // REMOVED: win.webContents.openDevTools(); // Console won't auto-open
  } else {
    win.loadFile(path.join(__dirname, 'out/index.html'));
  }

  // Optional: Add keyboard shortcut for dev tools (Ctrl+Shift+I)
  if (isDev) {
    const { globalShortcut } = require('electron');
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (win.isFocused()) {
        win.webContents.toggleDevTools();
      }
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Optional: Unregister shortcuts when app quits
app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});