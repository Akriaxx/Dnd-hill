const ROWS = [
  ['Race', 'race'],
  ['Classe', 'classe'],
  ['Sous-classe', 'sousClasse'],
  ['Niveau', 'niveau'],
  ['Origine', 'origine'],
  ['Historique', 'historique'],
  ['Maîtrise', 'maitrise'],
];

// Résumé d'identité en lecture seule — pas de "Niveau +" ici, ce n'est pas
// le moment de monter de niveau en plein combat.
export default function CombatFichePanel({ char }) {
  return (
    <div className="combat-panel-content">
      <ul className="combat-panel-list">
        {ROWS.map(([label, field]) => (
          <li key={field}>
            <span className="combat-panel-item-name">{label}</span>
            <span className="combat-panel-item-meta">{char[field] || '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
