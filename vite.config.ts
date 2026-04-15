import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * sw-env-inject
 *
 * Replaces the __FIREBASE_API_KEY__ and __FIREBASE_VAPID_KEY__ placeholders
 * in public/firebase-messaging-sw.js with the actual env vars so the
 * service worker never has to import.meta.env (which is unavailable in SW
 * context) and no secret is hard-coded in source.
 *
 * • Dev  : intercepts the served SW request via Connect middleware.
 * • Build: post-processes the copied file in dist/public/.
 */
function swEnvInjectPlugin(): Plugin {
  const SRC_SW = path.resolve(import.meta.dirname, "public", "firebase-messaging-sw.js");

  function inject(content: string): string {
    return content
      .replace(/__FIREBASE_API_KEY__/g,   process.env.VITE_FIREBASE_API_KEY   ?? "")
      .replace(/__FIREBASE_VAPID_KEY__/g, process.env.VITE_FIREBASE_VAPID_KEY ?? "");
  }

  return {
    name: "sw-env-inject",

    // ── Dev server: serve the processed SW on every request ────────────────
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Match both with and without base-path prefix
        if (!/firebase-messaging-sw\.js$/.test(req.url ?? "")) return next();
        try {
          const processed = inject(readFileSync(SRC_SW, "utf-8"));
          res.setHeader("Content-Type",          "application/javascript; charset=utf-8");
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Cache-Control",          "no-store");
          res.end(processed);
        } catch {
          next();
        }
      });
    },

    // ── Build: post-process the file Vite copies to dist/public ────────────
    closeBundle() {
      const distSw = path.resolve(import.meta.dirname, "dist/public/firebase-messaging-sw.js");
      if (!existsSync(distSw)) return;
      writeFileSync(distSw, inject(readFileSync(distSw, "utf-8")));
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    swEnvInjectPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Proxy socket.io WebSocket traffic to the api-server in development.
    // Set VITE_SOCKET_URL in production to point to the deployed api-server.
    proxy: {
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

