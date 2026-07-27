import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, mergeTemporaryRows } from '../adminUtils';
import { DEFAULT_SPELL_TYPES } from '../spellDefaults';

const BLANK_SPECIALITE = { key: '', label: '', typeKey: '', description: '', couleur: '#c8a84a' };

export default function SpecialitesPanel() {
  const { customSpecialites, customSpellTypes, addSpecialite, updateSpecialite, deleteSpecialite } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_SPECIALITE);

  const entries = asArray(customSpecialites);
  const spellTypes = mergeTemporaryRows(DEFAULT_SPELL_TYPES, customSpellTypes);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const typeLabel = (typeKey) => spellTypes.find((t) => (t.key || t.id) === typeKey)?.nom || '—';

  const handleSave = () => {
    if (!form.label.trim()) return;
    const payload = { ...form, key: form.key.trim() || slugifyKey(form.label) };
    if (editing) updateSpecialite(editing.id, payload);
    else addSpecialite(payload);
    setForm(BLANK_SPECIALITE);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => { setEditing(null); setForm(BLANK_SPECIALITE); setShowForm(true); };
  const openEdit = (entry) => { setEditing(entry); setForm({ ...BLANK_SPECIALITE, ...entry }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_SPECIALITE); };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? closeForm : openCreate}>
          {showForm ? 'Fermer' : '+ Nouvelle spécialité'}
        </button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop">
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? 'Modifier la spécialité' : 'Nouvelle spécialité'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.label} onChange={(e) => sf('label', e.target.value)} placeholder="Ex: Sabotage - Malédiction" />
                </div>
                <TagColorPicker value={form.couleur} onChange={(v) => sf('couleur', v)} />
              </div>
              <div className="comp-form-field">
                <label>Type de sort associé</label>
                <select value={form.typeKey} onChange={(e) => sf('typeKey', e.target.value)}>
                  <option value="">— Aucun —</option>
                  {spellTypes.map((type) => (
                    <option key={type.key || type.id} value={type.key || type.id}>{type.nom}</option>
                  ))}
                </select>
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
        <p className="comp-empty">Aucune spécialité.</p>
      )}

      <div className="entry-card-grid">
        {entries.map((entry) => (
          <div key={entry.id} className="entry-card" style={{ '--entry-color': entry.couleur || '#c8a84a' }}>
            <div className="entry-card-top">
              <div className="entry-card-badge">{(entry.label || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="entry-card-body">
                <span className="entry-card-kicker">{typeLabel(entry.typeKey)}</span>
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
                  title: 'Supprimer la spécialité',
                  message: `Supprimer "${entry.label}" ?`,
                  onConfirm: () => deleteSpecialite(entry.id),
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
