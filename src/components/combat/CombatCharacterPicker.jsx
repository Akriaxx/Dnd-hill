import { useEffect, useRef, useState } from 'react';

// Nom du personnage engagé en combat, cliquable : ouvre un dropdown pour
// choisir/changer de personnage à tout moment (pas d'écran de sélection à
// part, pas de retour en arrière nécessaire).
export default function CombatCharacterPicker({ characters, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = characters.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="combat-char-picker" ref={wrapRef}>
      <button type="button" className="combat-char-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="combat-char-picker-trigger-label">{selected ? selected.nom : 'Choisir un personnage'}</span>
        <span className="combat-char-picker-caret">▾</span>
      </button>
      {open && (
        <div className="combat-char-picker-dropdown">
          {characters.length === 0 ? (
            <div className="combat-char-picker-empty">Aucun personnage disponible.</div>
          ) : (
            characters.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`combat-char-picker-option${c.id === selectedId ? ' is-selected' : ''}`}
                onClick={() => { onSelect(c.id); setOpen(false); }}
              >
                {c.nom}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
