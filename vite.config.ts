import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process'],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) {
            return undefined
          }

          if (
            id.includes('/@ton/core/')
          ) {
            return 'ton-core'
          }

          if (id.includes('/@ton/crypto/')) {
            return 'ton-crypto'
          }

          if (id.includes('/@ton/ton/') || id.includes('/@orbs-network/ton-access/')) {
            return 'ton-client'
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/@tanstack/react-query/')
          ) {
            return 'react'
          }

          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
