import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, TagColorPicker, IdentityRowCard } from '../AdminShared';
import { asArray, slugifyKey, includesText } from '../adminUtils';

function ProvenanceModal({ initial, existingKeys, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    nom: '',
    key: '',
    tagColor: '#7ab8c8',
    description: '',
    ...(initial || {}),
    races: Array.isArray(initial?.races) ? initial.races : [],
  }));
  const [error, setError] = useState('');
  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  const save = () => {
    const nom = form.nom.trim();
    const key = form.key || slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (key !== initial?.key && existingKeys.has(key)) { setError('Cette provenance existe déjà.'); return; }
    onSave({ ...form, key, nom });
  };
  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="race-modal">
        <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? 'Modifier la provenance' : 'Nouvelle provenance'}</h3>
            <button className="admin-btn" onClick={onClose}>✕ Annuler</button>
          </div>
          <div className="race-form-body">
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Identité</div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
                </div>
                <TagColorPicker value={form.tagColor || '#7ab8c8'} onChange={(v) => set('tagColor', v)} />
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description || ''} onChange={(v) => set('description', v)} />
              </div>
            </div>
            {error && <div className="player-field-error">{error}</div>}
          </div>
          <div className="race-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="race-form-save-btn" onClick={save}>{initial ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProvenancesPanel() {
  const {
    customProvenances,
    addProvenance,
    updateProvenance,
    deleteProvenance,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProvenance, setEditingProvenance] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const entries = asArray(customProvenances);
  const filtered = entries.filter((p) =>
    includesText(p.nom, search) || includesText(p.description, search) || asArray(p.races).some((race) => includesText(race, search))
  );
  const handleSave = (payload) => {
    if (editingProvenance) updateProvenance(editingProvenance.id, payload);
    else addProvenance(payload);
    setEditingProvenance(null);
    setShowForm(false);
  };
  const requestDelete = (provenance) => {
    setConfirmDelete({
      title: 'Supprimer la provenance',
      message: `Supprimer "${provenance.nom}" ?`,
      onConfirm: () => deleteProvenance(provenance.id),
    });
  };
  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingProvenance(null); setShowForm(true); }}>
          + Nouvelle provenance
        </button>
      </div>
      {showForm && (
        <ProvenanceModal
          initial={editingProvenance}
          existingKeys={new Set(entries.map((p) => p.key))}
          onClose={() => { setEditingProvenance(null); setShowForm(false); }}
          onSave={handleSave}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={entries.length} />
      <div className="entry-card-grid">
        {filtered.length > 0 ? filtered.map((provenance, index) => (
          <IdentityRowCard
            key={provenance.key || `${provenance.nom}-${index}`}
            title={provenance.nom}
            type={asArray(provenance.races).join(' · ') || 'Toutes races'}
            description={provenance.description}
            color={provenance.tagColor || '#7ab8c8'}
            onEdit={() => { setEditingProvenance(provenance); setShowForm(true); }}
            onDelete={() => requestDelete(provenance)}
          />
        )) : (
          <div className="index-empty">Aucune provenance trouvée.</div>
        )}
      </div>
    </div>
  );
}
