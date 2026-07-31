import { useCharacterStore } from '../../../store/characterStore';
import { getEquippedGadgetItems } from '../../../domain/characterCalculations';

// Vue condensée des gadgets équipés : les passifs sont listés en lecture
// seule (leur bonus s'applique toujours), les actifs ont un toggle
// ON/OFF — même source de vérité (char.gadgetsActifs) que l'onglet Stats,
// utile ici pour les gadgets pertinents en dehors des combats.
export default function CombatGadgetsPanel({ char }) {
  const toggleGadgetActive = useCharacterStore((s) => s.toggleGadgetActive);
  const gadgets = getEquippedGadgetItems(char);

  return (
    <div className="combat-panel-content">
      {gadgets.length === 0 ? (
        <p className="combat-panel-empty">Aucun objet racial équipé.</p>
      ) : (
        <ul className="combat-panel-list">
          {gadgets.map((item) => {
            const isOn = Boolean(char.gadgetsActifs?.[item.id]);
            return (
              <li key={item.id}>
                <span className="combat-panel-item-name">{item.nom}</span>
                {item.actif ? (
                  <label className="gadget-toggle">
                    <input type="checkbox" className="gadget-toggle-input" checked={isOn} onChange={() => toggleGadgetActive(char.id, item.id)} />
                    <span className="gadget-toggle-track"><span className="gadget-toggle-thumb" /></span>
                    <span className="gadget-toggle-text">{isOn ? 'Actif' : 'Inactif'}</span>
                  </label>
                ) : (
                  <span className="combat-panel-item-meta">Passif</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
