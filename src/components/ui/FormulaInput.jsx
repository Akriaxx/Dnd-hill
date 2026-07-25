import { useState } from 'react';

// "(+5)" ou "(-7)" → addition/soustraction appliquée à la valeur actuelle ;
// un nombre "brut", même signé (ex: "12", "-5"), remplace la valeur telle
// quelle plutôt que de s'additionner à l'ancienne — sans les parenthèses,
// taper "-5" puis "+5" donnerait 0 + (-5) + 5 au lieu du -5 puis +5
// littéraux attendus (le champ se comportait comme une somme qui s'empile
// silencieusement d'une saisie à l'autre).
function resolveFormula(text, base) {
  const trimmed = String(text).trim();
  const calc = trimmed.match(/^\(\s*([+-]?\d+(?:\.\d+)?)\s*\)$/);
  if (calc) {
    return base + Number(calc[1]);
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : base;
}

// Champ texte (pas type="number" : pas de flèches natives, valeur toujours
// centrable proprement) qui affiche une valeur numérique mais accepte aussi
// une formule relative entre parenthèses ("(+5)", "(-7)") — au blur ou à la
// touche Entrée, le résultat du calcul remplace ce qui a été tapé. Un nombre
// sans parenthèses est toujours une valeur absolue, jamais un ajout.
// Générique — utilisé aussi bien par le mode combat (CombatResourceGauges)
// que par la fiche de personnage (FicheResCard) pour éditer les PV/Mana/
// Endurance "actuel" sans passer par le mode édition complet.
export default function FormulaInput({ value, onCommit, className }) {
  const [draft, setDraft] = useState(String(value));
  // "Ajuster l'état pendant le rendu" (pattern recommandé par React) plutôt
  // qu'un useEffect : si `value` change depuis l'extérieur (ex: dégâts
  // appliqués ailleurs), on resynchronise le brouillon sans attendre un
  // aller-retour d'effet.
  const [trackedValue, setTrackedValue] = useState(value);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setDraft(String(value));
  }

  const commit = () => {
    const next = resolveFormula(draft, Number(value) || 0);
    onCommit(next);
    setDraft(String(next));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      title="Nombre seul = valeur fixe. (+5) ou (-5) = calcul relatif à la valeur actuelle."
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}
