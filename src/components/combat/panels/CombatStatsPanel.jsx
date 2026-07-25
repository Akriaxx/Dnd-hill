import { useAdminStore } from '../../../store/adminStore';
import { useCombatStore } from '../../../store/combatStore';
import { getStatBreakdown } from '../../../domain/characterCalculations';
import FormulaInput from '../../ui/FormulaInput';

// Fallbacks stables : un `|| []`/`|| {}` inline dans un sélecteur Zustand
// renvoie une référence NEUVE à chaque appel, ce qui casse la comparaison
// par référence de useSyncExternalStore et boucle indéfiniment
// ("Maximum update depth exceeded"). Le fallback doit rester en dehors du
// sélecteur, sur une référence stable.
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Les caractéristiques sont entièrement configurables par le MJ
// (customCaracteristiques), pas figées à FOR/DEX/CON/INT/SAG/CHA — on lit
// donc la même source que l'onglet Stats de la fiche complète. Un bonus/
// malus temporaire, configurable à la volée, s'ajoute au total calculé
// (combatStore.setCaracBonus) — remis à zéro à chaque nouveau combat.
export default function CombatStatsPanel({ char }) {
  const customCaracteristiques = useAdminStore((s) => s.customCaracteristiques) || EMPTY_ARRAY;
  const caracBonus = useCombatStore((s) => s.statOverrides[char.id]?.caracBonus) || EMPTY_OBJECT;
  const setCaracBonus = useCombatStore((s) => s.setCaracBonus);

  const caracs = [...customCaracteristiques].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const caracDefsMap = Object.fromEntries(caracs.map((carac) => [carac.cle, carac]));

  return (
    <div className="combat-panel-content">
      {caracs.length === 0 ? (
        <p className="combat-panel-empty">Aucune caractéristique configurée.</p>
      ) : (
        <ul className="combat-panel-list combat-panel-list--stats">
          {caracs.map((carac) => {
            const { total } = getStatBreakdown(char, carac.cle, caracDefsMap);
            const bonus = Number(caracBonus[carac.cle] ?? 0);
            return (
              <li key={carac.cle}>
                <span className="combat-panel-item-name">{carac.nom || carac.cle}</span>
                <div className="combat-panel-item-equation">
                  <div className="combat-panel-item-figure">
                    <span className="combat-panel-item-figure-label">Base</span>
                    <span className="combat-panel-item-base">{total}</span>
                  </div>
                  <span className="combat-panel-item-op">+</span>
                  <div className="combat-panel-item-figure">
                    <span className="combat-panel-item-figure-label">Mod.</span>
                    <FormulaInput
                      className="combat-panel-item-value"
                      value={bonus}
                      onCommit={(next) => setCaracBonus(char.id, carac.cle, next)}
                    />
                  </div>
                  <span className="combat-panel-item-op">=</span>
                  <div className="combat-panel-item-figure">
                    <span className="combat-panel-item-figure-label">Total</span>
                    <span className="combat-panel-item-total">{total + bonus}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
