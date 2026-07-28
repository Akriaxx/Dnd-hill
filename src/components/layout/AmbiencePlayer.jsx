import { useEffect, useRef } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { preloadSfx } from '../../utils/sfx';
import musicTrack from '../../assets/audio/music.mp3';
import ambientTrack from '../../assets/audio/ambient.mp3';
import cardSelectSfx from '../../assets/audio/sfx-card-select.mp3';
import sheetOpenSfx from '../../assets/audio/sfx-sheet-open.mp3';
import pageTurnSfx from '../../assets/audio/sfx-page-turn.mp3';

const AMBIENT_VOLUME = 0.25;
const FADE_IN_MS = 5000;
const FADE_OUT_MS = 700;
const FADE_STEPS = 30;

// Monte le volume d'un <audio> de sa valeur actuelle vers `target` en
// douceur (utilisé pour le fade-in musique à la connexion). Le pas relit
// `getTarget()` à chaque tick pour rester juste si le slider de volume
// bouge pendant la transition.
function fadeVolume(audioEl, getTarget, duration) {
  if (!audioEl) return;
  clearInterval(audioEl._fadeInterval);
  const start = audioEl.volume;
  const steps = FADE_STEPS;
  const stepTime = duration / steps;
  let i = 0;
  audioEl._fadeInterval = setInterval(() => {
    i += 1;
    const target = getTarget();
    audioEl.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
    if (i >= steps) {
      clearInterval(audioEl._fadeInterval);
      audioEl.volume = getTarget();
    }
  }, stepTime);
}

// Monté une seule fois au-dessus des <Routes> (voir App.jsx) : les <audio>
// vivent en dehors de l'arbre des pages pour ne pas être démontés — donc
// pas redémarrés — à chaque changement de page.
export default function AmbiencePlayer() {
  const musicOn = useAudioStore((s) => s.musicOn);
  const ambientOn = useAudioStore((s) => s.ambientOn);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const musicRef = useRef(null);
  const ambientRef = useRef(null);

  useEffect(() => {
    if (ambientRef.current) ambientRef.current.volume = AMBIENT_VOLUME;
    // Précharge les bruitages ponctuels ici (montage unique, tôt dans la
    // vie de l'appli) pour que leur tout premier déclenchement ailleurs
    // (tourne-page, sélection perso...) ne subisse pas le délai de
    // téléchargement + décodage.
    [cardSelectSfx, sheetOpenSfx, pageTurnSfx].forEach(preloadSfx);
  }, []);

  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    if (musicOn) {
      el.volume = 0;
      el.play()
        .then(() => fadeVolume(el, () => useAudioStore.getState().musicVolume, FADE_IN_MS))
        .catch(() => {});
    } else {
      fadeVolume(el, () => 0, FADE_OUT_MS);
      setTimeout(() => { if (!useAudioStore.getState().musicOn) el.pause(); }, FADE_OUT_MS + 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn]);

  useEffect(() => {
    const el = musicRef.current;
    if (el && musicOn) el.volume = musicVolume;
  }, [musicVolume, musicOn]);

  useEffect(() => {
    const el = ambientRef.current;
    if (!el) return;
    if (ambientOn) el.play().catch(() => {});
    else el.pause();
  }, [ambientOn]);

  return (
    <>
      <audio ref={musicRef} src={musicTrack} loop preload="none" />
      <audio ref={ambientRef} src={ambientTrack} loop preload="none" />
    </>
  );
}
