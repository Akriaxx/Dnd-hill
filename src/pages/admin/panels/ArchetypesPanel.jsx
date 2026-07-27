import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor, { SmartText } from '../../../components/admin/SmartDescEditor';
import ItemIconPicker from '../../../components/admin/ItemIconPicker';
import { getItemIcon } from '../../../data/itemIcons';
import { ConfirmModal, AdminFilterPanel } from '../AdminShared';
import { asArray, includesText } from '../adminUtils';

const BLANK_ARCHETYPE = { nom: '', description: '', icone: '' };

export default function ArchetypesPanel() {
  const { customArchetypes, addArchetype, updateArchetype, deleteArchetype } = useAdminStore();
  const archetypes = asArray(customArchetypes);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_ARCHETYPE);
  const [search, setSearch] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const canSave = form.nom.trim().length > 0;

  const filtered = archetypes.filter((a) => includesText(a.nom, search) || includesText(a.description, search));

  const handleSave = () => {
    if (!canSave) return;
    if (editing) updateArchetype(editing.id, form);
    else addArchetype(form);
    setForm(BLANK_ARCHETYPE);
    setEditing(null);
    setShowForm(false);
  };

  const startCreate = () => { setEditing(null); setForm(BLANK_ARCHETYPE); setShowForm(true); };
  const startEdit = (entry) => { setEditing(entry); setForm({ ...BLANK_ARCHETYPE, ...entry }); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_ARCHETYPE); };

  const requestDelete = (entry) => {
    setConfirmDelete({
      title: "Supprimer l'archétype",
      message: `Supprimer "${entry.nom}" ?`,
      dangerLabel: 'Supprimer',
      onConfirm: () => deleteArchetype(entry.id),
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={startCreate}>+ Nouvel archétype</button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop">
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? "Modifier l'archétype" : 'Nouvel archétype'}</h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Exécuteur" />
                </div>
              </div>
              <div className="comp-form-field">
                <label>Icône</label>
                <ItemIconPicker value={form.icone} onChange={(next) => set('icone', next)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => set('description', v)} placeholder="Rôle en jeu, style attendu…" />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!canSave} onClick={handleSave}>
                  {editing ? 'Enregistrer' : 'Créer'}
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={archetypes.length} />

      {filtered.length === 0 ? (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucun archétype créé.</p>
      ) : (
        <div className="entry-card-grid">
          {filtered.map((archetype) => {
            const iconEntry = getItemIcon(archetype.icone);
            return (
              <div key={archetype.id} className="entry-card" style={{ '--entry-color': '#c8a84a' }}>
                <div className="entry-card-top">
                  <div className="entry-card-badge">
                    {iconEntry ? <iconEntry.Icon size={20} strokeWidth={1.6} /> : archetype.nom.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="entry-card-body">
                    <span className="entry-card-kicker">Archétype</span>
                    <h3 className="entry-card-title">{archetype.nom}</h3>
                  </div>
                </div>
                {archetype.description && (
                  <div className="entry-card-desc"><SmartText text={archetype.description} /></div>
                )}
                <div className="entry-card-actions">
                  <button className="admin-btn" onClick={() => startEdit(archetype)}>Modifier</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(archetype)}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
