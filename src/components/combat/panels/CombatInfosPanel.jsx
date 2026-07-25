const ROWS = [
  ['Ascendance', 'ascendance'],
  ['Provenance', 'provenance'],
  ['Sexe', 'sexe'],
  ['Taille', 'taille'],
  ['Poids', 'poids'],
  ['Âge', 'age'],
];

export default function CombatInfosPanel({ char }) {
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
      {char.biographie && (
        <div className="combat-panel-section">
          <h4>Biographie</h4>
          <p className="combat-panel-text">{char.biographie}</p>
        </div>
      )}
    </div>
  );
}
