import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_MUSIC_VOLUME = 0.3;

// Préférences musique/ambiance : purement locales au navigateur (comme
// useCombatStore), pas besoin de les synchroniser via Supabase. La musique
// démarre automatiquement à la connexion (voir authStore.login) — le clic
// sur le formulaire de login sert de geste utilisateur pour débloquer
// l'autoplay avec son côté navigateur.
export const useAudioStore = create(
  persist(
    (set) => ({
      musicOn: false,
      ambientOn: false,
      musicVolume: DEFAULT_MUSIC_VOLUME,
      toggleMusic: () => set((state) => ({ musicOn: !state.musicOn })),
      toggleAmbient: () => set((state) => ({ ambientOn: !state.ambientOn })),
      setMusicVolume: (value) => set({ musicVolume: Math.min(1, Math.max(0, value)) }),
    }),
    { name: 'dndhill-audio-v1' },
  ),
);
