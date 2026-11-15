/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.LAYERS_API ?? 'http://localhost:5080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin proxy: the httpOnly refresh cookie (path /api/v1/auth) just works in dev.
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: { port: 4173, proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'text', 'json-summary'],
    },
  },
});
