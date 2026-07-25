import { Fragment } from 'react';
import { getCombatStats } from '../../domain/characterCalculations';
import FormulaInput from '../ui/FormulaInput';

// `sourceLabel` = label exact renvoyé par getCombatStats (source de vérité
// pour le calcul, cf. domain/characterCalculations — c'est la même fonction
// qui alimente l'onglet "Stats de combat" de la fiche complète) ; `label` =
// libellé complet affiché ici, plutôt que les abréviations internes du
// moteur ("Att."/"Déf."). `key` = clé utilisée dans combatStore.statOverrides.
// Trois rangées : attaque à gauche, défense à droite. Initiative en dernier,
// alignée sur la colonne "attaque" (voir CombatStatBlock plus bas).
const STAT_ROWS = [
  [
    { key: 'atkPhysique', sourceLabel: 'Att. physique', label: 'Attaque Physique' },
    { key: 'defPhysique', sourceLabel: 'Déf. physique', label: 'Défense Physique' },
  ],
  [
    { key: 'atkDistance', sourceLabel: 'Att. distance', label: 'Attaque à Distance' },
    { key: 'defMagique', sourceLabel: 'Déf. magique', label: 'Défense Magique' },
  ],
  [
    { key: 'atkMagique', sourceLabel: 'Att. magique', label: 'Attaque Magique' },
    { key: 'esquive', sourceLabel: 'Esquive', label: 'Esquive' },
  ],
];

const INITIATIVE_ROW = { key: 'initiative', sourceLabel: 'Initiative', label: 'Initiative' };

// Bloc "Stats de combat" — attaque à gauche, défense à droite, Initiative
// en pied, sur toute la largeur (une seule stat, pas une paire — elle ne
// partage pas la grille attaque/défense). Chaque stat montre Base + Bonus
// = Total : Base (calculée depuis la fiche) et Total (Base + Bonus) en
// lecture seule, seul Bonus est éditable en live (combatStore.setStatBonus).
//
// Une SEULE grille CSS pour les 3 rangées attaque/défense (pas une grille
// par cellule) : c'est ce qui garantit que les colonnes Base/Bonus/Total
// s'alignent verticalement d'une ligne à l'autre, peu importe la longueur
// du nom de la stat juste à côté.
export default function CombatStatBlock({ char, statBonus, onBonusChange }) {
  const computed = getCombatStats(char);
  const byLabel = Object.fromEntries(computed.map((row) => [row.label, row]));

  const renderFigures = (base, bonus, key) => (
    <>
      <div className="combat-stat-figure">
        <span className="combat-stat-figure-label">Base</span>
        <span className="combat-stat-base">{base}</span>
      </div>
      <div className="combat-stat-figure">
        <span className="combat-stat-figure-label">Mod.</span>
        <FormulaInput
          className="combat-stat-bonus"
          value={bonus}
          onCommit={(next) => onBonusChange(key, next)}
        />
      </div>
      <div className="combat-stat-figure">
        <span className="combat-stat-figure-label">Total</span>
        <span className="combat-stat-total">{base + bonus}</span>
      </div>
    </>
  );

  const renderGroup = ({ key, sourceLabel, label }) => {
    const base = byLabel[sourceLabel]?.total ?? 0;
    const bonus = Number(statBonus?.[key] ?? 0);
    return (
      <Fragment key={key}>
        <span className="combat-stat-name">{label}</span>
        {renderFigures(base, bonus, key)}
      </Fragment>
    );
  };

  const initiativeBase = byLabel[INITIATIVE_ROW.sourceLabel]?.total ?? 0;
  const initiativeBonus = Number(statBonus?.[INITIATIVE_ROW.key] ?? 0);

  return (
    <section className="combat-block combat-stat-block">
      <h3 className="combat-block-title">Stats de combat</h3>
      <div className="combat-stat-grid">
        {STAT_ROWS.map(([atk, def], index) => (
          <Fragment key={atk.key}>
            {renderGroup(atk)}
            {renderGroup(def)}
            {/* Pas de séparateur après la dernière rangée : Initiative a
                déjà sa propre bordure juste en dessous, inutile d'en avoir deux. */}
            {index < STAT_ROWS.length - 1 && <div className="combat-stat-divider" />}
          </Fragment>
        ))}
      </div>
      <div className="combat-stat-initiative">
        <span className="combat-stat-name">{INITIATIVE_ROW.label}</span>
        <div className="combat-stat-initiative-figures">
          {renderFigures(initiativeBase, initiativeBonus, INITIATIVE_ROW.key)}
        </div>
      </div>
    </section>
  );
}
