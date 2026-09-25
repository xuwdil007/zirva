import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Actions передаёт путь репозитория; локально сайт работает от корня.
  base: process.env.VITE_BASE_PATH || '/',
});
