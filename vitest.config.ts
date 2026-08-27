import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**', 'src/data/**', 'src/components/**'],
      exclude: ['src/components/**/*.d.ts'],
    },
  },
})
