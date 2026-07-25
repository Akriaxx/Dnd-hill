import { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useCharacterStore } from '../../../store/characterStore';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal } from '../AdminShared';
import { STAT_KEYS } from '../adminUtils';
import { getResourceData, getStatBreakdown, signed, statLabel } from '../../../domain/characterCalculations';

function CharacterReviewCard({ char, onApprove, onReject }) {
  const [open, setOpen] = useState(true);
  const { customCaracteristiques } = useAdminStore();
  const caracsDef = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const caracDefsMap = Object.fromEntries(caracsDef.map((c) => [c.cle, c]));
  const resources = getResourceData(char);
  const stats = caracsDef.map((c) => ({
    ...getStatBreakdown(char, c.cle, caracDefsMap),
    label: c.nom,
  }));
  const aptitudes = Object.entries(char.aptitudes || {})
    .map(([name, value]) => ({
      name,
      plusOne: Boolean(value?.m1),
      plusTwo: Boolean(value?.m2),
    }))
    .filter((item) => item.plusOne || item.plusTwo);
  const identityRows = [
    ['Joueur', char.requestedByName || char.requestedBy || '-'],
    ['Nom', char.nom || '-'],
    ['Race', char.race || '-'],
    ['Ascendance', char.ascendance || '-'],
    ['Origine', char.origine || '-'],
    ['Historique', char.historique || '-'],
    ['Classe', char.classe || '-'],
    ['Niveau', char.niveau ?? 0],
    ['Sexe', char.sexe || '-'],
    ['Âge', char.age || '-'],
    ['Taille', char.taille || '-'],
    ['Poids', char.poids || '-'],
  ];
  const statClass = (value) => (value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : '');
  const renderNumber = (value, { sign = false, zero = false } = {}) => {
    const n = Number(value) || 0;
    if (!zero && n === 0) return '';
    return sign ? signed(n) : n;
  };

  return (
    <article className={`character-review-card${open ? ' is-open' : ''}`}>
      <header className="character-review-head">
        <div>
          <span className="admin-custom-badge">✦</span>
          <h3>{char.nom || 'Fiche sans nom'}</h3>
          <p>
            {char.classe || 'Classe inconnue'} · {char.race || 'Race inconnue'} · proposée le{' '}
            {char.submittedAt ? new Date(char.submittedAt).toLocaleString('fr-FR') : '-'}
          </p>
        </div>
        <div className="character-review-head-actions">
          <span className="admin-card-badge" style={{ background: '#ff767622', color: '#ff7676', borderColor: '#ff767655' }}>En attente</span>
          <button className="admin-btn" onClick={() => setOpen((value) => !value)}>
            {open ? 'Réduire' : 'Consulter'}
          </button>
        </div>
      </header>

      {open && (
        <div className="character-review-body">
          <section className="character-review-section">
            <h4>Identité</h4>
            <div className="character-review-info-grid">
              {identityRows.map(([label, value]) => (
                <div className="character-review-info" key={label}>
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="character-review-section">
            <h4>Ressources</h4>
            <div className="character-review-resource-grid">
              {resources.map((resource) => {
                const max = Number(resource.pool?.max || 0);
                const actuel = Number(resource.pool?.actuel ?? max);
                const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((actuel / max) * 100))) : 0;
                return (
                  <div className={`character-review-resource character-review-resource--${resource.key}`} key={resource.key}>
                    <span>{resource.title}</span>
                    <strong>{actuel}<em>/ {max}</em></strong>
                    <small>Base {resource.base || 0}</small>
                    <div className="character-review-resource-bar"><div style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="character-review-section">
            <h4>Caractéristiques</h4>
            <div className="character-review-table-wrap">
              <table className="character-review-table">
                <thead>
                  <tr>
                    <th>Carac.</th>
                    <th>Base</th>
                    <th>Mod.</th>
                    <th>Bonus</th>
                    <th>Malus</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.key}>
                      <td><span>{stat.label}</span><small>{stat.key}</small></td>
                      <td>{stat.base}</td>
                      <td className={statClass(stat.mod)}>{renderNumber(stat.mod, { sign: true })}</td>
                      <td className={statClass(stat.bonus)}>{renderNumber(stat.bonus)}</td>
                      <td className={statClass(stat.malus)}>{renderNumber(stat.malus)}</td>
                      <td className={statClass(stat.total)}>{renderNumber(stat.total, { zero: true })}</td>
                    </tr>
                  ))}
                  <tr className="character-review-points-row">
                    <td colSpan="5">Points de carac.</td>
                    <td>{Number(char.pointsCarac) || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="character-review-section">
            <h4>Aptitudes de départ</h4>
            {aptitudes.length === 0 ? (
              <div className="character-review-empty">Aucune aptitude sélectionnée.</div>
            ) : (
              <div className="character-review-aptitudes">
                {aptitudes.map((aptitude) => (
                  <span key={aptitude.name}>
                    {aptitude.name}
                    <b>{aptitude.plusTwo ? '+2' : '+1'}</b>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <footer className="character-review-actions">
        <button className="race-form-save-btn" onClick={onApprove}>Valider la fiche</button>
        <button className="admin-btn admin-btn--danger" onClick={onReject}>Refuser</button>
      </footer>
    </article>
  );
}

export default function CharacterCreationReviewPanel() {
  const user = useAuthStore((s) => s.user);
  const pending = useCharacterStore((s) => s.pendingCharacterCreations || []);
  const approveCharacterCreation = useCharacterStore((s) => s.approveCharacterCreation);
  const rejectCharacterCreation = useCharacterStore((s) => s.rejectCharacterCreation);
  const [confirmReject, setConfirmReject] = useState(null);

  return (
    <div className="admin-panel">
      {confirmReject && (
        <ConfirmModal
          title="Refuser la fiche"
          message={`Refuser la création de "${confirmReject.nom}" ?`}
          dangerLabel="Refuser"
          onCancel={() => setConfirmReject(null)}
          onConfirm={() => {
            rejectCharacterCreation(confirmReject.id);
            setConfirmReject(null);
          }}
        />
      )}
      {pending.length === 0 ? (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">✓</div>
          <p className="admin-placeholder-title">Aucune fiche en attente</p>
          <p className="admin-placeholder-sub">Les demandes de création apparaîtront ici.</p>
        </div>
      ) : (
        <div className="character-review-list">
          {pending.map((char) => (
            <CharacterReviewCard
              key={char.id}
              char={char}
              onApprove={() => approveCharacterCreation(char.id, user)}
              onReject={() => setConfirmReject(char)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
