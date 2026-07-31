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
  server: {
    host: true,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: 5173,
    },
    // WSL2 + disque monté Windows (/mnt/c/...) : les événements natifs de
    // surveillance de fichiers (inotify) ne traversent pas fiablement la
    // frontière 9p/drvfs — Vite peut rater des modifications silencieusement
    // (aucune erreur, juste pas de HMR). Le polling contourne le problème en
    // vérifiant les fichiers à intervalle régulier au lieu d'attendre un
    // événement du système de fichiers.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
