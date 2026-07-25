import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey } from '../adminUtils';

const BLANK_RESISTANCE_CATEGORY = {
  key: '',
  label: '',
  couleur: '#bcecff',
};

const BLANK_RESISTANCE_ENTRY = {
  key: '',
  label: '',
  categoryKey: '',
};

export default function ResistancesDefPanel() {
  const {
    customResistanceCategories,
    customResistanceEntries,
    addResistanceCategory,
    updateResistanceCategory,
    deleteResistanceCategory,
    addResistanceEntry,
    updateResistanceEntry,
    deleteResistanceEntry,
  } = useAdminStore();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState(BLANK_RESISTANCE_CATEGORY);
  const [entryForm, setEntryForm] = useState(BLANK_RESISTANCE_ENTRY);

  const categories = asArray(customResistanceCategories);
  const entries = asArray(customResistanceEntries);

  const setCategory = (key, value) => setCategoryForm((f) => ({ ...f, [key]: value }));
  const setEntry = (key, value) => setEntryForm((f) => ({ ...f, [key]: value }));

  const handleCategorySave = () => {
    if (!categoryForm.label.trim()) return;
    const payload = {
      ...categoryForm,
      key: categoryForm.key.trim() || slugifyKey(categoryForm.label),
    };
    if (editingCategory) updateResistanceCategory(editingCategory.id, payload);
    else addResistanceCategory(payload);
    setCategoryForm(BLANK_RESISTANCE_CATEGORY);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleEntrySave = () => {
    if (!entryForm.label.trim() || !entryForm.categoryKey) return;
    const payload = {
      ...entryForm,
      key: entryForm.key.trim() || slugifyKey(entryForm.label),
    };
    if (editingEntry) updateResistanceEntry(editingEntry.id, payload);
    else addResistanceEntry(payload);
    setEntryForm(BLANK_RESISTANCE_ENTRY);
    setEditingEntry(null);
    setShowEntryForm(false);
  };

  const startCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm(BLANK_RESISTANCE_CATEGORY);
    setShowCategoryForm(true);
    setShowEntryForm(false);
  };

  const startCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({ ...BLANK_RESISTANCE_CATEGORY, ...category });
    setShowCategoryForm(true);
    setShowEntryForm(false);
  };

  const startEntryCreate = () => {
    setEditingEntry(null);
    setEntryForm({ ...BLANK_RESISTANCE_ENTRY, categoryKey: categories[0]?.key || '' });
    setShowEntryForm(true);
    setShowCategoryForm(false);
  };

  const startEntryEdit = (entry) => {
    setEditingEntry(entry);
    setEntryForm({ ...BLANK_RESISTANCE_ENTRY, ...entry });
    setShowEntryForm(true);
    setShowCategoryForm(false);
  };

  const cancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm(BLANK_RESISTANCE_CATEGORY);
  };

  const cancelEntryForm = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
    setEntryForm(BLANK_RESISTANCE_ENTRY);
  };

  const toggleCategory = (key) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={showCategoryForm ? cancelCategoryForm : startCategoryCreate}>
          {showCategoryForm ? 'Fermer catégorie' : '+ Catégorie'}
        </button>
        <button className="admin-btn admin-btn--add" onClick={showEntryForm ? cancelEntryForm : startEntryCreate} disabled={categories.length === 0}>
          {showEntryForm ? 'Fermer entrée' : '+ Entrée'}
        </button>
      </div>

      {showCategoryForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelCategoryForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
              <button className="admin-btn" onClick={cancelCategoryForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={categoryForm.label} onChange={(e) => setCategory('label', e.target.value)} placeholder="Ex: Élémentaire" />
                </div>
                <TagColorPicker value={categoryForm.couleur} onChange={(value) => setCategory('couleur', value)} />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelCategoryForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!categoryForm.label.trim()} onClick={handleCategorySave}>
                  {editingCategory ? '💾 Enregistrer' : '✦ Créer la catégorie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEntryForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelEntryForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingEntry ? "Modifier l'entrée" : 'Nouvelle entrée'}</h3>
              <button className="admin-btn" onClick={cancelEntryForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={entryForm.label} onChange={(e) => setEntry('label', e.target.value)} placeholder="Ex: Feu" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Catégorie *</label>
                  <select value={entryForm.categoryKey} onChange={(e) => setEntry('categoryKey', e.target.value)}>
                    {categories.map((cat) => (
                      <option key={cat.key} value={cat.key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelEntryForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!entryForm.label.trim() || !entryForm.categoryKey} onClick={handleEntrySave}>
                  {editingEntry ? '💾 Enregistrer' : "✦ Créer l'entrée"}
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

      {categories.length === 0 && (
        <p className="comp-empty">Aucune catégorie. Commence par en créer une.</p>
      )}

      <div className="index-category-list">
        {categories.map((category) => {
          const categoryEntries = entries.filter((e) => e.categoryKey === category.key);
          const isOpen = openCategories.has(category.key);
          return (
            <section key={category.key} className={`index-category${isOpen ? ' is-open' : ''}`} style={{ '--index-category-color': category.couleur || '#bcecff' }}>
              <div className="index-category-head" onClick={() => toggleCategory(category.key)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCategory(category.key)}>
                <div className="index-category-title">
                  <span className="index-category-chevron">{isOpen ? '▾' : '▸'}</span>
                  <span className="index-card-color" />
                  {category.label}
                  <span className="index-category-count">{categoryEntries.length}</span>
                </div>
                <div className="index-category-menu-wrap">
                  <button
                    className="index-category-menu-btn"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCategoryMenu((v) => v === category.key ? null : category.key); }}
                    aria-expanded={categoryMenu === category.key}
                  >
                    ...
                  </button>
                  {categoryMenu === category.key && (
                    <div className="index-category-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setCategoryMenu(null); startCategoryEdit(category); }}>Modifier</button>
                      <button
                        disabled={categoryEntries.length > 0}
                        onClick={() => {
                          setCategoryMenu(null);
                          if (categoryEntries.length > 0) return;
                          setConfirmDelete({
                            title: 'Supprimer une catégorie',
                            message: `Supprimer la catégorie "${category.label}" ?`,
                            dangerLabel: 'Supprimer',
                            onConfirm: () => deleteResistanceCategory(category.id),
                          });
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className={`index-category-content${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
                <div className="admin-panel-grid">
                  {categoryEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="admin-card admin-card--custom index-card"
                      style={{ '--index-color': category.couleur || '#bcecff' }}
                    >
                      <div className="admin-card-header">
                        <div className="admin-card-title">
                          <span className="index-card-color" />
                          {entry.label}
                        </div>
                      </div>
                      <div className="admin-card-actions">
                        <button className="admin-btn" onClick={() => startEntryEdit(entry)}>Modifier</button>
                        <button
                          className="admin-btn admin-btn--danger"
                          onClick={() => setConfirmDelete({
                            title: 'Supprimer une entrée',
                            message: `Supprimer "${entry.label}" ?`,
                            dangerLabel: 'Supprimer',
                            onConfirm: () => deleteResistanceEntry(entry.id),
                          })}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                  {categoryEntries.length === 0 && (
                    <div className="index-empty">Aucune entrée dans cette catégorie.</div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
