import { useAdminStore } from '../../../store/adminStore';
import { getGrimoireContext } from '../../../domain/grimoireCalculations';

export default function CombatGrimoirePanel({ char }) {
  const admin = useAdminStore();
  const { spellRanks } = getGrimoireContext(char, admin);
  const rankLabel = (value) => spellRanks.find((rank) => rank.value === Number(value))?.label || `Rang ${value}`;
  const sorts = char.sorts || [];

  return (
    <div className="combat-panel-content">
      {sorts.length === 0 ? (
        <p className="combat-panel-empty">Aucun sort appris.</p>
      ) : (
        <ul className="combat-panel-list">
          {sorts.map((spell) => (
            <li key={spell.id} title={spell.description || ''}>
              <span className="combat-panel-item-name">{spell.nom}</span>
              <span className="combat-panel-item-meta">{rankLabel(spell.rankValue)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
