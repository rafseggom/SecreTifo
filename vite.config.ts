/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
    setupFiles: ['src/lib/__tests__/emulator-setup.ts'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'hooks',
          include: ['src/hooks/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['src/hooks/__tests__/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['src/components/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['src/components/__tests__/setup.ts'],
        },
      },
    ],
  },
})
