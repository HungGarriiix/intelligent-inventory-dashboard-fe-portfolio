import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  // Transform JSX/TSX via esbuild's automatic runtime (React 17+); no extra plugin needed.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
});
