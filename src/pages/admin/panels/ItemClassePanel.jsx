import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, SectionGrid, AdminCard, DetailLine } from '../AdminShared';
import { asArray, includesText, mergeTemporaryRows } from '../adminUtils';
import { BLANK_ITEM_CLASS, TEMP_ITEM_CATEGORIES, getRootItemCategories, normalizeItemCategoryId } from '../itemUtils';

export default function ItemClassePanel() {
  const { customItemClasses, customItemCategories, addItemClass, updateItemClass, deleteItemClass } = useAdminStore();
  const classes = asArray(customItemClasses);
  const itemCategories = mergeTemporaryRows(TEMP_ITEM_CATEGORIES, customItemCategories);
  const rootCategories = getRootItemCategories(itemCategories);
  const rootNameFor = (id) => rootCategories.find((c) => normalizeItemCategoryId(c.id) === normalizeItemCategoryId(id))?.nom;

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_ITEM_CLASS);
  const [search, setSearch] = useState('');

  const set = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const canSave = form.nom.trim().length > 0 && Boolean(form.rootCategoryId);

  const handleSave = () => {
    if (!canSave) return;
    if (editingClass) updateItemClass(editingClass.id, form);
    else addItemClass(form);
    setForm(BLANK_ITEM_CLASS);
    setEditingClass(null);
    setShowForm(false);
  };

  const startCreate = () => { setEditingClass(null); setForm(BLANK_ITEM_CLASS); setShowForm(true); };
  const startEdit = (cls) => { setEditingClass(cls); setForm({ ...BLANK_ITEM_CLASS, ...cls }); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditingClass(null); setForm(BLANK_ITEM_CLASS); };

  const filtered = classes.filter((c) => includesText(c.nom, search) || includesText(c.description, search));

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? cancelForm : startCreate}>
          {showForm ? 'Fermer' : '+ Nouvelle classe'}
        </button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingClass ? 'Modifier la classe' : 'Nouvelle classe'}</h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-field">
                <label>Nom *</label>
                <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Lourde, Intermédiaire, Finesse..." />
              </div>
              <div className="comp-form-field">
                <label>Catégorie racine *</label>
                <select value={form.rootCategoryId ?? ''} onChange={(e) => set('rootCategoryId', normalizeItemCategoryId(e.target.value))}>
                  <option value="">— Choisir (Armure, Arme…) —</option>
                  {rootCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                </select>
                <span style={{ fontSize: '0.8em', opacity: 0.6 }}>
                  La catégorie d'objet équipable (Armure, Arme…) à laquelle cette classe d'équipement se rattache — c'est elle que les classes de personnage autorisent ou non.
                </span>
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(value) => set('description', value)} placeholder="Description de la classe d'équipement..." />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!canSave} onClick={handleSave}>
                  {editingClass ? 'Enregistrer' : 'Créer la classe'}
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={classes.length} />

      {classes.length === 0 && (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucune classe définie.</p>
      )}

      <SectionGrid>
        {filtered.map((cls) => (
          <AdminCard
            key={cls.id}
            title={cls.nom}
            badge={rootNameFor(cls.rootCategoryId)}
            desc={cls.description}
            onEdit={() => startEdit(cls)}
            onDelete={() => setConfirmDelete({ title: 'Supprimer la classe', message: `Supprimer "${cls.nom}" ?`, dangerLabel: 'Supprimer', onConfirm: () => deleteItemClass(cls.id) })}
          >
            <DetailLine label="Catégorie racine" value={rootNameFor(cls.rootCategoryId) || '—'} />
          </AdminCard>
        ))}
      </SectionGrid>
    </div>
  );
}
