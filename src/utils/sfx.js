// Petits bruitages ponctuels (clic, tourne-page, etc.) — contrairement à
// la musique/l'ambiance (AmbiencePlayer), ce sont des sons courts qui
// peuvent se chevaucher (plusieurs pages tournées vite), donc on crée une
// instance Audio par appel plutôt que de réutiliser un seul <audio>.
export function playSfx(src, volume = 0.5) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    // Lecture audio indisponible (navigateur, permissions...) : silencieux.
  }
}
