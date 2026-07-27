import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, KnowledgeCategoryModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, includesText } from '../adminUtils';

const BLANK_LANGUAGE_FORM = {
  nom: '',
  categoryKey: '',
  couleur: '#bcecff',
  description: '',
};

function LanguageEntryModal({ categories, initialCategory, initialLanguage, existingKeys, onClose, onSave }) {
  const [form, setForm] = useState({
    ...BLANK_LANGUAGE_FORM,
    ...(initialLanguage || {}),
    categoryKey: initialLanguage?.categoryKey || initialCategory || categories[0]?.key || '',
  });
  const [error, setError] = useState('');
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  const handleSave = () => {
    const nom = form.nom.trim();
    const description = form.description.trim();
    const key = slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (!form.categoryKey) { setError('Crée ou choisis une catégorie avant de ranger cette langue.'); return; }
    if (key !== initialLanguage?.key && existingKeys.has(key)) { setError('Cette langue existe déjà.'); return; }
    onSave({ ...form, nom, description, key });
  };

  return (
    <div className="index-modal-backdrop">
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{initialLanguage ? 'Modifier la langue' : 'Nouvelle langue'}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="race-form-row">
            <div className="race-form-field race-form-field--grow">
              <label>Nom</label>
              <input value={form.nom} onChange={(event) => set('nom', event.target.value)} placeholder="Ex: Ancien unathopien" />
            </div>
            <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
          </div>
          <div className="race-form-field">
            <label>Catégorie</label>
            <select value={form.categoryKey} onChange={(event) => set('categoryKey', event.target.value)} disabled={categories.length === 0}>
              {categories.length === 0 ? (
                <option value="">Aucune catégorie créée</option>
              ) : categories.map((category) => (
                <option key={category.key} value={category.key}>{category.nom}</option>
              ))}
            </select>
          </div>
          <div className="race-form-field">
            <label>Description</label>
            <SmartDescEditor
              value={form.description}
              onChange={(value) => set('description', value)}
              placeholder="Description à venir..."
            />
          </div>
          {error && <div className="player-field-error">{error}</div>}
          <div className="comp-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="admin-btn admin-btn--add" onClick={handleSave}>
              {initialLanguage ? 'Enregistrer' : 'Créer la langue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LanguesPanel() {
  const {
    customLanguageCategories,
    customLanguages,
    addLanguageCategory,
    addLanguage,
    updateLanguage,
    deleteLanguage,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const categories = asArray(customLanguageCategories);
  const entries = asArray(customLanguages);
  const existingCategoryKeys = new Set(categories.map((category) => category.key));
  const existingEntryKeys = new Set(entries.map((entry) => entry.key || slugifyKey(entry.nom)));
  const filtered = entries.filter((entry) => (
    (activeCategory === 'all' || entry.categoryKey === activeCategory)
    && (
      includesText(entry.nom, search)
      || includesText(entry.description, search)
      || includesText(categories.find((category) => category.key === entry.categoryKey)?.nom, search)
    )
  ));
  const visibleCategories = categories.filter((category) => activeCategory === 'all' ? true : category.key === activeCategory);

  const handleSaveCategory = (payload) => {
    addLanguageCategory(payload);
    setShowCategoryForm(false);
  };

  const handleSaveEntry = (payload) => {
    const categoryName = categories.find((category) => category.key === payload.categoryKey)?.nom || '';
    const nextPayload = { ...payload, categoryName };
    if (editingLanguage) updateLanguage(editingLanguage.id, nextPayload);
    else addLanguage(nextPayload);
    setEditingLanguage(null);
    setShowEntryForm(false);
  };

  const startLanguageEdit = (language) => {
    setEditingLanguage(language);
    setShowEntryForm(true);
  };

  const requestLanguageDelete = (language) => {
    setConfirmDelete({
      title: 'Supprimer la langue',
      message: `Supprimer "${language.nom}" ?`,
      onConfirm: () => deleteLanguage(language.id),
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
        <button className="admin-btn admin-btn--add" onClick={() => setShowEntryForm(true)}>+ Nouvelle langue</button>
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
      {categories.length === 0 ? (
        <div className="index-empty index-empty--wide">Aucune catégorie de langue créée pour le moment.</div>
      ) : (
        <CategoryAccordionList
          categories={visibleCategories.map((category) => ({ ...category, couleur: category.couleur || '#bcecff' }))}
          entriesForCategory={(category) => filtered.filter((entry) => entry.categoryKey === category.key)}
          renderContent={(category, categoryEntries) => (
            <div className="entry-card-grid">
              {categoryEntries.length > 0 ? categoryEntries.map((language) => (
                <div
                  key={language.id || language.key}
                  className="entry-card"
                  style={{ '--entry-color': language.couleur || category.couleur || '#bcecff' }}
                >
                  <div className="entry-card-top">
                    <div className="entry-card-badge">{(language.nom || '?').trim().charAt(0).toUpperCase()}</div>
                    <div className="entry-card-body">
                      <span className="entry-card-kicker">Langue</span>
                      <h3 className="entry-card-title">{language.nom}</h3>
                    </div>
                  </div>
                  {language.description && <div className="entry-card-desc">{language.description}</div>}
                  <div className="entry-card-actions">
                    <button className="admin-btn" onClick={() => startLanguageEdit(language)}>Modifier</button>
                    <button className="admin-btn admin-btn--danger" onClick={() => requestLanguageDelete(language)}>Supprimer</button>
                  </div>
                </div>
              )) : (
                <div className="index-empty">Aucune langue dans cette catégorie.</div>
              )}
            </div>
          )}
        />
      )}
      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={existingCategoryKeys}
          onClose={() => setShowCategoryForm(false)}
          onSave={handleSaveCategory}
        />
      )}
      {showEntryForm && (
        <LanguageEntryModal
          categories={categories}
          initialCategory={activeCategory === 'all' ? categories[0]?.key : activeCategory}
          initialLanguage={editingLanguage}
          existingKeys={existingEntryKeys}
          onClose={() => { setEditingLanguage(null); setShowEntryForm(false); }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
}
