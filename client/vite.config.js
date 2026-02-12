import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: 'all',
    proxy: {
      '/create-match': {
        target: 'http://localhost:3000',
      },
      '/join-match': {
        target: 'http://localhost:3000',
      },
      '/health': {
        target: 'http://localhost:3000',
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
