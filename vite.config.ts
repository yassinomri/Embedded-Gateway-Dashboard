import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Address of the gateway used by the dev server proxy.
// Override with: GATEWAY_URL=http://192.168.1.1 npm run dev
const gatewayUrl = process.env.GATEWAY_URL ?? "http://192.168.1.2";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3000, // Changed from 8080 to avoid conflict with uhttpd
    proxy: {
      // ubus JSON-RPC (rpcd): authentication and migrated endpoints
      "/ubus": {
        target: gatewayUrl,
        changeOrigin: true,
        secure: false,
      },
      // Legacy CGI endpoints that are not migrated yet
      "/cgi-bin": {
        target: gatewayUrl,
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
