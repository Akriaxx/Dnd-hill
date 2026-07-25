import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey } from '../adminUtils';

const DEFAULT_INDEX_CATEGORIES = [
  {
    id: 'default-index-actions',
    key: 'actions',
    nom: 'Actions',
    couleur: '#bcecff',
    locked: true,
  },
];

const DEFAULT_INDEX_ENTRIES = [
  {
    id: 'default-action-mouvement',
    key: 'action-mouvement',
    categoryKey: 'actions',
    titre: 'Action de mouvement',
    couleur: '#bcecff',
    description: "Dans ce système de jeu, les **actions de mouvement** permettent aux personnages d'**interagir avec leur environnement** en utilisant des points de mouvement plutôt que de l'endurance. Chaque personnage dispose de **deux points de mouvement par tour**, une **action de mouvement équivaut à une action simple**.",
    locked: true,
  },
];

const BLANK_INDEX_ENTRY = {
  key: '',
  categoryKey: 'actions',
  titre: '',
  couleur: '#bcecff',
  description: '',
  valueConfig: {
    enabled: false,
    position: 'before',
    joiner: ' ',
  },
};

const BLANK_INDEX_CATEGORY = {
  key: '',
  nom: '',
  couleur: '#bcecff',
};

export default function GameplayIndexPanel() {
  const {
    gameplayIndex,
    gameplayIndexCategories,
    hiddenGameplayIndexKeys,
    hiddenGameplayIndexCategoryKeys,
    addGameplayIndex,
    updateGameplayIndex,
    deleteGameplayIndex,
    addGameplayIndexCategory,
    updateGameplayIndexCategory,
    deleteGameplayIndexCategory,
    hideDefaultGameplayIndex,
    hideDefaultGameplayIndexCategory,
  } = useAdminStore();
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [openCategories, setOpenCategories] = useState(() => new Set(['actions']));
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_INDEX_ENTRY);
  const [categoryForm, setCategoryForm] = useState(BLANK_INDEX_CATEGORY);
  const customCategories = asArray(gameplayIndexCategories);
  const customEntries = asArray(gameplayIndex);
  const hiddenCategoryKeys = new Set(asArray(hiddenGameplayIndexCategoryKeys));
  const hiddenEntryKeys = new Set(asArray(hiddenGameplayIndexKeys));
  const customCategoryKeys = new Set(customCategories.map((category) => category.key));
  const customEntryKeys = new Set(customEntries.map((entry) => entry.key));
  const categories = [
    ...DEFAULT_INDEX_CATEGORIES
      .filter((category) => !hiddenCategoryKeys.has(category.key) && !customCategoryKeys.has(category.key))
      .map((category) => ({ ...category, isDefault: true })),
    ...customCategories,
  ];
  const entries = [
    ...DEFAULT_INDEX_ENTRIES
      .filter((entry) => !hiddenEntryKeys.has(entry.key) && !customEntryKeys.has(entry.key))
      .map((entry) => ({ ...entry, isDefault: true })),
    ...customEntries,
  ];
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setValueConfig = (key, value) => setForm((current) => ({
    ...current,
    valueConfig: {
      ...BLANK_INDEX_ENTRY.valueConfig,
      ...(current.valueConfig || {}),
      [key]: value,
    },
  }));
  const setCategory = (key, value) => setCategoryForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    if (!form.titre.trim()) return;
    const payload = {
      ...form,
      key: form.key.trim() || slugifyKey(form.titre),
      categoryKey: form.categoryKey || categories[0]?.key || '',
    };
    if (editingEntry?.isDefault) {
      hideDefaultGameplayIndex(editingEntry.key);
      addGameplayIndex(payload);
    }
    else if (editingEntry) updateGameplayIndex(editingEntry.id, payload);
    else addGameplayIndex(payload);
    setForm(BLANK_INDEX_ENTRY);
    setEditingEntry(null);
    setShowEntryForm(false);
  };

  const handleCategorySave = () => {
    if (!categoryForm.nom.trim()) return;
    const payload = {
      ...categoryForm,
      key: categoryForm.key.trim() || slugifyKey(categoryForm.nom),
    };
    if (editingCategory?.isDefault) {
      hideDefaultGameplayIndexCategory(editingCategory.key);
      addGameplayIndexCategory(payload);
    }
    else if (editingCategory) updateGameplayIndexCategory(editingCategory.id, payload);
    else addGameplayIndexCategory(payload);
    setCategoryForm(BLANK_INDEX_CATEGORY);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const startCreate = () => {
    setEditingEntry(null);
    setForm({ ...BLANK_INDEX_ENTRY, categoryKey: categories[0]?.key || '' });
    setShowEntryForm(true);
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setForm({ ...BLANK_INDEX_ENTRY, ...entry });
    setShowEntryForm(true);
  };

  const startCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm(BLANK_INDEX_CATEGORY);
    setShowCategoryForm(true);
  };

  const startCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({ ...BLANK_INDEX_CATEGORY, ...category });
    setShowCategoryForm(true);
  };

  const confirmDeleteEntry = (entry) => {
    setConfirmDelete({
      title: 'Supprimer une entrée',
      message: `Supprimer "${entry.titre}" ?`,
      dangerLabel: 'Supprimer',
      onConfirm: () => {
        if (entry.isDefault) hideDefaultGameplayIndex(entry.key);
        else deleteGameplayIndex(entry.id);
      },
    });
  };

  const confirmDeleteCategory = (category, categoryEntries) => {
    if (categoryEntries.length > 0) return;
    setConfirmDelete({
      title: 'Supprimer une catégorie',
      message: `Supprimer la catégorie "${category.nom}" ?`,
      dangerLabel: 'Supprimer',
      onConfirm: () => {
        if (category.isDefault) hideDefaultGameplayIndexCategory(category.key);
        else deleteGameplayIndexCategory(category.id);
      },
    });
  };

  const cancelForm = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
    setForm(BLANK_INDEX_ENTRY);
  };

  const cancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm(BLANK_INDEX_CATEGORY);
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
        <button className="admin-btn admin-btn--add" onClick={showEntryForm ? cancelForm : startCreate}>
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
                  <input value={categoryForm.nom} onChange={(e) => setCategory('nom', e.target.value)} placeholder="Ex: Actions" />
                </div>
                <TagColorPicker value={categoryForm.couleur} onChange={(value) => setCategory('couleur', value)} />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelCategoryForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!categoryForm.nom.trim()} onClick={handleCategorySave}>
                  {editingCategory ? '💾 Enregistrer' : '✦ Créer la catégorie'}
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
          onConfirm={() => {
            confirmDelete.onConfirm();
            setConfirmDelete(null);
          }}
        />
      )}

      {showEntryForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelForm()}>
          <div className="index-modal index-modal--wide">
            <div className="index-modal-header">
              <h3>{editingEntry ? "Modifier l'entrée" : 'Nouvelle entrée'}</h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.titre} onChange={(e) => set('titre', e.target.value)} placeholder="Ex: Action bonus" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Catégorie</label>
                  <select value={form.categoryKey} onChange={(e) => set('categoryKey', e.target.value)}>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>{category.nom}</option>
                    ))}
                  </select>
                </div>
                <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(value) => set('description', value)} />
              </div>
              <div className="index-value-config">
                <label className="index-value-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(form.valueConfig?.enabled)}
                    onChange={(e) => setValueConfig('enabled', e.target.checked)}
                  />
                  <span>Autoriser une valeur pour ce tag</span>
                </label>
                {form.valueConfig?.enabled && (
                  <>
                    <div className="comp-form-row">
                      <div className="comp-form-field">
                        <label>Position de la valeur</label>
                        <select
                          value={form.valueConfig?.position || 'before'}
                          onChange={(e) => setValueConfig('position', e.target.value)}
                        >
                          <option value="before">Avant le libellé</option>
                          <option value="after">Après le libellé</option>
                        </select>
                      </div>
                      <div className="comp-form-field comp-form-field--grow">
                        <label>Séparateur / mot conjoint</label>
                        <input
                          value={form.valueConfig?.joiner ?? ' '}
                          onChange={(e) => setValueConfig('joiner', e.target.value)}
                          placeholder="Ex: espace, x, pts de..."
                        />
                      </div>
                    </div>
                    <div className="index-value-preview">
                      <span>Aperçu</span>
                      <strong>
                        [{' '}
                        {(form.valueConfig?.position || 'before') === 'after'
                          ? `${form.titre || 'Mana'}${form.valueConfig?.joiner ?? ' '}6`
                          : `6${form.valueConfig?.joiner ?? ' '}${form.titre || 'Mana'}`}
                        {' '}]
                      </strong>
                    </div>
                  </>
                )}
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!form.titre.trim()} onClick={handleSave}>
                  {editingEntry ? '💾 Enregistrer' : "✦ Créer l'entrée"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="index-category-list">
        {categories.map((category) => {
          const categoryEntries = entries.filter((entry) => (entry.categoryKey || categories[0]?.key) === category.key);
          const isOpen = openCategories.has(category.key);
          return (
            <section key={category.key} className={`index-category${isOpen ? ' is-open' : ''}`} style={{ '--index-category-color': category.couleur || '#bcecff' }}>
              <div className="index-category-head" onClick={() => toggleCategory(category.key)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCategory(category.key)}>
                <div className="index-category-title">
                  <span className="index-category-chevron">{isOpen ? '▾' : '▸'}</span>
                  <span className="index-card-color" />
                  {category.nom}
                  <span className="index-category-count">{categoryEntries.length}</span>
                </div>
                <div className="index-category-menu-wrap">
                  <button
                    className="index-category-menu-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryMenu((value) => value === category.key ? null : category.key);
                    }}
                    aria-expanded={categoryMenu === category.key}
                  >
                    ...
                  </button>
                  {categoryMenu === category.key && (
                    <div className="index-category-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setCategoryMenu(null); startCategoryEdit(category); }}>Modifier</button>
                      <button disabled={categoryEntries.length > 0} onClick={() => { setCategoryMenu(null); confirmDeleteCategory(category, categoryEntries); }}>Supprimer</button>
                    </div>
                  )}
                </div>
              </div>
              <div className={`index-category-content${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
                <div className="admin-panel-grid">
                  {categoryEntries.map((entry, entryIndex) => (
                    <div
                      key={entry.id}
                      className="admin-card admin-card--custom index-card"
                      style={{
                        '--index-color': entry.couleur || category.couleur || '#bcecff',
                        '--index-card-delay': `${entryIndex * 34}ms`,
                      }}
                    >
                      <div className="admin-card-header">
                        <div className="admin-card-title">
                          <span className="index-card-color" />
                          {entry.titre}
                        </div>
                      </div>
                      {entry.description && (
                        <div className="admin-card-desc admin-card-desc--smart">
                          <SmartText text={entry.description} />
                        </div>
                      )}
                      <div className="admin-card-actions">
                        <button className="admin-btn" onClick={() => startEdit(entry)}>Modifier</button>
                        <button className="admin-btn admin-btn--danger" onClick={() => confirmDeleteEntry(entry)}>Supprimer</button>
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
