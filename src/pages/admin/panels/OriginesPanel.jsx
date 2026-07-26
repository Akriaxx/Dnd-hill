import { useState } from 'react';
import { ORIGIN_DATA } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, KnowledgeCategoryModal, IdentityEntryModal, IdentityRowCard } from '../AdminShared';
import { asArray, slugifyKey, includesText } from '../adminUtils';

export default function OriginesPanel() {
  const {
    customOriginCategories,
    customOrigins,
    hiddenOriginKeys: storedHiddenOriginKeys,
    customProvenances,
    addOriginCategory,
    addOrigin,
    updateOrigin,
    deleteOrigin,
    hideDefaultOrigin,
  } = useAdminStore();
  const provenanceOptions = asArray(customProvenances).map((p) => ({
    key: p.key || slugifyKey(p.nom),
    nom: p.nom,
    tagColor: p.tagColor,
  }));
  const [search, setSearch] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const hiddenOriginKeys = new Set(asArray(storedHiddenOriginKeys));
  const categories = [
    ...asArray(customOriginCategories),
    { key: 'base', nom: 'Origines de base', couleur: '#c8a84a' },
  ];
  const customKeys = new Set(asArray(customOrigins).map((origin) => origin.key || slugifyKey(origin.nom)));
  const entries = [
    ...ORIGIN_DATA
      .map((origin) => ({ ...origin, key: slugifyKey(origin.nom), categoryKey: 'base', isDefault: true }))
      .filter((origin) => !hiddenOriginKeys.has(origin.key) && !customKeys.has(origin.key)),
    ...asArray(customOrigins),
  ];
  const filtered = entries.filter((origin) => (
    includesText(origin.nom, search) || includesText(origin.amelioration, search) || includesText(origin.description, search)
  ));
  const handleSave = (payload) => {
    if (editingOrigin?.custom) updateOrigin(editingOrigin.id, payload);
    else if (editingOrigin?.isDefault) {
      hideDefaultOrigin(editingOrigin.key);
      addOrigin({ ...payload, custom: true });
    } else addOrigin(payload);
    setEditingOrigin(null);
    setShowEntryForm(false);
  };
  const requestDelete = (origin) => {
    setConfirmDelete({
      title: "Supprimer l'origine",
      message: `Supprimer "${origin.nom}" ?`,
      onConfirm: () => {
        if (origin.custom) deleteOrigin(origin.id);
        else hideDefaultOrigin(origin.key);
      },
    });
  };
  const renderOriginCard = (origin, index) => {
    const linkedProvenances = provenanceOptions
      .filter((p) => asArray(origin.provenanceKeys).includes(p.key))
      .map((p) => p.nom);
    return (
      <IdentityRowCard
        key={`${origin.nom}-${index}`}
        title={origin.nom}
        type="Origine"
        meta={origin.amelioration}
        description={origin.description}
        aptitudes={origin.aptitudes}
        provenances={linkedProvenances}
        color={origin.tagColor || origin.couleur || '#c8a84a'}
        onEdit={() => { setEditingOrigin(origin); setShowEntryForm(true); }}
        onDelete={() => requestDelete(origin)}
      />
    );
  };
  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingOrigin(null); setShowEntryForm(true); }}>+ Nouvelle origine</button>
      </div>
      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={new Set(categories.map((category) => category.key))}
          title="Nouvelle catégorie d'origine"
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => {
            addOriginCategory(payload);
            setShowCategoryForm(false);
          }}
        />
      )}
      {showEntryForm && (
        <IdentityEntryModal
          kindLabel="origine"
          categories={categories}
          initial={editingOrigin}
          existingKeys={new Set(entries.map((origin) => origin.key))}
          enableAptitudes
          enableProvenances
          provenanceOptions={provenanceOptions}
          onClose={() => { setEditingOrigin(null); setShowEntryForm(false); }}
          onSave={handleSave}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            confirmDelete.onConfirm();
            setConfirmDelete(null);
          }}
        />
      )}
      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={entries.length} />
      <CategoryAccordionList
        categories={categories.filter((category) => filtered.some((origin) => (origin.categoryKey || 'base') === category.key))}
        entriesForCategory={(category) => filtered.filter((origin) => (origin.categoryKey || 'base') === category.key)}
        renderContent={(category, categoryEntries) => (
          <div className="entry-card-grid">
            {categoryEntries.length > 0 ? categoryEntries.map(renderOriginCard) : (
              <div className="index-empty">Aucune origine trouvée.</div>
            )}
          </div>
        )}
      />
    </div>
  );
}
