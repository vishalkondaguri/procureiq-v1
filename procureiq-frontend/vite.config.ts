import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy ALL /api traffic (HTTP + WebSocket) to FastAPI backend.
      // ws: true enables WebSocket upgrade forwarding — this means the
      // Ignite stream at /api/v1/ignite/stream will be proxied correctly
      // without the frontend needing to hard-code port 8000.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React + Router
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // MUI core
          'mui-core': ['@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
          // MUI icons (large)
          'mui-icons': ['@mui/icons-material'],
          // Charts
          'recharts': ['recharts'],
          // Data fetching
          'query': ['@tanstack/react-query', 'axios'],
        },
      },
    },
  },
});
