import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  root: '.',
  base: './',

  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3799',
        changeOrigin: true,
      },
    },
  },
});
