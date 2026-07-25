import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Force React Fast Refresh à utiliser une seule instance de React
      // Évite le crash "Invalid hook call" avec Zustand sous HMR
      fastRefresh: true,
    }),
  ],
  optimizeDeps: {
    // Forcer react et react-dom à être pré-bundlés ensemble
    include: ['react', 'react-dom', 'zustand'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
