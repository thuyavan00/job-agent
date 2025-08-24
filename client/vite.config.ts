import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@steps": "/src/steps",
      "@theme": "/src/theme",
      "@context": "/src/context",
      "@schema": "/src/schema",
      "@hooks": "/src/hooks",
      "@utils": "/src/utils",
      "@constants": "/src/constants",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        // 👇 send `/api/resume/...` to Nest as `/resume/...`
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
