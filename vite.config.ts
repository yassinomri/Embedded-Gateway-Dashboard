import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000, // Changed from 8080 to avoid conflict with uhttpd
    proxy: {
      "/cgi-bin": {
        target: "http://192.168.1.2",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Preserve /cgi-bin/network.cgi
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
