import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    server: {
      deps: {
        // Fuerza a Vite a transformar @supabase/* para que vi.mock() pueda interceptarlo
        inline: [/@supabase\//],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/__tests__/**'],
    },
  },
})
