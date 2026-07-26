import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import {
  ConfirmModal, AdminFilterPanel, TagColorPicker,
  CategoryAccordionList, ResourceDiceFields, RaceLockFields,
  KnowledgeCategoryModal,
} from '../AdminShared';
import {
  asArray, slugifyKey, includesText,
  BLANK_CLASS_FORM,
  normalizeResourceDice, resourceDiceSummary, getRaceOptionsForLocks,
} from '../adminUtils';
import { getItemCategoryChildren } from '../itemUtils';

function ClassFormModal({ initial, races, classCategories, caracteristiques, armureOptions, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_CLASS_FORM,
    ...(initial || {}),
    resourceDice: normalizeResourceDice(initial || BLANK_CLASS_FORM),
  }));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canSave = form.nom.trim().length > 0;

  const toggleArmure = (categoryId) => {
    const current = new Set(asArray(form.armures));
    if (current.has(categoryId)) current.delete(categoryId); else current.add(categoryId);
    set('armures', [...current]);
  };

  const save = () => {
    if (!canSave) return;
    onSave({
      ...form,
      key: form.key || slugifyKey(form.nom),
      nom: form.nom.trim(),
      allowedRaces: asArray(form.allowedRaces),
      armures: asArray(form.armures),
      resourceDice: normalizeResourceDice(form),
      nombreSortsMagiques: Number(form.nombreSortsMagiques) || 0,
      nombreSortsPhysiques: Number(form.nombreSortsPhysiques) || 0,
      nombreCompetences: Number(form.nombreCompetences) || 0,
    });
  };

  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="race-modal">
        <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? 'Modifier la classe' : 'Nouvelle classe'}</h3>
            <button className="admin-btn" onClick={onClose}>✕ Annuler</button>
          </div>
          <div className="race-form-body">
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Identité</div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                    <option value="">— Choisir une catégorie —</option>
                    {classCategories.map((c) => <option key={c.key} value={c.key}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Stat physique</label>
                  <select value={form.physique || ''} onChange={(e) => set('physique', e.target.value)}>
                    <option value="">—</option>
                    {caracteristiques.map((c) => <option key={c.cle} value={c.cle}>{c.cle}</option>)}
                    <option value="VAR">VAR</option>
                  </select>
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Stat magique</label>
                  <select value={form.magique || ''} onChange={(e) => set('magique', e.target.value)}>
                    <option value="">—</option>
                    {caracteristiques.map((c) => <option key={c.cle} value={c.cle}>{c.cle}</option>)}
                    <option value="VAR">VAR</option>
                  </select>
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Sorts magiques / niveau</label>
                  <input type="number" value={form.nombreSortsMagiques ?? ''} onChange={(e) => set('nombreSortsMagiques', e.target.value)} />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Sorts physiques / niveau</label>
                  <input type="number" value={form.nombreSortsPhysiques ?? ''} onChange={(e) => set('nombreSortsPhysiques', e.target.value)} />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Compétences de départ</label>
                  <input type="number" value={form.nombreCompetences ?? ''} onChange={(e) => set('nombreCompetences', e.target.value)} />
                </div>
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description || ''} onChange={(v) => set('description', v)} />
              </div>
            </div>
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Armures</div>
              {armureOptions.length === 0 ? (
                <p className="race-form-hint">
                  Aucune catégorie d'armure trouvée — crée une catégorie d'objet nommée "Armure(s)" avec des sous-catégories (Légère, Moyenne, Lourde…) dans Économie → Catégories d'objets.
                </p>
              ) : (
                <div className="race-lock-panel">
                  <div className="race-lock-head">
                    <span>Armures autorisées</span>
                    <small>{asArray(form.armures).length === 0 ? 'Aucune' : `${form.armures.length} sélectionnée(s)`}</small>
                  </div>
                  <div className="race-lock-grid">
                    {armureOptions.map((option) => (
                      <label key={option.id} className={`race-lock-choice${asArray(form.armures).includes(option.id) ? ' active' : ''}`}>
                        <input type="checkbox" checked={asArray(form.armures).includes(option.id)} onChange={() => toggleArmure(option.id)} />
                        <span>{option.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Dés de ressource</div>
              <p className="race-form-hint">Au passage de niveau, le joueur choisit une ressource et lance le dé associé.</p>
              <ResourceDiceFields value={form.resourceDice} onChange={(v) => set('resourceDice', v)} />
            </div>
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Verrou de race</div>
              <RaceLockFields value={form.allowedRaces} races={races} onChange={(v) => set('allowedRaces', v)} />
            </div>
          </div>
          <div className="race-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="race-form-save-btn" disabled={!canSave} onClick={save}>
              {initial ? 'Enregistrer' : 'Créer la classe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPanel() {
  const {
    customClasses, customRaces, customClassCategories, customCaracteristiques, customItemCategories,
    hiddenClassKeys: storedHiddenClassKeys,
    addClass, updateClass, deleteClass, hideDefaultClass,
    addClassCategory,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const raceLockOptions = getRaceOptionsForLocks(customRaces);
  const classCategories = asArray(customClassCategories);
  const caracteristiques = asArray(customCaracteristiques);
  const itemCategories = asArray(customItemCategories);
  // "Armures" côté classe pointe vers les enfants de la catégorie d'objet
  // racine dont le nom contient "armure" — pas de champ texte libre.
  const armureRootCategory = itemCategories.find((c) => !c.parentId && /armure/i.test(c.nom));
  const armureOptions = armureRootCategory ? getItemCategoryChildren(itemCategories, armureRootCategory.id) : [];
  const hiddenClassKeys = new Set(asArray(storedHiddenClassKeys));
  const customClassKeys = new Set(asArray(customClasses).map((c) => c.key || slugifyKey(c.nom)));
  const entries = asArray(customClasses).filter((c) => !hiddenClassKeys.has(c.key || slugifyKey(c.nom)));

  const filtered = entries.filter((cls) => (
    (type === 'all' || cls.type === type)
    && (includesText(cls.nom, search) || includesText(cls.type, search) || includesText(cls.description, search))
  ));

  const handleSave = (form) => {
    const payload = { ...form, key: form.key || slugifyKey(form.nom) };
    if (editingClass?.custom) updateClass(editingClass.id, payload);
    else addClass(payload);
    setShowForm(false);
    setEditingClass(null);
  };

  const handleDelete = (cls) => {
    setConfirmDelete({
      title: 'Supprimer la classe',
      message: `Supprimer "${cls.nom}" ?`,
      onConfirm: () => deleteClass(cls.id),
    });
  };

  const renderClassCard = (cls, entryIndex) => {
    const category = classCategories.find((c) => c.key === cls.type);
    const color = category?.couleur || '#c8a84a';
    return (
      <article key={`${cls.nom}-${entryIndex}`} className="ascendance-row-card class-row-card" style={{ '--ascendance-color': color }}>
        <div className="ascendance-row-marker" />
        <div className="ascendance-row-main">
          <div className="ascendance-row-head">
            <div><h3>{cls.nom}</h3><span>{category?.nom || cls.type}</span></div>
            <b>Classe</b>
          </div>
          <div className="ascendance-row-stats">Dés : {resourceDiceSummary(cls)}</div>
          {asArray(cls.armures).length > 0 && (
            <div className="ascendance-row-stats">
              Armures : {cls.armures.map((id) => armureOptions.find((o) => o.id === id)?.nom || itemCategories.find((c) => c.id === id)?.nom).filter(Boolean).join(' · ')}
            </div>
          )}
          <div className="ascendance-row-stats">
            Par niveau : {cls.nombreSortsMagiques ?? 0} sort(s) magique(s) · {cls.nombreSortsPhysiques ?? 0} sort(s) physique(s) · {cls.nombreCompetences ?? 0} compétence(s)
          </div>
          <div className="ascendance-row-stats">
            Races : {asArray(cls.allowedRaces).length > 0
              ? asArray(cls.allowedRaces).map((k) => raceLockOptions.find((r) => r.key === k)?.nom || k).join(' · ')
              : 'Toutes'}
          </div>
          {cls.description && <p>{cls.description}</p>}
        </div>
        <div className="ascendance-row-actions">
          <button className="admin-btn" onClick={() => { setEditingClass(cls); setShowForm(true); }}>Modifier</button>
          <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(cls)}>Supprimer</button>
        </div>
      </article>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingClass(null); setShowForm(true); }} disabled={classCategories.length === 0}>+ Nouvelle classe</button>
      </div>
      {classCategories.length === 0 && (
        <div className="index-empty">Créez d'abord une catégorie de classe (Combattante, Héroïque…) avant d'ajouter des classes.</div>
      )}
      {showCategoryForm && (
        <KnowledgeCategoryModal
          title="Nouvelle catégorie de classe"
          existingKeys={new Set(classCategories.map((c) => c.key))}
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => { addClassCategory(payload); setShowCategoryForm(false); }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
      {showForm && (
        <ClassFormModal
          initial={editingClass}
          races={raceLockOptions}
          classCategories={classCategories}
          caracteristiques={caracteristiques}
          armureOptions={armureOptions}
          onClose={() => { setShowForm(false); setEditingClass(null); }}
          onSave={handleSave}
        />
      )}
      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        total={entries.length}
        fields={[{ key: 'type', label: 'Type', value: type, onChange: setType, options: [
          { value: 'all', label: 'Tous' },
          ...classCategories.map((c) => ({ value: c.key, label: c.nom })),
        ] }]}
      />
      {entries.length === 0 ? (
        <div className="index-empty">Aucune classe créée. Les classes définissent les dés de ressource et les sous-classes disponibles.</div>
      ) : (
        <CategoryAccordionList
          categories={classCategories
            .filter((c) => type === 'all' || c.key === type)
            .filter((c) => filtered.some((cls) => cls.type === c.key))}
          entriesForCategory={(category) => filtered.filter((c) => c.type === category.key)}
          renderContent={(category, categoryEntries) => (
            <div className="ascendance-row-grid class-row-grid">
              {categoryEntries.length > 0 ? categoryEntries.map(renderClassCard) : (
                <div className="index-empty">Aucune classe dans cette catégorie.</div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
