import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/beiyuemiao/' : '/',
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
  },
}));
