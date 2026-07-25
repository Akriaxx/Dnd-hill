import { useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import {
  EQUIP_SLOTS_DEF, SlotIcon, getItemEquipType, slotAcceptsItem,
} from '../../equip/EquipementPanel';

// Version condensée du panneau d'équipement complet (voir EquipementPanel) :
// pas assez de place dans une colonne P1/P2/P3 pour le glisser-déposer, donc
// cliquer sur un emplacement ouvre plutôt un inventaire filtré aux seuls
// objets compatibles avec ce slot (ex: cliquer "Casque" ne montre que les
// casques de l'inventaire), plutôt que de faire glisser un objet dessus.
export default function CombatEquipementPanel({ char }) {
  const equipFromInventory = useCharacterStore((s) => s.equipFromInventory);
  const unequipToInventory = useCharacterStore((s) => s.unequipToInventory);
  const [openSlotKey, setOpenSlotKey] = useState(null);

  const equip = char.equipement || {};
  const inventaire = char.inventaire || [];
  const activeSlotDef = EQUIP_SLOTS_DEF.find((slotDef) => slotDef.key === openSlotKey) || null;
  const equippedInActiveSlot = activeSlotDef ? equip[activeSlotDef.key] : null;
  const slotItems = activeSlotDef
    ? inventaire.filter((item) => slotAcceptsItem(activeSlotDef, item))
    : [];

  const closePicker = () => setOpenSlotKey(null);

  return (
    <div className="combat-panel-content">
      <ul className="combat-equip-slots">
        {EQUIP_SLOTS_DEF.map((slotDef) => {
          const equipped = equip[slotDef.key];
          return (
            <li key={slotDef.key}>
              <button
                type="button"
                className={`combat-equip-slot${equipped ? ' is-filled' : ''}`}
                onClick={() => setOpenSlotKey(slotDef.key)}
              >
                <span className="combat-equip-slot-icon"><SlotIcon slotKey={slotDef.key} /></span>
                <span className="combat-equip-slot-text">
                  <span className="combat-equip-slot-label">{slotDef.label}</span>
                  <span className="combat-equip-slot-item">{equipped ? equipped.nom : 'Vide'}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {activeSlotDef && (
        <div className="index-modal-backdrop" onClick={(event) => event.target === event.currentTarget && closePicker()}>
          <div className="index-confirm-modal">
            <div className="index-modal-header">
              <h3>{activeSlotDef.label}</h3>
              <button className="admin-btn" onClick={closePicker}>✕ Fermer</button>
            </div>
            <div className="combat-equip-picker-body">
              {equippedInActiveSlot && (
                <button
                  type="button"
                  className="combat-equip-picker-item is-equipped"
                  onClick={() => { unequipToInventory(char.id, activeSlotDef.key); closePicker(); }}
                >
                  <span className="combat-equip-picker-item-name">{equippedInActiveSlot.nom}</span>
                  <span className="combat-equip-picker-item-action">Retirer</span>
                </button>
              )}
              {slotItems.length === 0 ? (
                <p className="combat-panel-empty">Aucun objet compatible dans l'inventaire.</p>
              ) : (
                slotItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="combat-equip-picker-item"
                    onClick={() => {
                      equipFromInventory(char.id, activeSlotDef.key, {
                        ...item,
                        type: getItemEquipType(item),
                        equipSlot: activeSlotDef.key,
                      });
                      closePicker();
                    }}
                  >
                    <span className="combat-equip-picker-item-name">{item.nom}</span>
                    <span className="combat-equip-picker-item-action">Équiper</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
