import { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useCharacterStore } from '../../../store/characterStore';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal } from '../AdminShared';
import { STAT_KEYS } from '../adminUtils';
import { getClassDefinition, getResourceData, getStatBreakdown, getAptitudeBreakdown, signed, statLabel } from '../../../domain/characterCalculations';

function CharacterReviewCard({ char, onApprove, onReject }) {
  const [open, setOpen] = useState(true);
  const { customCaracteristiques, customClasses, customAptitudes } = useAdminStore();
  const caracsDef = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const caracDefsMap = Object.fromEntries(caracsDef.map((c) => [c.cle, c]));
  // getClassDefinition seul ne lit que le catalogue statique (vide, voir
  // gameData.js) — même bug/fix que DetailStats côté fiche perso.
  const classBase = getClassDefinition(char) || {};
  const customClassDef = (customClasses || []).find((entry) => entry.nom === char?.classe);
  const classDef = customClassDef ? { ...classBase, ...customClassDef } : classBase;
  const resources = getResourceData(char, classDef);
  const stats = caracsDef.map((c) => ({
    ...getStatBreakdown(char, c.cle, caracDefsMap),
    label: c.nom,
  }));
  // Toutes les aptitudes du catalogue, pas seulement celles cochées +1/+2 —
  // pour que le MJ voie aussi les bonus automatiques (race, historique,
  // origine…) déjà acquis avant même tout choix du joueur, même chose que
  // sur le tableau du créateur de fiche (CreationAptitudeCategory).
  const aptitudes = (customAptitudes || [])
    .map((aptitude) => {
      const pick = char.aptitudes?.[aptitude.nom];
      const breakdown = getAptitudeBreakdown(char, aptitude);
      return {
        name: aptitude.nom,
        plusOne: Boolean(pick?.m1),
        plusTwo: Boolean(pick?.m2),
        raciaux: breakdown.raciaux,
        classes: breakdown.classes,
        historique: breakdown.historique,
        origine: breakdown.origine,
        total: breakdown.total,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
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
              <div className="character-review-empty">Aucune aptitude créée dans l'admin.</div>
            ) : (
              <div className="character-review-table-wrap">
                <table className="character-review-table">
                  <thead>
                    <tr>
                      <th>Aptitude</th>
                      <th>Raciaux</th>
                      <th>Classes</th>
                      <th>Historique</th>
                      <th>Origine</th>
                      <th>Choix</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aptitudes.map((aptitude) => (
                      <tr key={aptitude.name}>
                        <td>{aptitude.name}</td>
                        <td className={statClass(aptitude.raciaux)}>{renderNumber(aptitude.raciaux)}</td>
                        <td className={statClass(aptitude.classes)}>{renderNumber(aptitude.classes)}</td>
                        <td className={statClass(aptitude.historique)}>{renderNumber(aptitude.historique)}</td>
                        <td className={statClass(aptitude.origine)}>{renderNumber(aptitude.origine)}</td>
                        <td>{aptitude.plusTwo ? '+2' : aptitude.plusOne ? '+1' : ''}</td>
                        <td className={statClass(aptitude.total)}>{renderNumber(aptitude.total, { sign: true, zero: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
