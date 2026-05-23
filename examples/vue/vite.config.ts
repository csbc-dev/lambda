import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

const sharedDir = fileURLToPath(new URL("../shared", import.meta.url));

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("lambda-"),
        },
      },
    }),
  ],
  server: {
    port: 5175,
    fs: { allow: [".", sharedDir] },
    proxy: {
      "/api/lambda": "http://localhost:3000",
    },
  },
});
