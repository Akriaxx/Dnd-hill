// Version condensée : compétences manuelles + actions du personnage
// (les compétences auto-dérivées de la race/classe/ascendance, cf.
// DetailCompetences dans CharacterListPage.jsx, ne sont pas reprises ici —
// hors scope d'une vue "condensée" pensée pour le combat).
export default function CombatCompetencesPanel({ char }) {
  const competences = char.competences || [];
  const actions = [...(char.actions || []), ...(char.actionsRapide || [])].filter((action) => action?.nom || action?.desc);

  return (
    <div className="combat-panel-content">
      {actions.length > 0 && (
        <div className="combat-panel-section">
          <h4>Actions</h4>
          <ul className="combat-panel-list">
            {actions.map((action, index) => (
              <li key={`${action.nom || 'action'}-${index}`} title={action.desc || ''}>
                <span className="combat-panel-item-name">{action.nom || 'Action'}</span>
                <span className="combat-panel-item-meta">{action.cout || '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="combat-panel-section">
        <h4>Compétences</h4>
        {competences.length === 0 ? (
          <p className="combat-panel-empty">Aucune compétence renseignée.</p>
        ) : (
          <ul className="combat-panel-list">
            {competences.map((comp, index) => (
              <li key={`${comp.nom}-${index}`} title={comp.desc || ''}>
                <span className="combat-panel-item-name">{comp.nom}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
