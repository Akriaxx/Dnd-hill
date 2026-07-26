import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, TagColorPicker, SubclassPicker } from '../AdminShared';
import { asArray, slugifyKey } from '../adminUtils';

const BLANK_MAITRISE_CATEGORY = { key: '', label: '', couleur: '#c8a84a' };

const BLANK_MAITRISE_ENTRY = {
  key: '',
  label: '',
  description: '',
  couleur: '#c8a84a',
  categoryKey: '',
  // Sous-classe(s) parente(s) : Classe → Sous-classe → Maîtrise, une
  // maîtrise se crée comme enfant d'une ou plusieurs sous-classes. Laisser
  // vide rend la maîtrise disponible pour toutes les sous-classes.
  sousClasses: [],
};

export default function MaitriseDefPanel() {
  const {
    customMaitriseCategories, customMaitriseEntries, customSubclasses, customClasses,
    addMaitriseCategory, updateMaitriseCategory, deleteMaitriseCategory,
    addMaitriseEntry, updateMaitriseEntry, deleteMaitriseEntry,
  } = useAdminStore();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(BLANK_MAITRISE_CATEGORY);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [form, setForm] = useState(BLANK_MAITRISE_ENTRY);

  const categories = asArray(customMaitriseCategories);
  const entries = asArray(customMaitriseEntries);
  const subclasses = asArray(customSubclasses);
  const classes = asArray(customClasses);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCategory = (k, v) => setCategoryForm((f) => ({ ...f, [k]: v }));

  const toggleSubclass = (key) => {
    const current = new Set(asArray(form.sousClasses));
    if (current.has(key)) current.delete(key); else current.add(key);
    sf('sousClasses', [...current]);
  };

  // Ajoute/retire tout un lot d'un coup (une classe entière, ou tout le
  // résultat filtré) — voir SubclassPicker.
  const toggleManySubclasses = (keys, shouldSelect) => {
    const current = new Set(asArray(form.sousClasses));
    keys.forEach((key) => (shouldSelect ? current.add(key) : current.delete(key)));
    sf('sousClasses', [...current]);
  };

  const handleCategorySave = () => {
    if (!categoryForm.label.trim()) return;
    const payload = { ...categoryForm, key: categoryForm.key.trim() || slugifyKey(categoryForm.label) };
    if (editingCategory) updateMaitriseCategory(editingCategory.id, payload);
    else addMaitriseCategory(payload);
    setCategoryForm(BLANK_MAITRISE_CATEGORY);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const startCategoryCreate = () => { setEditingCategory(null); setCategoryForm(BLANK_MAITRISE_CATEGORY); setShowCategoryForm(true); setShowForm(false); };
  const startCategoryEdit = (category) => { setEditingCategory(category); setCategoryForm({ ...BLANK_MAITRISE_CATEGORY, ...category }); setShowCategoryForm(true); setShowForm(false); };
  const cancelCategoryForm = () => { setShowCategoryForm(false); setEditingCategory(null); setCategoryForm(BLANK_MAITRISE_CATEGORY); };

  const handleSave = () => {
    if (!form.label.trim() || !form.categoryKey) return;
    const payload = {
      ...form,
      key: form.key.trim() || slugifyKey(form.label),
      sousClasses: asArray(form.sousClasses),
    };
    if (editing) updateMaitriseEntry(editing.id, payload);
    else addMaitriseEntry(payload);
    setForm(BLANK_MAITRISE_ENTRY);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => { setEditing(null); setForm({ ...BLANK_MAITRISE_ENTRY, categoryKey: categories[0]?.key || '' }); setShowForm(true); setShowCategoryForm(false); };
  const openEdit = (entry) => { setEditing(entry); setForm({ ...BLANK_MAITRISE_ENTRY, ...entry }); setShowForm(true); setShowCategoryForm(false); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_MAITRISE_ENTRY); };

  const toggleCategory = (key) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={showCategoryForm ? cancelCategoryForm : startCategoryCreate}>
          {showCategoryForm ? 'Fermer catégorie' : '+ Catégorie'}
        </button>
        <button className="admin-btn admin-btn--add" onClick={showForm ? closeForm : openCreate} disabled={categories.length === 0}>
          {showForm ? 'Fermer entrée' : '+ Nouvelle entrée'}
        </button>
      </div>
      {categories.length === 0 && (
        <p className="comp-empty">Créez d'abord une catégorie (Lumière, Chaos, Eau…) avant d'ajouter des domaines de maîtrise.</p>
      )}

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
                  <input value={categoryForm.label} onChange={(e) => setCategory('label', e.target.value)} placeholder="Ex: Lumière" />
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

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? "Modifier l'entrée" : 'Nouvelle entrée'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.label} onChange={(e) => sf('label', e.target.value)} placeholder="Ex: Foudre" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Catégorie *</label>
                  <select value={form.categoryKey} onChange={(e) => sf('categoryKey', e.target.value)}>
                    {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <TagColorPicker value={form.couleur} onChange={(v) => sf('couleur', v)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => sf('description', v)} />
              </div>
              {subclasses.length === 0 ? (
                <div className="race-lock-panel">
                  <div className="race-lock-head"><span>Sous-classe(s) parente(s)</span></div>
                  <p className="race-form-hint">Aucune sous-classe créée — laissez vide pour l'instant, ou créez d'abord une classe puis une sous-classe.</p>
                </div>
              ) : (
                <SubclassPicker
                  subclasses={subclasses}
                  classes={classes}
                  selected={asArray(form.sousClasses)}
                  onToggle={toggleSubclass}
                  onToggleMany={toggleManySubclasses}
                />
              )}
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={closeForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!form.label.trim() || !form.categoryKey} onClick={handleSave}>
                  {editing ? '💾 Enregistrer' : "✦ Créer l'entrée"}
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
          dangerLabel={confirmDelete.dangerLabel || 'Supprimer'}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      <div className="index-category-list">
        {categories.map((category) => {
          const categoryEntries = entries.filter((e) => e.categoryKey === category.key);
          const isOpen = openCategories.has(category.key);
          return (
            <section key={category.key} className={`index-category${isOpen ? ' is-open' : ''}`} style={{ '--index-category-color': category.couleur || '#c8a84a' }}>
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
                            onConfirm: () => deleteMaitriseCategory(category.id),
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
                    <div key={entry.id} className="admin-card admin-card--custom index-card" style={{ '--index-color': entry.couleur || '#c8a84a' }}>
                      <div className="admin-card-header">
                        <div className="admin-card-title">
                          <span className="index-card-color" />
                          {entry.label}
                        </div>
                      </div>
                      {entry.description && (
                        <div className="admin-card-desc admin-card-desc--smart">
                          <SmartText text={entry.description} />
                        </div>
                      )}
                      <div className="admin-card-meta">
                        {asArray(entry.sousClasses).length === 0
                          ? 'Toutes les sous-classes'
                          : asArray(entry.sousClasses).map((key) => subclasses.find((sc) => (sc.key || slugifyKey(sc.nom)) === key)?.nom || key).join(' · ')}
                      </div>
                      <div className="admin-card-actions">
                        <button className="admin-btn" onClick={() => openEdit(entry)}>Modifier</button>
                        <button
                          className="admin-btn admin-btn--danger"
                          onClick={() => setConfirmDelete({
                            title: "Supprimer l'entrée",
                            message: `Supprimer "${entry.label}" ?`,
                            onConfirm: () => deleteMaitriseEntry(entry.id),
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
