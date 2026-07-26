import { useState } from 'react';
import { HISTORIQUE_DATA } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, KnowledgeCategoryModal, IdentityEntryModal, IdentityRowCard } from '../AdminShared';
import { asArray, slugifyKey, includesText } from '../adminUtils';

export default function HistoriquesPanel() {
  const {
    customHistoriqueCategories,
    customHistoriques,
    hiddenHistoriqueKeys: storedHiddenHistoriqueKeys,
    addHistoriqueCategory,
    addHistorique,
    updateHistorique,
    deleteHistorique,
    hideDefaultHistorique,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingHistorique, setEditingHistorique] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const hiddenHistoriqueKeys = new Set(asArray(storedHiddenHistoriqueKeys));
  const categories = [
    ...asArray(customHistoriqueCategories),
    { key: 'base', nom: 'Historiques de base', couleur: '#c8a84a' },
  ];
  const customKeys = new Set(asArray(customHistoriques).map((historique) => historique.key || slugifyKey(historique.nom)));
  const entries = [
    ...HISTORIQUE_DATA
      .map((historique) => ({ ...historique, key: slugifyKey(historique.nom), categoryKey: 'base', isDefault: true }))
      .filter((historique) => !hiddenHistoriqueKeys.has(historique.key) && !customKeys.has(historique.key)),
    ...asArray(customHistoriques),
  ];
  const filtered = entries.filter((historique) => (
    includesText(historique.nom, search) || includesText(historique.amelioration, search) || includesText(historique.description, search)
  ));
  const handleSave = (payload) => {
    if (editingHistorique?.custom) updateHistorique(editingHistorique.id, payload);
    else if (editingHistorique?.isDefault) {
      hideDefaultHistorique(editingHistorique.key);
      addHistorique({ ...payload, custom: true });
    } else addHistorique(payload);
    setEditingHistorique(null);
    setShowEntryForm(false);
  };
  const requestDelete = (historique) => {
    setConfirmDelete({
      title: "Supprimer l'historique",
      message: `Supprimer "${historique.nom}" ?`,
      onConfirm: () => {
        if (historique.custom) deleteHistorique(historique.id);
        else hideDefaultHistorique(historique.key);
      },
    });
  };
  const renderHistoriqueCard = (historique, index) => (
    <IdentityRowCard
      key={`${historique.nom}-${index}`}
      title={historique.nom}
      type="Historique"
      meta={historique.amelioration}
      description={historique.description}
      aptitudes={historique.aptitudes}
      color={historique.tagColor || historique.couleur || '#c8a84a'}
      onEdit={() => { setEditingHistorique(historique); setShowEntryForm(true); }}
      onDelete={() => requestDelete(historique)}
    />
  );
  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingHistorique(null); setShowEntryForm(true); }}>+ Nouvel historique</button>
      </div>
      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={new Set(categories.map((category) => category.key))}
          title="Nouvelle catégorie d'historique"
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => {
            addHistoriqueCategory(payload);
            setShowCategoryForm(false);
          }}
        />
      )}
      {showEntryForm && (
        <IdentityEntryModal
          kindLabel="historique"
          categories={categories}
          initial={editingHistorique}
          existingKeys={new Set(entries.map((historique) => historique.key))}
          enableAptitudes
          onClose={() => { setEditingHistorique(null); setShowEntryForm(false); }}
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
        categories={categories.filter((category) => filtered.some((historique) => (historique.categoryKey || 'base') === category.key))}
        entriesForCategory={(category) => filtered.filter((historique) => (historique.categoryKey || 'base') === category.key)}
        renderContent={(category, categoryEntries) => (
          <div className="entry-card-grid">
            {categoryEntries.length > 0 ? categoryEntries.map(renderHistoriqueCard) : (
              <div className="index-empty">Aucun historique trouvé.</div>
            )}
          </div>
        )}
      />
    </div>
  );
}
