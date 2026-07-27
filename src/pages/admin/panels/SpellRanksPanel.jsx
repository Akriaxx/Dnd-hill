import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, MAX_SPELL_RANK, normalizeSpellRanks } from '../adminUtils';

export default function SpellRanksPanel() {
  const customSpellRanks = useAdminStore((state) => state.customSpellRanks || []);
  const customLevelRules = useAdminStore((state) => state.customLevelRules || []);
  const addSpellRank = useAdminStore((state) => state.addSpellRank);
  const updateSpellRank = useAdminStore((state) => state.updateSpellRank);
  const deleteSpellRankFromValue = useAdminStore((state) => state.deleteSpellRankFromValue);

  const sortedLevels = [...customLevelRules]
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));

  const [showForm, setShowForm] = useState(false);
  const [editingRank, setEditingRank] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    label: '', couleur: '#c8a84a', restrictLevel: '',
    maxCibles: '', porteeCiblage: '', porteeZone: '', dePrincipal: '', deSecondaire: '', deplacementArpenteur: '',
  });

  const numbersToText = (values) => asArray(values).join(', ');
  const textToNumbers = (text) => text.split(',').map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
  const textToStrings = (text) => text.split(',').map((v) => v.trim()).filter(Boolean);

  const ranks = normalizeSpellRanks(customSpellRanks);
  const nextValue = ranks.length ? Math.max(...ranks.map((r) => r.value)) + 1 : 1;
  const canCreate = nextValue <= MAX_SPELL_RANK;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  // Le niveau minimum d'un rang ne peut jamais être antérieur à celui du rang précédent :
  // on ne débloque jamais un rang avant celui qui le précède.
  const currentValue = editingRank?.value || nextValue;
  const previousRank = ranks.find((r) => r.value === currentValue - 1);
  const minAllowedLevel = previousRank?.restrictLevel != null ? Number(previousRank.restrictLevel) : 0;
  const availableLevels = sortedLevels.filter((rule) => (Number(rule.level) || 0) >= minAllowedLevel);

  const openCreate = () => {
    if (!canCreate) return;
    setEditingRank(null);
    const previous = ranks.find((r) => r.value === nextValue - 1);
    const minLevel = previous?.restrictLevel != null ? Number(previous.restrictLevel) : 0;
    const defaultLevel = sortedLevels.find((rule) => (Number(rule.level) || 0) === minLevel);
    setForm({
      label: `Rang ${nextValue}`, couleur: '#c8a84a', restrictLevel: defaultLevel ? String(defaultLevel.level) : '',
      maxCibles: '', porteeCiblage: '', porteeZone: '', dePrincipal: '', deSecondaire: '', deplacementArpenteur: '',
    });
    setShowForm(true);
  };

  const openEdit = (rank) => {
    setEditingRank(rank);
    setForm({
      label: rank.label || `Rang ${rank.value}`,
      couleur: rank.couleur || '#c8a84a',
      restrictLevel: rank.restrictLevel != null ? String(rank.restrictLevel) : '',
      maxCibles: rank.maxCibles != null ? String(rank.maxCibles) : '',
      porteeCiblage: numbersToText(rank.porteeCiblage),
      porteeZone: numbersToText(rank.porteeZone),
      dePrincipal: numbersToText(rank.dePrincipal),
      deSecondaire: numbersToText(rank.deSecondaire),
      deplacementArpenteur: numbersToText(rank.deplacementArpenteur),
    });
    setShowForm(true);
  };

  const save = () => {
    const value = editingRank?.value || nextValue;
    const label = form.label.trim() || `Rang ${value}`;
    const payload = {
      label,
      nom: label,
      key: editingRank?.key || `rank-${value}`,
      value,
      couleur: form.couleur || '#c8a84a',
      restrictLevel: form.restrictLevel !== '' ? Number(form.restrictLevel) : null,
      maxCibles: form.maxCibles !== '' ? Number(form.maxCibles) : null,
      porteeCiblage: textToStrings(form.porteeCiblage),
      porteeZone: textToStrings(form.porteeZone),
      dePrincipal: textToNumbers(form.dePrincipal),
      deSecondaire: textToNumbers(form.deSecondaire),
      deplacementArpenteur: textToNumbers(form.deplacementArpenteur),
    };
    if (editingRank) updateSpellRank(editingRank.id, payload);
    else addSpellRank(payload);
    setShowForm(false);
  };

  return (
    <div className="admin-panel spell-ranks-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--primary" type="button" disabled={!canCreate} onClick={openCreate}>
          + Rang {canCreate ? nextValue : 'max atteint'}
        </button>
      </div>

      <div className="spell-types-intro">
        <div>
          <h3>Rangs du grimoire</h3>
          <p>
            Chaque rang a une valeur numérique fixe et un niveau minimum requis (<strong>restrictLevel</strong>).
            C'est le rang qui porte la condition : "Pour accéder aux sorts de rang 2, il faut être niveau 3."
          </p>
        </div>
        <div className="spell-types-badge">{ranks.length} / {MAX_SPELL_RANK}</div>
      </div>

      <div className="spell-rank-list">
        {ranks.length === 0 && (
          <div className="index-empty">Aucun rang créé. Le premier rang aura automatiquement la valeur 1.</div>
        )}
        {ranks.map((rank) => (
          <article key={rank.id || rank.key} className="spell-rank-card" style={{ '--rank-color': rank.couleur || '#c8a84a' }}>
            <div className="spell-rank-value">{rank.value}</div>
            <div className="spell-rank-copy">
              <span>Rang de sort</span>
              <h3>{rank.label}</h3>
              {rank.restrictLevel != null
                ? <small>Niveau {rank.restrictLevel} minimum</small>
                : <small style={{ opacity: 0.5 }}>Aucune restriction de niveau</small>
              }
              <small style={{ opacity: 0.6 }}>
                {rank.maxCibles || 0} cible(s) · dé {(rank.dePrincipal || []).slice(-1)[0] || '—'} · {(rank.porteeCiblage || []).slice(-1)[0] || 'portée non définie'}
              </small>
            </div>
            <div className="spell-rank-actions">
              <button className="admin-btn" type="button" onClick={() => openEdit(rank)}>Modifier</button>
              <button
                className="admin-btn admin-btn--danger"
                type="button"
                onClick={() => setConfirmDelete({
                  title: 'Supprimer le rang',
                  message: `Supprimer "${rank.label}" ? Les rangs supérieurs seront aussi supprimés.`,
                  dangerLabel: 'Supprimer',
                  onConfirm: () => deleteSpellRankFromValue(rank.value),
                })}
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>

      {showForm && (
        <div className="index-modal-backdrop">
          <div className="index-modal spell-rank-builder">
            <div className="index-modal-header">
              <h3>{editingRank ? 'Modifier le rang' : `Nouveau rang ${nextValue}`}</h3>
              <button className="admin-btn" type="button" onClick={() => setShowForm(false)}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="spell-rank-locked-value">
                <span>Valeur système</span>
                <strong>{editingRank?.value || nextValue}</strong>
              </div>
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom affiché</label>
                  <input
                    value={form.label}
                    onChange={(e) => set('label', e.target.value)}
                    placeholder={`Rang ${editingRank?.value || nextValue}`}
                  />
                </div>
                <TagColorPicker value={form.couleur} onChange={(v) => set('couleur', v)} />
              </div>
              <div className="comp-form-field">
                <label>Niveau minimum (restrictLevel)</label>
                {sortedLevels.length === 0 ? (
                  <p style={{ opacity: 0.6, fontSize: 13, margin: 0 }}>
                    Aucun niveau défini — créez des niveaux dans l'onglet "Leveling" d'abord.
                  </p>
                ) : (
                  <select
                    value={form.restrictLevel}
                    onChange={(e) => set('restrictLevel', e.target.value)}
                  >
                    {minAllowedLevel === 0 && <option value="">Aucune restriction</option>}
                    {availableLevels.map((rule) => (
                      <option key={rule.id || rule.level} value={String(rule.level)}>
                        {rule.title || `Niveau ${rule.level}`}
                      </option>
                    ))}
                  </select>
                )}
                <small style={{ opacity: 0.6 }}>
                  {previousRank
                    ? `${previousRank.label} se débloque au niveau ${minAllowedLevel} — ce rang ne peut être accessible qu'à partir de ce niveau ou plus tard.`
                    : 'Niveau requis pour accéder aux sorts de ce rang. Laisser vide = accessible dès le départ.'}
                </small>
              </div>

              <div className="comp-form-field">
                <label>Cibles maximum (mode Ciblage)</label>
                <input type="number" min="0" value={form.maxCibles} onChange={(e) => set('maxCibles', e.target.value)} />
              </div>
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Portées débloquées — Ciblage</label>
                  <input value={form.porteeCiblage} onChange={(e) => set('porteeCiblage', e.target.value)} placeholder="0 - 1, 0 - 5, 0 - 10" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Portées débloquées — Zone</label>
                  <input value={form.porteeZone} onChange={(e) => set('porteeZone', e.target.value)} placeholder="5 - 10, 5 - 15" />
                </div>
              </div>
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Dé principal débloqué</label>
                  <input value={form.dePrincipal} onChange={(e) => set('dePrincipal', e.target.value)} placeholder="1, 2, 3" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Dé secondaire débloqué</label>
                  <input value={form.deSecondaire} onChange={(e) => set('deSecondaire', e.target.value)} placeholder="2, 4, 6" />
                </div>
              </div>
              <div className="comp-form-field">
                <label>Déplacement débloqué (sorts Arpenteur)</label>
                <input value={form.deplacementArpenteur} onChange={(e) => set('deplacementArpenteur', e.target.value)} placeholder="1, 2, 3" />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" type="button" onClick={() => setShowForm(false)}>Annuler</button>
                <button className="race-form-save-btn" type="button" onClick={save}>
                  {editingRank ? 'Enregistrer' : 'Créer le rang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel={confirmDelete.dangerLabel}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
