import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://65.0.228.177:5001',
        changeOrigin: true,
      },
    },
  },
});
