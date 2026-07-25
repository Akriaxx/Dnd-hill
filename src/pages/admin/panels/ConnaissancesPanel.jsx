import { useState } from 'react';
import { KNOWLEDGE_DATA } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, KnowledgeCategoryModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, includesText } from '../adminUtils';

const DEFAULT_KNOWLEDGE_CATEGORIES = [
  { id: 'default-knowledge-general', key: 'general', nom: 'Général', couleur: '#c8a84a', locked: true },
];

const BLANK_KNOWLEDGE_FORM = {
  nom: '',
  categoryKey: 'general',
  couleur: '#c8a84a',
  description: '',
};

function KnowledgeEntryModal({ categories, initialCategory, initialKnowledge, existingKeys, onClose, onSave }) {
  const [form, setForm] = useState({
    ...BLANK_KNOWLEDGE_FORM,
    ...(initialKnowledge || {}),
    categoryKey: initialKnowledge?.categoryKey || initialCategory || categories[0]?.key || 'general',
  });
  const [error, setError] = useState('');
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  const handleSave = () => {
    const nom = form.nom.trim();
    const description = form.description.trim();
    const key = slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (!description) { setError('Description obligatoire.'); return; }
    if (key !== initialKnowledge?.key && existingKeys.has(key)) { setError('Cette connaissance existe déjà.'); return; }
    onSave({ ...form, nom, description, key });
  };

  return (
    <div className="index-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{initialKnowledge ? 'Modifier la connaissance' : 'Nouvelle connaissance'}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="race-form-row">
            <div className="race-form-field race-form-field--grow">
              <label>Nom</label>
              <input value={form.nom} onChange={(event) => set('nom', event.target.value)} placeholder="Ex: Histoire du Monde Ancien" />
            </div>
            <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
          </div>
          <div className="race-form-field">
            <label>Catégorie</label>
            <select value={form.categoryKey} onChange={(event) => set('categoryKey', event.target.value)}>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>{category.nom}</option>
              ))}
            </select>
          </div>
          <div className="race-form-field">
            <label>Description</label>
            <SmartDescEditor
              value={form.description}
              onChange={(value) => set('description', value)}
              placeholder="Ou comment nos ancêtres ont réussi à inventer la guerre, la famine et la bureaucratie en un seul souffle..."
            />
          </div>
          {error && <div className="player-field-error">{error}</div>}
          <div className="comp-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="admin-btn admin-btn--add" onClick={handleSave}>
              {initialKnowledge ? 'Enregistrer' : 'Créer la connaissance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnaissancesPanel() {
  const {
    customKnowledgeCategories,
    customKnowledge,
    hiddenKnowledgeKeys: storedHiddenKnowledgeKeys,
    addKnowledgeCategory,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    hideDefaultKnowledge,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const hiddenKnowledgeKeys = new Set(asArray(storedHiddenKnowledgeKeys));
  const formatKnowledge = (value) => String(value || '').replace(/^\s*\[|\]\s*$/g, '');
  const categories = [
    ...DEFAULT_KNOWLEDGE_CATEGORIES,
    ...asArray(customKnowledgeCategories),
  ];
  const customKnowledgeKeys = new Set(asArray(customKnowledge).map((knowledge) => knowledge.key || slugifyKey(knowledge.nom)));
  const defaultKnowledge = KNOWLEDGE_DATA
    .map((knowledge) => ({
      id: `default-${slugifyKey(knowledge)}`,
      key: slugifyKey(knowledge),
      nom: formatKnowledge(knowledge),
      categoryKey: 'general',
      couleur: '#c8a84a',
      description: '',
      isDefault: true,
    }))
    .filter((knowledge) => !customKnowledgeKeys.has(knowledge.key) && !hiddenKnowledgeKeys.has(knowledge.key));
  const entries = [
    ...defaultKnowledge,
    ...asArray(customKnowledge),
  ];
  const existingEntryKeys = new Set(entries.map((entry) => entry.key || slugifyKey(entry.nom)));
  const existingCategoryKeys = new Set(categories.map((category) => category.key));
  const filtered = entries.filter((entry) => (
    (activeCategory === 'all' || entry.categoryKey === activeCategory)
    && includesText(entry.nom, search)
  ));
  const visibleCategoryKeys = new Set(filtered.map((entry) => entry.categoryKey || 'general'));
  const visibleCategories = categories.filter((category) => activeCategory === 'all'
    ? visibleCategoryKeys.has(category.key)
    : category.key === activeCategory
  );

  const handleSaveCategory = (payload) => {
    addKnowledgeCategory(payload);
    setShowCategoryForm(false);
  };

  const handleSaveEntry = (payload) => {
    const categoryName = categories.find((category) => category.key === payload.categoryKey)?.nom || '';
    const nextPayload = { ...payload, categoryName };
    if (editingKnowledge?.custom) {
      updateKnowledge(editingKnowledge.id, nextPayload);
    } else if (editingKnowledge) {
      addKnowledge({ ...nextPayload, key: editingKnowledge.key, custom: true });
    } else {
      addKnowledge(nextPayload);
    }
    setEditingKnowledge(null);
    setShowEntryForm(false);
  };

  const startKnowledgeEdit = (knowledge) => {
    setEditingKnowledge(knowledge);
    setShowEntryForm(true);
  };

  const requestKnowledgeDelete = (knowledge) => {
    setConfirmDelete({
      title: 'Supprimer la connaissance',
      message: `Supprimer "${knowledge.nom}" ?`,
      onConfirm: () => {
        if (knowledge.custom) deleteKnowledge(knowledge.id);
        else hideDefaultKnowledge(knowledge.key);
      },
    });
  };

  return (
    <div className="admin-panel">
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={() => setShowEntryForm(true)}>+ Nouvelle connaissance</button>
      </div>
      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        total={entries.length}
        fields={[{ key: 'category', label: 'Catégorie', value: activeCategory, onChange: setActiveCategory, options: [
          { value: 'all', label: 'Toutes' },
          ...categories.map((category) => ({ value: category.key, label: category.nom })),
        ] }]}
      />
      <CategoryAccordionList
        categories={visibleCategories
          .filter((category) => filtered.some((entry) => (entry.categoryKey || 'general') === category.key))
          .map((category) => ({ ...category, couleur: category.couleur || '#c8a84a' }))}
        entriesForCategory={(category) => filtered.filter((entry) => (entry.categoryKey || 'general') === category.key)}
        renderContent={(category, categoryEntries) => (
          <div className="admin-knowledge-list">
            {categoryEntries.length > 0 ? (
              <>
                <div className="admin-knowledge-head">
                  <span>#</span>
                  <span>Connaissance</span>
                </div>
                {categoryEntries.map((knowledge, index) => (
                  <div
                    key={knowledge.id || knowledge.key}
                    className={`admin-knowledge-row${knowledge.custom ? ' is-custom' : ''}`}
                    style={{ '--knowledge-color': knowledge.couleur || category.couleur || '#c8a84a' }}
                  >
                    <span className="admin-knowledge-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="admin-knowledge-main">
                      <strong>{knowledge.nom}</strong>
                      {knowledge.description && <p>{knowledge.description}</p>}
                    </div>
                    <div className="admin-knowledge-actions">
                      <button className="admin-btn" onClick={() => startKnowledgeEdit(knowledge)}>Modifier</button>
                      <button className="admin-btn admin-btn--danger" onClick={() => requestKnowledgeDelete(knowledge)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="index-empty">Aucune connaissance dans cette catégorie.</div>
            )}
          </div>
        )}
      />
      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={existingCategoryKeys}
          onClose={() => setShowCategoryForm(false)}
          onSave={handleSaveCategory}
        />
      )}
      {showEntryForm && (
        <KnowledgeEntryModal
          categories={categories}
          initialCategory={activeCategory === 'all' ? categories[0]?.key : activeCategory}
          initialKnowledge={editingKnowledge}
          existingKeys={existingEntryKeys}
          onClose={() => { setEditingKnowledge(null); setShowEntryForm(false); }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
}
