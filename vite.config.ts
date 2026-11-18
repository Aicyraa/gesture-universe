import { defineConfig } from 'vite'

export default defineConfig({
  // Deployed to https://<USERNAME>.github.io/gesture-universe/
  base: '/gesture-universe/',
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
