import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/index.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@lavel/command-system': new URL('../../command-system', import.meta.url).pathname,
      '@lavel/undo-system': new URL('../../undo-system', import.meta.url).pathname
    }
  }
}); 