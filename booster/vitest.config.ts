import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['.husky/**/*.ts'],
      exclude: ['.husky/tests/**', '**/*.d.ts', '**/*.test.ts', '**/*.test.mjs'],
      reporter: ['text', 'json', 'html'],
    },
  },
})
