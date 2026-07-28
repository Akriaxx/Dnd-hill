// Petits bruitages ponctuels (clic, tourne-page, etc.) — contrairement à
// la musique/l'ambiance (AmbiencePlayer), ce sont des sons courts qui
// peuvent se chevaucher (plusieurs pages tournées vite), donc on clone une
// source préchargée par appel plutôt que de réutiliser un seul <audio>.
//
// Sans préchargement, le tout premier `.play()` d'un src doit d'abord le
// télécharger + décoder avant de produire du son — d'où un décalage audible
// avec l'action qui déclenche le bruitage (voir le tourne-page du
// grimoire). `preloadSfx` élimine ce coût en le payant à l'avance.
const pool = {};

function getPreloaded(src) {
  let audio = pool[src];
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
    pool[src] = audio;
  }
  return audio;
}

export function preloadSfx(src) {
  getPreloaded(src);
}

export function playSfx(src, volume = 0.5) {
  try {
    const instance = getPreloaded(src).cloneNode();
    instance.volume = volume;
    instance.play().catch(() => {});
  } catch {
    // Lecture audio indisponible (navigateur, permissions...) : silencieux.
  }
}
