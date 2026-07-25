import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Dropdown personnalisé générique, même look que CombatCharacterPicker
// (trigger + liste de boutons) — remplace les <select> natifs dans l'écran
// de combat : la liste déroulante d'un <select> natif est dessinée par
// l'OS/le navigateur et ne peut pas être restylée avec du CSS, d'où le rendu
// gris/bleu qui détonnait avec le reste du site.
//
// Rendu en portail dans <body> : les panneaux de combat (.combat-panel) ont
// `overflow: hidden` pour contenir leur propre contenu défilant, ce qui
// aurait tronqué la liste si elle restait dans le flux normal.
export default function CombatSelect({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current?.contains(event.target)) return;
      if (event.target.closest('.combat-select-dropdown')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const toggle = () => {
    if (!open && wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  };

  const dropdown = open && rect ? createPortal(
    <div
      className="combat-select-dropdown"
      style={{ top: rect.bottom + 6, left: rect.left, width: rect.width }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`combat-select-option${option.value === value ? ' is-selected' : ''}`}
          onClick={() => { onChange(option.value); setOpen(false); }}
        >
          {option.label}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`combat-select${className ? ` ${className}` : ''}${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button type="button" className="combat-select-trigger" onClick={toggle} aria-expanded={open}>
        <span>{selected ? selected.label : '—'}</span>
        <b className="combat-select-caret">▾</b>
      </button>
      {dropdown}
    </div>
  );
}
