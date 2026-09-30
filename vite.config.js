import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/media': 'http://localhost:8080',
    },
  },
  // GitHub Actions передаёт путь репозитория; локально сайт работает от корня.
  base: process.env.VITE_BASE_PATH || '/',
});
