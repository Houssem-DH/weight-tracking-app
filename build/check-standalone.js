const fs = require("fs");
const path = require("path");

const nextModulePath = path.join(
  process.cwd(),
  ".next",
  "standalone",
  "node_modules",
  "next"
);

if (!fs.existsSync(nextModulePath)) {
  console.error("❌ Standalone build is missing node_modules/next");
  console.error("👉 This usually means output:'standalone' is not enabled properly.");
  console.error("👉 Check next.config.js and run: npm run build");
  process.exit(1);
}

console.log("✅ Standalone build verified (next module exists)");
