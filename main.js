// main.js - For Next.js standalone output
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;
let nextServerProcess = null;

function startNextServer() {
  return new Promise((resolve, reject) => {
    // Path to the unpacked standalone server
    const serverPath = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      '.next',
      'standalone',
      'server.js'
    );

    if (!fs.existsSync(serverPath)) {
      reject(new Error(`Standalone server not found at: ${serverPath}`));
      return;
    }

    console.log('Starting Next.js standalone server...');
    
    nextServerProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: 3000,
        NODE_ENV: 'production',
        HOSTNAME: 'localhost'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    nextServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js Server:', output.trim());
      
      if (output.includes('Listening on') || output.includes('Ready')) {
        console.log('✅ Next.js server is ready');
        setTimeout(resolve, 1000);
      }
    });

    nextServerProcess.stderr.on('data', (data) => {
      console.error('Next.js Server Error:', data.toString().trim());
    });

    nextServerProcess.on('error', (error) => {
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 30000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'public', 'logo.ico'),
    autoHideMenuBar: true,
    title: 'WeightWise Pro',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    // Development: connect to Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    // Production: start standalone server first
    startNextServer()
      .then(() => {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.once('ready-to-show', () => mainWindow.show());
      })
      .catch((error) => {
        console.error('❌ Failed to start app:', error);
        mainWindow.loadURL(`data:text/html,<h1>Startup Error</h1><p>${error.message}</p>`);
        mainWindow.show();
      });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 Starting WeightWise Pro');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});