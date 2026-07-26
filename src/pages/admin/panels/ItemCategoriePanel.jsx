import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import ItemIconPicker from '../../../components/admin/ItemIconPicker';
import { getItemIcon } from '../../../data/itemIcons';
import { ConfirmModal, AdminFilterPanel, TagColorPicker } from '../AdminShared';
import { includesText, mergeTemporaryRows } from '../adminUtils';
import {
  BLANK_ITEM_CATEGORY,
  TEMP_ITEM_CATEGORIES,
  TEMP_ITEMS,
  normalizeItemCategoryId,
  getItemCategoryChildren,
  getRootItemCategories,
  getItemCategoryBranchIds,
} from '../itemUtils';

export default function ItemCategoriePanel() {
  const { customItemCategories, addItemCategory, updateItemCategory, deleteItemCategory, customItems } = useAdminStore();
  const categories = mergeTemporaryRows(TEMP_ITEM_CATEGORIES, customItemCategories);
  const items = mergeTemporaryRows(TEMP_ITEMS, customItems);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState(BLANK_ITEM_CATEGORY);
  const [search, setSearch] = useState('');

  const setCategory = (key, value) => setCategoryForm((current) => ({ ...current, [key]: value }));
  const rootCategories = getRootItemCategories(categories);
  const childrenOf = (categoryId) => getItemCategoryChildren(categories, categoryId);
  const filteredRoots = rootCategories.filter((category) => (
    includesText(category.nom, search)
    || includesText(category.description, search)
    || childrenOf(category.id).some((child) => includesText(child.nom, search))
  ));
  const parentOptions = rootCategories.filter((category) => !category.temporary && category.id !== editingCategory?.id);
  const itemCountFor = (categoryId) => {
    const branchIds = getItemCategoryBranchIds(categories, categoryId);
    return items.filter((item) => branchIds.includes(normalizeItemCategoryId(item.categoryId))).length;
  };

  const handleCategorySave = () => {
    if (!categoryForm.nom.trim()) return;
    if (editingCategory) updateItemCategory(editingCategory.id, categoryForm);
    else addItemCategory(categoryForm);
    setCategoryForm(BLANK_ITEM_CATEGORY);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const startCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm(BLANK_ITEM_CATEGORY);
    setShowCategoryForm(true);
  };

  const startCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({ ...BLANK_ITEM_CATEGORY, ...category });
    setShowCategoryForm(true);
  };

  const cancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm(BLANK_ITEM_CATEGORY);
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showCategoryForm ? cancelCategoryForm : startCategoryCreate}>
          {showCategoryForm ? 'Fermer catégorie' : '+ Catégorie'}
        </button>
      </div>

      {showCategoryForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelCategoryForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingCategory ? 'Modifier la catégorie' : "Nouvelle catégorie d'objet"}</h3>
              <button className="admin-btn" onClick={cancelCategoryForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={categoryForm.nom} onChange={(e) => setCategory('nom', e.target.value)} placeholder="Ex: Consommables" />
                </div>
                <TagColorPicker value={categoryForm.couleur} onChange={(value) => setCategory('couleur', value)} />
              </div>
              <div className="comp-form-field">
                <label>Section parente</label>
                <select
                  value={categoryForm.parentId ?? ''}
                  onChange={(e) => setCategory('parentId', normalizeItemCategoryId(e.target.value))}
                >
                  <option value="">Section principale</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.nom}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.8em', opacity: 0.6 }}>
                  Sans parent, la catégorie devient une grande section. Avec parent, elle devient une sous-catégorie.
                </span>
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={categoryForm.description} onChange={(value) => setCategory('description', value)} placeholder="Description de la catégorie..." />
              </div>
              <div className="comp-form-field">
                <label>Icône</label>
                <ItemIconPicker value={categoryForm.icone} onChange={(next) => setCategory('icone', next)} />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelCategoryForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!categoryForm.nom.trim()} onClick={handleCategorySave}>
                  {editingCategory ? 'Enregistrer' : 'Créer la catégorie'}
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filteredRoots.length} total={rootCategories.length} />

      {filteredRoots.length === 0 ? (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucune catégorie d'objet.</p>
      ) : (
        <div className="ascendance-row-grid">
          {filteredRoots.map((category) => {
            const linkedItems = itemCountFor(category.id);
            const iconEntry = getItemIcon(category.icone);
            const requestDeleteCategory = (target, count) => setConfirmDelete({
              title: 'Supprimer une catégorie',
              message: count > 0
                ? `La catégorie "${target.nom}" contient ${count} item${count > 1 ? 's' : ''}. Supprimer la catégorie laissera ces items sans section. Confirmer ?`
                : `Supprimer la catégorie "${target.nom}" ?`,
              dangerLabel: 'Supprimer',
              onConfirm: () => deleteItemCategory(target.id),
            });
            return (
              <article key={category.id} className="ascendance-row-card" style={{ '--ascendance-color': category.couleur || '#c8a84a' }}>
                <div className="ascendance-row-marker" />
                <div className="ascendance-row-main">
                  <div className="ascendance-row-head">
                    <div>
                      <h3>{iconEntry && <iconEntry.Icon size={16} strokeWidth={1.6} className="item-card-title-icon" />} {category.nom}</h3>
                      <span>{linkedItems} item{linkedItems > 1 ? 's' : ''}</span>
                    </div>
                    <b>Section</b>
                  </div>
                  {category.description && <p>{category.description}</p>}
                  <div className="ascendance-row-stats">
                    Sous-catégories : {childrenOf(category.id).length > 0 ? (
                      <span className="perm-chip-grid" style={{ display: 'inline-flex' }}>
                        {childrenOf(category.id).map((child) => (
                          <button key={child.id} type="button" className="perm-chip perm-chip--on" onClick={() => startCategoryEdit(child)}>
                            {child.nom}
                          </button>
                        ))}
                      </span>
                    ) : 'Aucune'}
                  </div>
                </div>
                <div className="ascendance-row-actions">
                  <button className="admin-btn" onClick={() => startCategoryEdit(category)}>Modifier</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => requestDeleteCategory(category, linkedItems)}>Supprimer</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
