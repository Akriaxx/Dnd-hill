import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import {
  ConfirmModal, AdminFilterPanel, TagColorPicker,
  CategoryAccordionList, ResourceDiceFields, RaceLockFields,
  KnowledgeCategoryModal, EquipClassLockFields,
} from '../AdminShared';
import {
  asArray, slugifyKey, includesText,
  BLANK_CLASS_FORM,
  normalizeResourceDice, resourceDiceSummary, getRaceOptionsForLocks,
} from '../adminUtils';
import { groupItemClassesByRoot } from '../itemUtils';

function ClassFormModal({ initial, races, classCategories, caracteristiques, equipClassGroups, archetypes, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_CLASS_FORM,
    ...(initial || {}),
    resourceDice: normalizeResourceDice(initial || BLANK_CLASS_FORM),
  }));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canSave = form.nom.trim().length > 0;

  const toggleEquipClass = (classId) => {
    const current = new Set(asArray(form.allowedItemClasses));
    if (current.has(classId)) current.delete(classId); else current.add(classId);
    set('allowedItemClasses', [...current]);
  };
  const toggleManyEquipClasses = (ids, shouldSelect) => {
    const current = new Set(asArray(form.allowedItemClasses));
    ids.forEach((id) => (shouldSelect ? current.add(id) : current.delete(id)));
    set('allowedItemClasses', [...current]);
  };

  const secondaryArchetypeOptions = archetypes.filter((a) => String(a.id) !== String(form.archetypeId ?? ''));
  const toggleSecondaryArchetype = (id) => {
    const current = new Set(asArray(form.archetypeSecondaryIds));
    if (current.has(id)) current.delete(id); else current.add(id);
    set('archetypeSecondaryIds', [...current]);
  };

  const save = () => {
    if (!canSave) return;
    onSave({
      ...form,
      key: form.key || slugifyKey(form.nom),
      nom: form.nom.trim(),
      allowedRaces: asArray(form.allowedRaces),
      allowedItemClasses: asArray(form.allowedItemClasses),
      archetypeSecondaryIds: asArray(form.archetypeSecondaryIds),
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
                <div className="race-form-field race-form-field--grow">
                  <label>Archétype principal</label>
                  <select value={form.archetypeId ?? ''} onChange={(e) => set('archetypeId', Number(e.target.value) || null)}>
                    <option value="">— Aucun —</option>
                    {archetypes.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
              </div>
              {archetypes.length > 0 && (
                <div className="race-lock-panel">
                  <div className="race-lock-head">
                    <span>Archétypes secondaires</span>
                    <small>{asArray(form.archetypeSecondaryIds).length === 0 ? 'Aucun' : `${form.archetypeSecondaryIds.length} sélectionné(s)`}</small>
                  </div>
                  <div className="race-lock-grid">
                    {secondaryArchetypeOptions.map((a) => (
                      <label key={a.id} className={`race-lock-choice${asArray(form.archetypeSecondaryIds).includes(a.id) ? ' active' : ''}`}>
                        <input type="checkbox" checked={asArray(form.archetypeSecondaryIds).includes(a.id)} onChange={() => toggleSecondaryArchetype(a.id)} />
                        <span>{a.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Stat physique</label>
                  <select value={form.physique || ''} onChange={(e) => set('physique', e.target.value)}>
                    <option value="">—</option>
                    {caracteristiques.map((c) => <option key={c.cle} value={c.cle}>{c.cle}</option>)}
                  </select>
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Stat magique</label>
                  <select value={form.magique || ''} onChange={(e) => set('magique', e.target.value)}>
                    <option value="">—</option>
                    {caracteristiques.map((c) => <option key={c.cle} value={c.cle}>{c.cle}</option>)}
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
              <div className="race-form-section-title">Classes d'équipement</div>
              <EquipClassLockFields
                groups={equipClassGroups}
                selected={asArray(form.allowedItemClasses)}
                onToggle={toggleEquipClass}
                onToggleMany={toggleManyEquipClasses}
              />
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
    customClasses, customRaces, customClassCategories, customCaracteristiques,
    customItemCategories, customItemClasses, customArchetypes,
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
  const itemClasses = asArray(customItemClasses);
  const itemCategoryRoots = itemCategories.filter((c) => !c.parentId);
  const equipClassGroups = groupItemClassesByRoot(itemClasses, itemCategoryRoots);
  const archetypes = asArray(customArchetypes);
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
      <div key={`${cls.nom}-${entryIndex}`} className="entry-card" style={{ '--entry-color': color }}>
        <div className="entry-card-top">
          <div className="entry-card-badge">{cls.nom.trim().charAt(0).toUpperCase()}</div>
          <div className="entry-card-body">
            <span className="entry-card-kicker">Classe — {category?.nom || cls.type}</span>
            <h3 className="entry-card-title">{cls.nom}</h3>
          </div>
        </div>
        <div className="entry-card-detail">
          {cls.archetypeId != null && (
            <span>Archétype principal : <b>{archetypes.find((a) => String(a.id) === String(cls.archetypeId))?.nom || '—'}</b></span>
          )}
          {asArray(cls.archetypeSecondaryIds).length > 0 && (
            <span>Archétypes secondaires : <b>{asArray(cls.archetypeSecondaryIds).map((id) => archetypes.find((a) => String(a.id) === String(id))?.nom).filter(Boolean).join(', ')}</b></span>
          )}
          <span>Dés : <b>{resourceDiceSummary(cls)}</b></span>
          {asArray(cls.allowedItemClasses).length > 0 && (
            <span>Équipement : <b>{cls.allowedItemClasses.map((id) => itemClasses.find((c) => c.id === id)?.nom).filter(Boolean).join(', ')}</b></span>
          )}
          <span>
            Par niveau : <b>{cls.nombreSortsMagiques ?? 0} sort(s) magique(s) · {cls.nombreSortsPhysiques ?? 0} sort(s) physique(s) · {cls.nombreCompetences ?? 0} compétence(s)</b>
          </span>
          <span>
            Races : <b>{asArray(cls.allowedRaces).length > 0
              ? asArray(cls.allowedRaces).map((k) => raceLockOptions.find((r) => r.key === k)?.nom || k).join(', ')
              : 'Toutes'}</b>
          </span>
        </div>
        {cls.description && <div className="entry-card-desc">{cls.description}</div>}
        <div className="entry-card-actions">
          <button className="admin-btn" onClick={() => { setEditingClass(cls); setShowForm(true); }}>Modifier</button>
          <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(cls)}>Supprimer</button>
        </div>
      </div>
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
          equipClassGroups={equipClassGroups}
          archetypes={archetypes}
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
            <div className="entry-card-grid entry-card-grid--wide">
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
