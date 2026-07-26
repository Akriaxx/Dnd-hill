import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor, { SmartText } from '../../../components/admin/SmartDescEditor';
import ItemIconPicker from '../../../components/admin/ItemIconPicker';
import { getItemIcon } from '../../../data/itemIcons';
import { ConfirmModal, AdminFilterPanel } from '../AdminShared';
import { asArray, includesText } from '../adminUtils';

const BLANK_ARCHETYPE = { nom: '', description: '', icone: '', parentId: null };

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

  const roots = archetypes.filter((a) => !a.parentId);
  const childrenOf = (id) => archetypes.filter((a) => String(a.parentId) === String(id));
  const filteredRoots = roots.filter((root) => (
    includesText(root.nom, search) || includesText(root.description, search)
    || childrenOf(root.id).some((child) => includesText(child.nom, search) || includesText(child.description, search))
  ));

  const handleSave = () => {
    if (!canSave) return;
    if (editing) updateArchetype(editing.id, form);
    else addArchetype(form);
    setForm(BLANK_ARCHETYPE);
    setEditing(null);
    setShowForm(false);
  };

  const startCreatePrincipal = () => { setEditing(null); setForm(BLANK_ARCHETYPE); setShowForm(true); };
  const startCreateSecond = (parentId) => { setEditing(null); setForm({ ...BLANK_ARCHETYPE, parentId }); setShowForm(true); };
  const startEdit = (entry) => { setEditing(entry); setForm({ ...BLANK_ARCHETYPE, ...entry }); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_ARCHETYPE); };

  const requestDelete = (entry) => {
    const children = childrenOf(entry.id);
    setConfirmDelete({
      title: entry.parentId ? "Supprimer l'archétype" : 'Supprimer le Principal',
      message: children.length > 0
        ? `Supprimer "${entry.nom}" ? ${children.length} archétype(s) Second rattaché(s) seront supprimés aussi.`
        : `Supprimer "${entry.nom}" ?`,
      dangerLabel: 'Supprimer',
      onConfirm: () => deleteArchetype(entry.id),
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={startCreatePrincipal}>+ Archétype Principal</button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>
                {editing ? 'Modifier l\'archétype' : form.parentId ? 'Nouvel archétype Second' : 'Nouvel archétype Principal'}
              </h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Exécuteur" />
                </div>
              </div>
              {form.parentId && (
                <p className="race-form-hint">
                  Rattaché au Principal : {archetypes.find((a) => String(a.id) === String(form.parentId))?.nom || '—'}
                </p>
              )}
              <div className="comp-form-field">
                <label>Icône</label>
                <ItemIconPicker value={form.icone} onChange={(next) => set('icone', next)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => set('description', v)} placeholder="Rôle principal en jeu, style attendu…" />
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filteredRoots.length} total={roots.length} />

      {filteredRoots.length === 0 ? (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucun archétype créé.</p>
      ) : (
        <div className="ascendance-row-grid">
          {filteredRoots.map((root) => {
            const iconEntry = getItemIcon(root.icone);
            const children = childrenOf(root.id);
            return (
              <article key={root.id} className="ascendance-row-card" style={{ '--ascendance-color': '#c8a84a' }}>
                <div className="ascendance-row-marker" />
                <div className="ascendance-row-main">
                  <div className="ascendance-row-head">
                    <div>
                      <h3>{iconEntry && <iconEntry.Icon size={16} strokeWidth={1.6} className="item-card-title-icon" />} {root.nom}</h3>
                      <span>Principal</span>
                    </div>
                    <b>Archétype</b>
                  </div>
                  {root.description && (
                    <div className="ascendance-row-stats"><SmartText text={root.description} /></div>
                  )}
                  <div className="ascendance-row-stats ascendance-row-stats--subcategories">
                    <span>Second :</span>
                    {children.length > 0 ? (
                      <div className="item-icon-picker-grid item-icon-picker-grid--inline">
                        {children.map((child) => {
                          const childIcon = getItemIcon(child.icone);
                          return (
                            <button key={child.id} type="button" className="item-icon-picker-option" onClick={() => startEdit(child)}>
                              {childIcon ? <childIcon.Icon size={22} strokeWidth={1.5} /> : <span className="item-icon-picker-plus">?</span>}
                              <span>{child.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : <em>Aucun</em>}
                  </div>
                </div>
                <div className="ascendance-row-actions">
                  <button className="admin-btn" onClick={() => startCreateSecond(root.id)}>+ Second</button>
                  <button className="admin-btn" onClick={() => startEdit(root)}>Modifier</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(root)}>Supprimer</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
