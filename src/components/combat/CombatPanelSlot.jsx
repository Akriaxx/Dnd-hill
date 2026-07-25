import CombatSelect from './CombatSelect';
import CombatFichePanel from './panels/CombatFichePanel';
import CombatInfosPanel from './panels/CombatInfosPanel';
import CombatStatsPanel from './panels/CombatStatsPanel';
import CombatAptitudesPanel from './panels/CombatAptitudesPanel';
import CombatResistancesPanel from './panels/CombatResistancesPanel';
import CombatCompetencesPanel from './panels/CombatCompetencesPanel';
import CombatGrimoirePanel from './panels/CombatGrimoirePanel';
import CombatEquipementPanel from './panels/CombatEquipementPanel';
import CombatInventoryPanel from './panels/CombatInventoryPanel';

// Même ensemble que les onglets de la fiche complète (voir DETAIL_TABS dans
// CharacterListPage.jsx) — un panneau condensé peut afficher n'importe
// lequel d'entre eux.
const PANEL_COMPONENTS = {
  fiche: CombatFichePanel,
  infos: CombatInfosPanel,
  stats: CombatStatsPanel,
  aptitudes: CombatAptitudesPanel,
  resistances: CombatResistancesPanel,
  competences: CombatCompetencesPanel,
  grimoire: CombatGrimoirePanel,
  equipement: CombatEquipementPanel,
  inventaire: CombatInventoryPanel,
};

const PANEL_LABELS = {
  fiche: 'Fiche',
  infos: 'Infos',
  stats: 'Stats',
  aptitudes: 'Aptitudes',
  resistances: 'Résistances',
  competences: 'Compétences',
  grimoire: 'Grimoire',
  equipement: 'Équipement',
  inventaire: 'Inventaire',
};

// Un panneau condensé (P1/P2/P3) : le joueur choisit librement, via le
// sélecteur en en-tête, quel contenu y afficher.
const PANEL_OPTIONS = Object.keys(PANEL_COMPONENTS).map((key) => ({ value: key, label: PANEL_LABELS[key] }));

export default function CombatPanelSlot({ char, type, onTypeChange }) {
  const Content = PANEL_COMPONENTS[type] || CombatInventoryPanel;

  return (
    <div className="combat-panel">
      <div className="combat-panel-header">
        <CombatSelect value={type} options={PANEL_OPTIONS} onChange={onTypeChange} />
      </div>
      <Content char={char} />
    </div>
  );
}
