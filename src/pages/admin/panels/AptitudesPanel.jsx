import { useState } from 'react';
import { APT_CATEGORIES, APTITUDES } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, KnowledgeCategoryModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, includesText, uniqueOptions, STAT_KEYS } from '../adminUtils';

const BLANK_APTITUDE_FORM = {
  nom: '',
  categoryKey: 'physique',
  couleur: '#bcecff',
  description: '',
  stat: 'FOR',
};

function AptitudeEntryModal({ categories, initialCategory, initialAptitude, existingKeys, onClose, onSave }) {
  const customCaracteristiques = useAdminStore((state) => state.customCaracteristiques);
  const statOptions = asArray(customCaracteristiques).length > 0
    ? asArray(customCaracteristiques).map((c) => c.cle).filter(Boolean).sort()
    : [...STAT_KEYS];
  const [form, setForm] = useState({
    ...BLANK_APTITUDE_FORM,
    ...(initialAptitude || {}),
    categoryKey: initialAptitude?.categoryKey || initialAptitude?.cat || initialCategory || categories[0]?.key || 'physique',
    stat: initialAptitude?.stat || '',
  });
  const [error, setError] = useState('');
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  const handleSave = () => {
    const nom = form.nom.trim();
    const description = form.description.trim();
    const key = slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (!description) { setError('Description obligatoire.'); return; }
    if (key !== initialAptitude?.key && existingKeys.has(key)) { setError('Cette aptitude existe déjà.'); return; }
    onSave({ ...form, nom, description, key, cat: form.categoryKey });
  };

  return (
    <div className="index-modal-backdrop">
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{initialAptitude ? "Modifier l'aptitude" : 'Nouvelle aptitude'}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="race-form-row">
            <div className="race-form-field race-form-field--grow">
              <label>Nom</label>
              <input value={form.nom} onChange={(event) => set('nom', event.target.value)} placeholder="Ex: Métallurgie" />
            </div>
            <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
          </div>
          <div className="race-form-row">
            <div className="race-form-field race-form-field--grow">
              <label>Catégorie</label>
              <select value={form.categoryKey} onChange={(event) => set('categoryKey', event.target.value)}>
                {categories.map((category) => (
                  <option key={category.key} value={category.key}>{category.nom}</option>
                ))}
              </select>
            </div>
            <div className="race-form-field race-form-field--grow">
              <label>Stat liée</label>
              <select value={form.stat} onChange={(event) => set('stat', event.target.value)}>
                <option value="">— Aucune —</option>
                {statOptions.map((stat) => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="race-form-field">
            <label>Description</label>
            <SmartDescEditor
              value={form.description}
              onChange={(value) => set('description', value)}
              placeholder="Décris ce que cette aptitude représente dans le système."
            />
          </div>
          {error && <div className="player-field-error">{error}</div>}
          <div className="comp-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="admin-btn admin-btn--add" onClick={handleSave}>
              {initialAptitude ? 'Enregistrer' : "Créer l'aptitude"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AptitudesPanel() {
  const {
    customAptitudeCategories,
    customAptitudes,
    hiddenAptitudeKeys: storedHiddenAptitudeKeys,
    addAptitudeCategory,
    addAptitude,
    updateAptitude,
    deleteAptitude,
    hideDefaultAptitude,
  } = useAdminStore();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [stat, setStat] = useState('all');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingAptitude, setEditingAptitude] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const hiddenAptitudeKeys = new Set(asArray(storedHiddenAptitudeKeys));
  const categories = [
    ...APT_CATEGORIES.map((category) => ({
      key: category.key,
      nom: category.label,
      couleur: '#bcecff',
      isDefault: true,
    })),
    ...asArray(customAptitudeCategories),
  ];
  const customAptitudeKeys = new Set(asArray(customAptitudes).map((aptitude) => aptitude.key || slugifyKey(aptitude.nom)));
  const defaultAptitudes = APTITUDES.map((aptitude) => ({
    ...aptitude,
    id: `default-${slugifyKey(aptitude.nom)}`,
    key: slugifyKey(aptitude.nom),
    categoryKey: aptitude.cat,
    couleur: categories.find((category) => category.key === aptitude.cat)?.couleur || '#bcecff',
    description: aptitude.description || '',
    isDefault: true,
  }))
  .filter((aptitude) => !hiddenAptitudeKeys.has(aptitude.key) && !customAptitudeKeys.has(aptitude.key));
  const entries = [
    ...defaultAptitudes,
    ...asArray(customAptitudes).map((aptitude) => ({
      ...aptitude,
      cat: aptitude.categoryKey || aptitude.cat,
      categoryKey: aptitude.categoryKey || aptitude.cat,
    })),
  ];
  const filtered = entries.filter((apt) => (
    (activeCat === 'all' || apt.cat === activeCat)
    && (stat === 'all' || apt.stat === stat)
    && (includesText(apt.nom, search) || includesText(apt.cat, search) || includesText(apt.stat, search) || includesText(apt.description, search))
  ));
  const existingEntryKeys = new Set(entries.map((entry) => entry.key || slugifyKey(entry.nom)));
  const existingCategoryKeys = new Set(categories.map((category) => category.key));
  const visibleCategoryKeys = new Set(filtered.map((entry) => entry.cat || entry.categoryKey));
  const visibleCategories = categories.filter((category) => (
    (activeCat === 'all' || category.key === activeCat)
    && visibleCategoryKeys.has(category.key)
  ));
  const handleSaveCategory = (payload) => {
    addAptitudeCategory(payload);
    setShowCategoryForm(false);
  };
  const handleSaveEntry = (payload) => {
    const categoryName = categories.find((category) => category.key === payload.categoryKey)?.nom || '';
    const nextPayload = { ...payload, categoryName };
    if (editingAptitude?.custom) {
      updateAptitude(editingAptitude.id, nextPayload);
    } else if (editingAptitude) {
      addAptitude({ ...nextPayload, key: editingAptitude.key, custom: true });
    } else {
      addAptitude(nextPayload);
    }
    setEditingAptitude(null);
    setShowEntryForm(false);
  };
  const startAptitudeEdit = (aptitude) => {
    setEditingAptitude(aptitude);
    setShowEntryForm(true);
  };
  const requestAptitudeDelete = (aptitude) => {
    setConfirmDelete({
      title: "Supprimer l'aptitude",
      message: `Supprimer "${aptitude.nom}" ?`,
      onConfirm: () => {
        if (aptitude.custom) deleteAptitude(aptitude.id);
        else hideDefaultAptitude(aptitude.key);
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
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingAptitude(null); setShowEntryForm(true); }}>+ Nouvelle aptitude</button>
      </div>
      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        total={entries.length}
        fields={[
          { key: 'cat', label: 'Catégorie', value: activeCat, onChange: setActiveCat, options: [{ value: 'all', label: 'Toutes' }, ...categories.map((cat) => ({ value: cat.key, label: cat.nom }))] },
          { key: 'stat', label: 'Stat', value: stat, onChange: setStat, options: uniqueOptions(entries.map((apt) => apt.stat)) },
        ]}
      />
      <CategoryAccordionList
        categories={visibleCategories}
        entriesForCategory={(category) => filtered.filter((aptitude) => (aptitude.cat || aptitude.categoryKey) === category.key)}
        renderContent={(category, categoryEntries) => (
          <div className="entry-card-grid">
            {categoryEntries.length > 0 ? categoryEntries.map((apt, aptitudeIndex) => (
              <div
                key={`${apt.id || apt.key || apt.nom}-${aptitudeIndex}`}
                className="entry-card"
                style={{ '--entry-color': apt.couleur || category.couleur || '#bcecff' }}
              >
                <div className="entry-card-top">
                  <div className="entry-card-badge">{(apt.nom || '?').trim().charAt(0).toUpperCase()}</div>
                  <div className="entry-card-body">
                    <span className="entry-card-kicker">{category.nom}{apt.stat ? ` — ${apt.stat}` : ''}</span>
                    <h3 className="entry-card-title">{apt.nom}{apt.meta ? ' *' : ''}</h3>
                  </div>
                </div>
                {apt.description && <div className="entry-card-desc">{apt.description}</div>}
                <div className="entry-card-actions">
                  <button className="admin-btn" onClick={() => startAptitudeEdit(apt)}>Modifier</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => requestAptitudeDelete(apt)}>Supprimer</button>
                </div>
              </div>
            )) : (
              <div className="index-empty">Aucune aptitude dans cette catégorie.</div>
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
        <AptitudeEntryModal
          categories={categories}
          initialCategory={activeCat === 'all' ? categories[0]?.key : activeCat}
          initialAptitude={editingAptitude}
          existingKeys={existingEntryKeys}
          onClose={() => { setEditingAptitude(null); setShowEntryForm(false); }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
}
