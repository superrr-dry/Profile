// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "qr-vendor": ["qrcode.react"],
          utils: ["html-to-image"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["qrcode.react", "html-to-image"],
  },
});
