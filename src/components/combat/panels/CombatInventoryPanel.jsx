import { useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { SmartText } from '../../admin/SmartDescEditor';

const RESOURCE_EFFECT_KEYS = { vitalite: 'vie', mana: 'mana', endurance: 'endu' };

export default function CombatInventoryPanel({ char }) {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [useTextPopup, setUseTextPopup] = useState(null);
  const inventaire = char.inventaire || [];

  const consumeItem = (item) => {
    const simple = item.effects?.simple || {};
    const resourcePatch = {};
    Object.entries(RESOURCE_EFFECT_KEYS).forEach(([effectKey, resourceKey]) => {
      const amount = Number(simple[effectKey]) || 0;
      if (!amount) return;
      const current = char[resourceKey] ?? { actuel: 0, max: 0 };
      resourcePatch[resourceKey] = {
        ...current,
        actuel: Math.max(0, Math.min(current.max, current.actuel + amount)),
      };
    });

    const remainingQte = (item.qte ?? 1) - 1;
    const newInventaire = remainingQte > 0
      ? inventaire.map((i) => (i.id === item.id ? { ...i, qte: remainingQte } : i))
      : inventaire.filter((i) => i.id !== item.id);

    updateCharacter(char.id, { ...resourcePatch, inventaire: newInventaire });
    if (item.useText) setUseTextPopup(item);
  };

  return (
    <div className="combat-panel-content">
      {inventaire.length === 0 ? (
        <p className="combat-panel-empty">Inventaire vide.</p>
      ) : (
        <ul className="combat-panel-list">
          {inventaire.map((item) => (
            <li key={item.id}>
              <span className="combat-panel-item-name">{item.nom}</span>
              <span className="combat-panel-item-meta">×{item.qte ?? 1}</span>
              {item.usable && (
                <button type="button" className="combat-panel-item-action" onClick={() => consumeItem(item)}>
                  Utiliser
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {useTextPopup && (
        <div className="index-modal-backdrop" onClick={(event) => event.target === event.currentTarget && setUseTextPopup(null)}>
          <div className="index-confirm-modal">
            <div className="index-modal-header">
              <h3>{useTextPopup.nom}</h3>
              <button className="admin-btn" onClick={() => setUseTextPopup(null)}>✕ Fermer</button>
            </div>
            <div className="index-confirm-body">
              <SmartText text={useTextPopup.useText} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
