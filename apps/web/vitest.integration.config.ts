import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['integration/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'e2e/*'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
