import { useCallback, useEffect, useRef, useState } from 'react';

// Trois étapes strictement séquentielles (chacune ne démarre qu'une fois la
// précédente terminée), rejouées à l'envers à la fermeture :
//   1. shrink   — le builder réduit en taille (flex-basis du builder)
//   2. shift    — il se décale vers la gauche (un panneau fantôme, invisible,
//                 grandit à sa droite et le pousse — flex-basis du panneau)
//   3. reveal   — le panneau apparaît en fondu (opacity du panneau)
// Un court BUFFER_MS sépare chaque étape de la suivante pour laisser sa
// transition CSS se terminer réellement à l'écran avant d'enclencher la
// suivante (sans lui, un léger décalage entre le timer JS et la fin réelle
// de la transition produisait un saut visible, notamment au démontage final).
const EFFECTS_SHRINK_MS = 340;
const EFFECTS_SHIFT_MS = 320;
const EFFECTS_FADE_MS = 280;
const EFFECTS_BUFFER_MS = 30;

export function useGameplayEffectsPanel(open) {
  const [mounted, setMounted] = useState(open);
  const [shrink, setShrink] = useState(open);
  const [shifted, setShifted] = useState(open);
  const [visible, setVisible] = useState(open);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (open) {
      timers.current.push(setTimeout(() => { setMounted(true); setShrink(true); }, 0));
      const t1 = EFFECTS_SHRINK_MS + EFFECTS_BUFFER_MS;
      const t2 = t1 + EFFECTS_SHIFT_MS + EFFECTS_BUFFER_MS;
      timers.current.push(setTimeout(() => setShifted(true), t1));
      timers.current.push(setTimeout(() => setVisible(true), t2));
    } else {
      timers.current.push(setTimeout(() => setVisible(false), 0));
      const t1 = EFFECTS_FADE_MS + EFFECTS_BUFFER_MS;
      const t2 = t1 + EFFECTS_SHIFT_MS + EFFECTS_BUFFER_MS;
      const t3 = t2 + EFFECTS_SHRINK_MS + EFFECTS_BUFFER_MS;
      timers.current.push(setTimeout(() => setShifted(false), t1));
      timers.current.push(setTimeout(() => setShrink(false), t2));
      timers.current.push(setTimeout(() => setMounted(false), t3));
    }

    return () => timers.current.forEach(clearTimeout);
  }, [open]);

  return { mounted, shrink, shifted, visible };
}

// Mesure en continu la hauteur réelle (rendue) d'un élément et la renvoie,
// pour qu'un panneau voisin puisse s'y caler exactement — utile quand les
// deux boîtes n'ont pas la même logique de hauteur (l'une a une hauteur fixe,
// l'autre s'ajuste à son contenu).
// Ref-callback plutôt que useRef+useEffect([]) : certains builders (ex.
// ItemPanel) restent montés en permanence et n'affichent leur modal que
// via un rendu conditionnel interne — un useEffect à deps vides tournerait
// une seule fois, bien avant que le nœud n'existe, et ne mesurerait jamais
// rien. Le ref-callback, lui, se redéclenche à chaque (dé)montage du nœud.
export function useMatchedHeight() {
  const [node, setNode] = useState(null);
  const [height, setHeight] = useState(null);
  const sourceRef = useCallback((el) => setNode(el), []);

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [sourceRef, height];
}
