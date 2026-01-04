const { app, BrowserWindow, Menu, Tray, nativeImage } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow = null;
let tray = null;
let isQuitting = false;
let nextServerProcess = null;

// ✅ AUTO START WITH WINDOWS (ONLY PRODUCTION)
if (!isDev) {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });
}

// ✅ Wait for Next.js server to become reachable
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve();
          } else {
            retry();
          }
        })
        .on("error", retry);
    };

    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error("Server startup timeout"));
        return;
      }
      setTimeout(check, 400);
    };

    check();
  });
}

// ✅ START Next.js standalone server
function startNextServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      ".next",
      "standalone",
      "server.js"
    );

    const standaloneCwd = path.dirname(serverPath);
    const envPath = path.join(process.resourcesPath, ".env.local");

    if (!fs.existsSync(serverPath)) {
      reject(new Error(`Standalone server not found: ${serverPath}`));
      return;
    }

    // ✅ Ensure .env.local exists
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️ .env.local not found at:", envPath);
    }

    nextServerProcess = spawn(process.execPath, [serverPath], {
      cwd: standaloneCwd,
      env: {
        ...process.env,
        PORT: 3000,
        NODE_ENV: "production",
        HOSTNAME: "localhost",
        DOTENV_CONFIG_PATH: envPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServerProcess.stdout.on("data", (data) => {
      console.log("Next.js:", data.toString().trim());
    });

    nextServerProcess.stderr.on("data", (data) => {
      console.error("Next.js error:", data.toString().trim());
    });

    nextServerProcess.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Next.js server exited early (code ${code})`));
      }
    });

    // ✅ WAIT FOR REAL HTTP READY (BEST FIX)
    waitForServer("http://localhost:3000")
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

// ✅ CREATE MAIN WINDOW
function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, "public", "logo.ico")
    : path.join(process.resourcesPath, "public", "logo.ico");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
    title: "WeightWise Pro",
    autoHideMenuBar: true,
    backgroundColor: "#0b0f1a",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
    mainWindow.once("ready-to-show", () => mainWindow.show());
  } else {
    startNextServer()
      .then(() => {
        mainWindow.loadURL("http://localhost:3000");

        // ✅ if opened by auto-login → hidden in tray
        if (!app.getLoginItemSettings().wasOpenedAtLogin) {
          mainWindow.once("ready-to-show", () => mainWindow.show());
        }
      })
      .catch((error) => {
        console.error("❌ Failed to start app:", error);
        mainWindow.loadURL(
          `data:text/html,<h1 style="font-family:sans-serif;color:white;background:#0b0f1a;padding:30px;">Startup Error</h1><p style="font-family:sans-serif;color:#ccc;padding:30px;">${error.message}</p>`
        );
        mainWindow.show();
      });
  }

  // ✅ Steam style close → tray
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on("show", () => {
    mainWindow.setSkipTaskbar(false);
  });
}

// ✅ CREATE TRAY
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, "public", "logo.ico")
    : path.join(process.resourcesPath, "public", "logo.ico");

  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  tray.setToolTip("WeightWise Pro");

  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Open WeightWise Pro",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(trayMenu);

  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ✅ READY
app.whenReady().then(() => {
  createWindow();
  createTray();
});

// ✅ keep running in background
app.on("window-all-closed", (e) => {
  e.preventDefault();
});

// ✅ Proper quit cleanup
app.on("before-quit", () => {
  isQuitting = true;
  if (nextServerProcess) nextServerProcess.kill();
});
