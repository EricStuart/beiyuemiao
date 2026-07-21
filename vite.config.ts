import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
  },
});
