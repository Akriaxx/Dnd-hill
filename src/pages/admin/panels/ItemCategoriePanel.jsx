import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, SectionGrid, AdminCard, DetailLine, TagColorPicker } from '../AdminShared';
import { asArray, includesText, mergeTemporaryRows, slugifyKey } from '../adminUtils';
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
  const filtered = categories.filter((category) => includesText(category.nom, search) || includesText(category.description, search));
  const rootCategories = getRootItemCategories(categories);
  const parentOptions = rootCategories.filter((category) => !category.temporary && category.id !== editingCategory?.id);
  const itemCountFor = (categoryId) => {
    const branchIds = getItemCategoryBranchIds(categories, categoryId);
    return items.filter((item) => branchIds.includes(normalizeItemCategoryId(item.categoryId))).length;
  };
  const subcategoryCountFor = (categoryId) => getItemCategoryChildren(categories, categoryId).length;

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
                <label>Icone (nom ou URL)</label>
                <input value={categoryForm.icone} onChange={(e) => setCategory('icone', e.target.value)} placeholder="Ex: potion, shield, sword..." />
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={categories.length} />

      {filtered.length === 0 ? (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucune catégorie d'objet.</p>
      ) : (
        <SectionGrid>
          {filtered.map((category) => {
            const linkedItems = itemCountFor(category.id);
            const linkedSubcategories = subcategoryCountFor(category.id);
            return (
              <AdminCard
                key={category.id}
                title={category.parentId ? `↳ ${category.nom}` : category.nom}
                badge={`${category.temporary ? 'Brut · ' : ''}${linkedItems} item${linkedItems > 1 ? 's' : ''}`}
                desc={category.description}
                onEdit={category.temporary ? undefined : () => startCategoryEdit(category)}
                onDelete={category.temporary ? undefined : () => setConfirmDelete({
                  title: 'Supprimer une catégorie',
                  message: linkedItems > 0
                    ? `La catégorie "${category.nom}" contient ${linkedItems} item${linkedItems > 1 ? 's' : ''}. Supprimer la catégorie laissera ces items sans section. Confirmer ?`
                    : `Supprimer la catégorie "${category.nom}" ?`,
                  dangerLabel: 'Supprimer',
                  onConfirm: () => deleteItemCategory(category.id),
                })}
              >
                <DetailLine label="Type" value={category.parentId ? 'Sous-catégorie' : 'Section'} />
                {!category.parentId && <DetailLine label="Sous-catégories" value={linkedSubcategories} />}
                {category.icone && <DetailLine label="Icone" value={category.icone} />}
              </AdminCard>
            );
          })}
        </SectionGrid>
      )}
    </div>
  );
}
