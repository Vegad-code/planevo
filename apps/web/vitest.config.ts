import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/*', 'scratch/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/auth/rateLimit.ts',
        'lib/auth/ip-rate-limit.ts',
        'lib/auth/plan-types.ts',
        'lib/auth/owner-emails.ts',
        'lib/crypto.ts',
        'lib/api/schemas.ts',
        'lib/api/route-helpers.ts',
        'lib/canvas/url-validation.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 59,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
