import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const api = process.env.NOVA_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      "/api": api,
      "/ws": { target: api, ws: true },
      "/config.js": api,
      "/interface_config.js": api,
      "/external_api.js": api,
    },
  },
});
