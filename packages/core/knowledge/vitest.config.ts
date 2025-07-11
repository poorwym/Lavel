import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/*.config.*',
        '**/*.test.*',
        '**/test/**'
      ]
    },
    setupFiles: ['./test/setup.ts']
  },
  resolve: {
    alias: {
      '@lavel/command-system': path.resolve(__dirname, '../../../packages/command-system'),
      '@lavel/undo-system': path.resolve(__dirname, '../../../packages/undo-system')
    }
  }
}); 