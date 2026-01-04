// preload.js - FINAL FIXED (safe bridge)

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => process.versions.electron,
});
