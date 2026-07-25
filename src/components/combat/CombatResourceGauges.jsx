import FormulaInput from '../ui/FormulaInput';

const RESOURCES = [
  { key: 'vie', label: 'Points de Vie' },
  { key: 'mana', label: 'Points de Mana' },
  { key: 'endu', label: "Points d'Endurance" },
];

// Bloc "Ressources" — l'actuel est éditable (dégâts/soins en cours de
// combat, borné entre 0 et max — voir CombatActivationOverlay.jsx), avec en dessous un
// bonus/malus temporaire éditable en live, remis à zéro à chaque nouveau
// combat (combatStore.startCombat). Les deux champs acceptent une formule
// relative entre parenthèses ("(+5)", "(-7)"), voir FormulaInput.
//
// Barre de progression sous chaque ressource, pour une lecture rapide en
// plus des valeurs exactes : le remplissage coloré représente actuel/max.
// Le temporaire est une jauge à part, superposée par-dessus (pas ajoutée à
// la suite) : une bande hachurée collée au bord bas de la barre, sur sa
// moitié de hauteur, qui part du bord gauche et se remplit selon temp/max —
// à 0 elle est invisible, à max/2 elle couvre la moitié de la largeur, à
// max (ou au-delà, clampé) elle couvre toute la barre. Toujours montée
// (jamais démontée/remontée) : à width:0% elle n'est déjà plus visible,
// mais un div qui apparaît/disparaît du DOM saute directement à sa largeur
// finale au montage (rien à transitionner) et disparaît net au démontage —
// il faut rester monté pour que la transition width 0%↔X% s'anime pour de
// vrai sur les allers-retours depuis/vers 0.
function ResourceBar({ resourceKey, actuel, max, temp }) {
  const basePct = max > 0 ? Math.max(0, Math.min(100, (actuel / max) * 100)) : 0;
  const tempPct = max > 0 ? Math.max(0, Math.min(100, (temp / max) * 100)) : 0;
  return (
    <div className={`combat-resource-bar combat-resource-bar--${resourceKey}`}>
      <div className="combat-resource-bar-fill" style={{ width: `${basePct}%` }} />
      <div className="combat-resource-bar-temp" style={{ width: `${tempPct}%` }} />
    </div>
  );
}

export default function CombatResourceGauges({ char, resourceTemp, onActuelChange, onTempChange }) {
  return (
    <section className="combat-block combat-resource-block">
      <h3 className="combat-block-title">Ressources</h3>
      <div className="combat-resource-cols">
        {RESOURCES.map(({ key, label }) => {
          const pool = char[key] || { actuel: 0, max: 0 };
          const temp = Number(resourceTemp?.[key] ?? 0);
          return (
            <div className="combat-resource-col" key={key}>
              <span className="combat-resource-label">{label}</span>
              <ResourceBar resourceKey={key} actuel={pool.actuel} max={pool.max} temp={temp} />
              <span className="combat-resource-value">
                <FormulaInput
                  className="combat-resource-actuel"
                  value={pool.actuel}
                  onCommit={(next) => onActuelChange(key, next)}
                />
                <span className="combat-resource-max">/ {pool.max}</span>
              </span>
              <label className="combat-resource-temp">
                <span>Temporaire</span>
                <FormulaInput
                  className="combat-resource-temp-input"
                  value={temp}
                  onCommit={(next) => onTempChange(key, next)}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
