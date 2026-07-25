import { useAdminStore } from '../../../store/adminStore';
import { APTITUDES } from '../../../data/gameData';
import { getAptitudeBreakdown } from '../../../domain/characterCalculations';

function normalizeKey(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

// Fallback stable — voir la note dans CombatStatsPanel.jsx : un `|| []`
// inline dans un sélecteur Zustand casse useSyncExternalStore.
const EMPTY_ARRAY = [];

// Ne liste que les aptitudes dont le total n'est pas nul — vue condensée,
// pas la liste exhaustive de l'onglet Aptitudes complet.
export default function CombatAptitudesPanel({ char }) {
  const customAptitudes = useAdminStore((s) => s.customAptitudes) || EMPTY_ARRAY;
  const hiddenAptitudeKeys = useAdminStore((s) => s.hiddenAptitudeKeys) || EMPTY_ARRAY;
  const hiddenSet = new Set(hiddenAptitudeKeys.map(normalizeKey));
  const customKeySet = new Set(customAptitudes.map((apt) => apt.key || normalizeKey(apt.nom)));

  const aptitudeList = [
    ...APTITUDES.filter((apt) => !hiddenSet.has(normalizeKey(apt.nom)) && !customKeySet.has(normalizeKey(apt.nom))),
    ...customAptitudes,
  ];

  const rows = aptitudeList
    .map((apt) => ({ nom: apt.nom, total: getAptitudeBreakdown(char, apt).total }))
    .filter((row) => row.total !== 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="combat-panel-content">
      {rows.length === 0 ? (
        <p className="combat-panel-empty">Aucune aptitude active.</p>
      ) : (
        <ul className="combat-panel-list">
          {rows.map((row) => (
            <li key={row.nom}>
              <span className="combat-panel-item-name">{row.nom}</span>
              <span className="combat-panel-item-meta">{row.total > 0 ? `+${row.total}` : row.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
