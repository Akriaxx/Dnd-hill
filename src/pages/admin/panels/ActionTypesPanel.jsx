import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey } from '../adminUtils';

const BLANK_ACTION_TYPE = { key: '', label: '', description: '', couleur: '#c8a84a' };

export default function ActionTypesPanel() {
  const { customActionTypes, addActionType, updateActionType, deleteActionType } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_ACTION_TYPE);

  const entries = asArray(customActionTypes);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.label.trim()) return;
    const payload = { ...form, key: form.key.trim() || slugifyKey(form.label) };
    if (editing) updateActionType(editing.id, payload);
    else addActionType(payload);
    setForm(BLANK_ACTION_TYPE);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => { setEditing(null); setForm(BLANK_ACTION_TYPE); setShowForm(true); };
  const openEdit = (entry) => { setEditing(entry); setForm({ ...BLANK_ACTION_TYPE, ...entry }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_ACTION_TYPE); };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? closeForm : openCreate}>
          {showForm ? 'Fermer' : '+ Nouveau type d\'action'}
        </button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? "Modifier le type d'action" : "Nouveau type d'action"}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.label} onChange={(e) => sf('label', e.target.value)} placeholder="Ex: Action Simple" />
                </div>
                <TagColorPicker value={form.couleur} onChange={(v) => sf('couleur', v)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => sf('description', v)} />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={closeForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!form.label.trim()} onClick={handleSave}>
                  {editing ? '💾 Enregistrer' : '✦ Créer'}
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
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      {entries.length === 0 && !showForm && (
        <p className="comp-empty">Aucun type d'action.</p>
      )}

      <div className="entry-card-grid">
        {entries.map((entry) => (
          <div key={entry.id} className="entry-card" style={{ '--entry-color': entry.couleur || '#c8a84a' }}>
            <div className="entry-card-top">
              <div className="entry-card-badge">{(entry.label || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="entry-card-body">
                <span className="entry-card-kicker">Type d'action</span>
                <h3 className="entry-card-title">{entry.label}</h3>
              </div>
            </div>
            {entry.description && (
              <div className="entry-card-desc">
                <SmartText text={entry.description} />
              </div>
            )}
            <div className="entry-card-actions">
              <button className="admin-btn" onClick={() => openEdit(entry)}>Modifier</button>
              <button
                className="admin-btn admin-btn--danger"
                onClick={() => setConfirmDelete({
                  title: "Supprimer le type d'action",
                  message: `Supprimer "${entry.label}" ?`,
                  onConfirm: () => deleteActionType(entry.id),
                })}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
