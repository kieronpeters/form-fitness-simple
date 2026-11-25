import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: [
        '**/*.tmpdir/**',
        '**/.playwright*/**',
        '**/.tmp/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/e2e/**',
      ],
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
