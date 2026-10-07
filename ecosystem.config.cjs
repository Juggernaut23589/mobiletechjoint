// PM2 process definition.
//
// next.config.ts reads process.env.NEXT_PUBLIC_SUPABASE_URL at import time
// (to build the image-optimizer's remotePatterns), and that import happens
// BEFORE Next's own .env-file loading runs. Letting PM2 start the app via
// a bare `npm start` means next.config.ts sees an EMPTY environment on
// that first read and silently falls back to a placeholder host, even
// though request-time server code (which reads process.env lazily, after
// Next has loaded .env.production.local) sees the real value — so pages
// render correctly but every product image 400s. Loading the .env file
// here and passing it through PM2's own `env` gives the process real
// OS-level vars before Next (or this config file) ever runs, closing
// that gap for next.config.ts and any future module with the same
// module-load-time pattern.
const fs = require("fs");
const path = require("path");

function loadEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: "mobiletechjoint-store",
      script: "npm",
      args: "start -- -p 3001",
      cwd: __dirname,
      env: loadEnvFile(path.join(__dirname, ".env.production.local")),
    },
  ],
};
