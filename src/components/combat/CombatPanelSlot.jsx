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
import CombatGadgetsPanel from './panels/CombatGadgetsPanel';
import { getGadgetSlotLabel } from '../../domain/characterCalculations';

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
  gadgets: CombatGadgetsPanel,
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
  gadgets: 'Objets raciaux',
};

export default function CombatPanelSlot({ char, type, onTypeChange }) {
  const Content = PANEL_COMPONENTS[type] || CombatInventoryPanel;
  // Le libellé "gadgets" dépend du personnage (le MJ le nomme par
  // race/ascendance — voir getGadgetSlotLabel) : construit par personnage
  // plutôt qu'en constante de module, à la différence des autres panneaux.
  const panelOptions = Object.keys(PANEL_COMPONENTS).map((key) => ({
    value: key,
    label: key === 'gadgets' ? getGadgetSlotLabel(char) : PANEL_LABELS[key],
  }));

  return (
    <div className="combat-panel">
      <div className="combat-panel-header">
        <CombatSelect value={type} options={panelOptions} onChange={onTypeChange} />
      </div>
      <Content char={char} />
    </div>
  );
}
