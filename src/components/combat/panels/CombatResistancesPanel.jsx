import { useAdminStore } from '../../../store/adminStore';
import { RESISTANCES_DEF } from '../../../data/gameData';
import { getResistanceBreakdown } from '../../../domain/characterCalculations';

// Fallback stable — voir la note dans CombatStatsPanel.jsx : un `|| []`
// inline dans un sélecteur Zustand casse useSyncExternalStore.
const EMPTY_ARRAY = [];

// Ne liste que les résistances non nulles — vue condensée, pas
// l'accordéon complet par catégorie de l'onglet Résistances.
export default function CombatResistancesPanel({ char }) {
  const customResistanceCategories = useAdminStore((s) => s.customResistanceCategories) || EMPTY_ARRAY;
  const customResistanceEntries = useAdminStore((s) => s.customResistanceEntries) || EMPTY_ARRAY;

  const storeDefinitions = {};
  customResistanceCategories.forEach((cat) => {
    storeDefinitions[cat.key] = {
      label: cat.label,
      items: customResistanceEntries.filter((entry) => entry.categoryKey === cat.key).map((entry) => entry.key),
    };
  });
  const definitions = { ...RESISTANCES_DEF, ...storeDefinitions };

  const rows = Object.entries(definitions)
    .flatMap(([groupKey, group]) => (group.items || []).map((itemName) => ({
      itemName,
      total: getResistanceBreakdown(char, groupKey, itemName).total,
    })))
    .filter((row) => row.total !== 0);

  return (
    <div className="combat-panel-content">
      {rows.length === 0 ? (
        <p className="combat-panel-empty">Aucune résistance active.</p>
      ) : (
        <ul className="combat-panel-list">
          {rows.map((row) => (
            <li key={row.itemName}>
              <span className="combat-panel-item-name">{row.itemName}</span>
              <span className="combat-panel-item-meta">{row.total > 0 ? `+${row.total}` : row.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
