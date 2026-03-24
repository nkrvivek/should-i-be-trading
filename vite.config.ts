import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8321",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:8765",
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, ""),
      },
      "/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ""),
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error("Anthropic proxy error:", err.message);
          });
        },
      },
      "/exa-api": {
        target: "https://api.exa.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/exa-api/, ""),
      },
      "/finnhub-api": {
        target: "https://finnhub.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/finnhub-api/, ""),
      },
    },
  },
});