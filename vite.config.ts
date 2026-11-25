import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          ui: ['@radix-ui/react-tooltip', '@radix-ui/react-dialog']
        }
      }
    }
  }
}));
