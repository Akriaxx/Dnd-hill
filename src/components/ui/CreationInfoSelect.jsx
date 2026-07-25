import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Select personnalisé : survoler une option affiche sa description dans une
// bulle flottante après un court délai (purement animé en CSS, voir _select.scss).
export default function CreationInfoSelect({ value, options, placeholder = '—', allowEmpty = false, tooltipSide = 'right', disabled = false, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const allOptions = allowEmpty
    ? [{ value: '', label: placeholder, kind: 'empty', description: '' }, ...options]
    : options;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  // Le menu fermé ne doit plus afficher d'infobulle — dérivé au rendu plutôt
  // que via un effect, pour éviter un setState synchrone dans un effect.
  const activeHoveredInfo = open ? hoveredInfo : null;

  const showOptionInfo = (event, option) => {
    if (option.kind === 'empty') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(420, Math.max(300, Math.round(window.innerWidth * 0.3)));
    const prefersLeft = tooltipSide === 'left' || rect.right + width + 28 > window.innerWidth;
    const left = prefersLeft
      ? Math.max(14, rect.left - width - 14)
      : Math.min(window.innerWidth - width - 14, rect.right + 14);
    const top = Math.min(
      window.innerHeight - 24,
      Math.max(24, rect.top + rect.height / 2),
    );
    setHoveredInfo({
      option,
      left,
      top,
      width,
      side: prefersLeft ? 'left' : 'right',
    });
  };

  const tooltip = activeHoveredInfo ? createPortal(
    <div
      className={`creation-info-floating-tooltip creation-info-floating-tooltip--${activeHoveredInfo.side}`}
      style={{
        '--info-option-color': activeHoveredInfo.option.color || '#c8a84a',
        left: `${activeHoveredInfo.left}px`,
        top: `${activeHoveredInfo.top}px`,
        width: `${activeHoveredInfo.width}px`,
      }}
    >
      <span className="creation-info-tooltip-kicker">{activeHoveredInfo.option.kind}</span>
      <strong>{activeHoveredInfo.option.label}</strong>
      {activeHoveredInfo.option.meta?.length > 0 && (
        <span className="creation-info-tooltip-meta">
          {activeHoveredInfo.option.meta.map((meta) => <em key={meta}>{meta}</em>)}
        </span>
      )}
      <span className="creation-info-tooltip-sep" />
      <span className="creation-info-tooltip-desc">
        {activeHoveredInfo.option.description || 'Aucune description renseignée.'}
      </span>
      {activeHoveredInfo.option.details?.length > 0 && (
        <span className="creation-info-tooltip-details">
          {activeHoveredInfo.option.details.map((section) => (
            <span className="creation-info-tooltip-detail" key={section.label}>
              <b>{section.label}</b>
              <span>
                {section.values.map((value) => <em key={value}>{value}</em>)}
              </span>
            </span>
          ))}
        </span>
      )}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div ref={rootRef} className={`creation-info-select creation-info-select--tip-${tooltipSide}${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
        <button
          type="button"
          className="creation-info-select-trigger"
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
        >
          <span>{selected?.label || placeholder}</span>
          <b>⌄</b>
        </button>

        {open && (
          <div className="creation-info-select-menu">
            {allOptions.map((option) => (
              <button
                type="button"
                key={option.value || '__empty'}
                className={`creation-info-option${option.value === value ? ' is-selected' : ''}${option.kind === 'empty' ? ' is-empty' : ''}`}
                style={{ '--info-option-color': option.color || '#c8a84a' }}
                onPointerEnter={(event) => showOptionInfo(event, option)}
                onPointerMove={(event) => showOptionInfo(event, option)}
                onPointerLeave={() => setHoveredInfo(null)}
                onClick={() => {
                  onChange(option.value);
                  setHoveredInfo(null);
                  setOpen(false);
                }}
              >
                <span className="creation-info-option-label">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {tooltip}
    </>
  );
}
