import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const sharedDir = fileURLToPath(new URL("../shared", import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    fs: { allow: [".", sharedDir] },
    proxy: {
      "/api/lambda": "http://localhost:3000",
    },
  },
});
