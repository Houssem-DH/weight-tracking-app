const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function fixStandalone() {
  const rootDir = process.cwd();
  const standaloneDir = path.join(rootDir, ".next", "standalone");
  const staticDir = path.join(rootDir, ".next", "static");
  const publicDir = path.join(rootDir, "public");

  if (!fs.existsSync(standaloneDir)) {
    console.error("❌ Standalone folder not found. Did you run next build?");
    process.exit(1);
  }

  console.log("✅ Fixing Next.js standalone output for Electron...");

  console.log("📌 Copying public folder...");
  copyRecursive(publicDir, path.join(standaloneDir, "public"));

  console.log("📌 Copying static folder...");
  copyRecursive(staticDir, path.join(standaloneDir, ".next", "static"));

  console.log("✅ Standalone output fixed successfully.");
}

fixStandalone();
