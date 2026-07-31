import { useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { SmartText } from '../../admin/SmartDescEditor';

const RESOURCE_EFFECT_KEYS = { vitalite: 'vie', mana: 'mana', endurance: 'endu' };
const RESOURCE_EFFECT_LABELS = { vie: 'Vitalité', mana: 'Mana', endu: 'Endurance' };

// item.useResource (voir ItemPanel.jsx) ne fixe QUE la ressource visée, pas
// de montant : le joueur saisit lui-même le résultat de son jet dans le
// pop-up d'utilisation, voir applyItemUse ci-dessous.
const getItemResourceTarget = (item) => RESOURCE_EFFECT_KEYS[item.useResource] || null;

export default function CombatInventoryPanel({ char }) {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [useItemPopup, setUseItemPopup] = useState(null); // { item, value }
  const inventaire = char.inventaire || [];

  // Consomme l'item et, si une ressource est visée, ajoute `rolledValue` (le
  // résultat que le joueur a lui-même noté dans le pop-up) à sa valeur
  // actuelle — jamais un montant fixé côté admin, voir getItemResourceTarget.
  const applyItemUse = (item, rolledValue) => {
    const resourceKey = getItemResourceTarget(item);
    const resourcePatch = {};
    if (resourceKey && String(rolledValue).trim() !== '') {
      const amount = Number(rolledValue) || 0;
      const current = char[resourceKey] ?? { actuel: 0, max: 0 };
      resourcePatch[resourceKey] = {
        ...current,
        actuel: Math.max(0, Math.min(current.max, current.actuel + amount)),
      };
    }

    const remainingQte = (item.qte ?? 1) - 1;
    const newInventaire = remainingQte > 0
      ? inventaire.map((i) => (i.id === item.id ? { ...i, qte: remainingQte } : i))
      : inventaire.filter((i) => i.id !== item.id);

    updateCharacter(char.id, { ...resourcePatch, inventaire: newInventaire });
  };

  // Un item sans ressource visée ni texte narratif se consomme directement ;
  // sinon on ouvre le pop-up (texte + éventuelle saisie du jet) et c'est sa
  // confirmation qui déclenche applyItemUse.
  const startUseItem = (item) => {
    if (!getItemResourceTarget(item) && !item.useText) { applyItemUse(item, null); return; }
    setUseItemPopup({ item, value: '' });
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
                <button type="button" className="combat-panel-item-action" onClick={() => startUseItem(item)}>
                  Utiliser
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {useItemPopup && (
        <div className="index-modal-backdrop">
          <div className="index-confirm-modal">
            <div className="index-modal-header">
              <h3>{useItemPopup.item.nom}</h3>
              <button className="admin-btn" onClick={() => setUseItemPopup(null)}>✕ Fermer</button>
            </div>
            <div className="index-confirm-body">
              {useItemPopup.item.useText && <SmartText text={useItemPopup.item.useText} />}
              {getItemResourceTarget(useItemPopup.item) && (
                <div className="comp-form-field" style={{ marginTop: '12px' }}>
                  <label>{RESOURCE_EFFECT_LABELS[getItemResourceTarget(useItemPopup.item)]} obtenue — résultat de ton jet</label>
                  <input
                    type="number"
                    autoFocus
                    value={useItemPopup.value}
                    onChange={(e) => setUseItemPopup((current) => ({ ...current, value: e.target.value }))}
                    placeholder="Ex: 7"
                  />
                </div>
              )}
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={() => setUseItemPopup(null)}>Annuler</button>
              <button
                className="race-form-save-btn"
                onClick={() => { applyItemUse(useItemPopup.item, useItemPopup.value); setUseItemPopup(null); }}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
