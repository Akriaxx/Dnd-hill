import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ITEM_ICONS, getItemIcon } from '../../data/itemIcons';

// Remplace le champ texte libre "Icône (nom ou URL)" — personne ne devine
// le nom exact attendu par cœur. Ici on clique une case vide, un panneau
// s'ouvre avec toutes les icônes disponibles, on clique une icône et c'est
// validé — value/onChange manipulent une clé (ex: "sword"), pas du texte.
export default function ItemIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = getItemIcon(value);

  return (
    <>
      <button
        type="button"
        className={`item-icon-picker-trigger${selected ? ' is-filled' : ''}`}
        onClick={() => setOpen(true)}
        title={selected ? selected.label : 'Choisir une icône'}
      >
        {selected ? <selected.Icon size={26} strokeWidth={1.5} /> : <span className="item-icon-picker-plus">+</span>}
      </button>

      {open && createPortal(
        <div className="index-modal-backdrop">
          <div className="index-modal item-icon-picker-modal">
            <div className="index-modal-header">
              <h3>Choisir une icône</h3>
              <button className="admin-btn" onClick={() => setOpen(false)}>✕ Fermer</button>
            </div>
            <div className="item-icon-picker-grid">
              {ITEM_ICONS.map(({ key, label, Icon }) => (
                <button
                  type="button"
                  key={key}
                  className={`item-icon-picker-option${value === key ? ' is-selected' : ''}`}
                  title={label}
                  onClick={() => { onChange(key); setOpen(false); }}
                >
                  <Icon size={22} strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {value && (
              <div className="index-modal-header item-icon-picker-footer">
                <button type="button" className="admin-btn admin-btn--danger" onClick={() => { onChange(''); setOpen(false); }}>
                  Retirer l'icône
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
