/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: [],
    globals: false,
    // pool: 'threads', // default
    projects: [
      {
        extends: true,
        test: {
          name: 'hooks',
          include: ['src/hooks/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/lib/**'],
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
          exclude: ['src/lib/**'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['src/components/__tests__/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'pages',
          include: ['src/pages/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/lib/**'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['src/pages/__tests__/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'domain',
          include: ['src/domain/**/*.{test,spec}.{ts,tsx}'],
          environment: 'node',
          globals: false,
        },
      },
      ],
  },
})
