import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import {
  ConfirmModal, AdminFilterPanel, CategoryAccordionList,
  ResourceDiceFields, RaceLockFields,
} from '../AdminShared';
import {
  asArray, slugifyKey, includesText, uniqueOptions,
  BLANK_SUBCLASS_FORM,
  normalizeResourceDice, resourceDiceSummary, getRaceOptionsForLocks,
} from '../adminUtils';

function SubclassFormModal({ initial, classes, classCategories, races, archetypeRoots, archetypeChildrenOf, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_SUBCLASS_FORM,
    ...(initial || {}),
    resourceDice: normalizeResourceDice(initial || BLANK_SUBCLASS_FORM),
  }));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canSave = form.nom.trim().length > 0 && form.classe.length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...form,
      key: form.key || slugifyKey(form.nom),
      nom: form.nom.trim(),
      allowedRaces: asArray(form.allowedRaces),
      resourceDice: normalizeResourceDice(form),
      nombreSortsMagiques: Number(form.nombreSortsMagiques) || 0,
      nombreSortsPhysiques: Number(form.nombreSortsPhysiques) || 0,
      nombreCompetences: Number(form.nombreCompetences) || 0,
    });
  };

  const parentClass = classes.find((c) => (c.key || slugifyKey(c.nom)) === form.classe || c.nom === form.classe);
  const classColor = parentClass ? (classCategories.find((c) => c.key === parentClass.type)?.couleur || '#c8a84a') : '#888';

  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="race-modal">
        <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? 'Modifier la sous-classe' : 'Nouvelle sous-classe'}</h3>
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
                  <label>Classe parente *</label>
                  <select
                    value={form.classe}
                    onChange={(e) => set('classe', e.target.value)}
                    style={{ borderColor: classColor }}
                  >
                    <option value="">— Choisir une classe —</option>
                    {classes.map((cls) => (
                      <option key={cls.key || slugifyKey(cls.nom)} value={cls.key || slugifyKey(cls.nom)}>
                        {cls.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Compétences de départ</label>
                  <input type="number" value={form.nombreCompetences ?? ''} onChange={(e) => set('nombreCompetences', e.target.value)} />
                </div>
              </div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Archétype</label>
                  <select value={form.archetypeId ?? ''} onChange={(e) => set('archetypeId', Number(e.target.value) || null)}>
                    <option value="">— Hérite de la classe —</option>
                    {archetypeRoots.map((root) => (
                      <optgroup key={root.id} label={root.nom}>
                        <option value={root.id}>{root.nom}</option>
                        {archetypeChildrenOf(root.id).map((child) => (
                          <option key={child.id} value={child.id}>— {child.nom}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description || ''} onChange={(v) => set('description', v)} />
              </div>
            </div>

            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Dés de ressource</div>
              <label className="index-value-toggle" style={{ marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={Boolean(form.replaceClassResourceDice)} onChange={(e) => set('replaceClassResourceDice', e.target.checked)} />
                Remplacer les dés de la classe parente
              </label>
              {form.replaceClassResourceDice && (
                <>
                  <p className="race-form-hint">Ces dés remplacent ceux de la classe pour les joueurs de cette sous-classe.</p>
                  <ResourceDiceFields value={form.resourceDice} onChange={(v) => set('resourceDice', v)} />
                </>
              )}
              {!form.replaceClassResourceDice && (
                <p className="race-form-hint" style={{ opacity: 0.6 }}>Les dés de la classe parente sont utilisés.</p>
              )}
            </div>

            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Sorts par niveau</div>
              <label className="index-value-toggle" style={{ marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={Boolean(form.replaceClassSpellCounts)} onChange={(e) => set('replaceClassSpellCounts', e.target.checked)} />
                Remplacer les sorts de la classe parente
              </label>
              {form.replaceClassSpellCounts ? (
                <>
                  <p className="race-form-hint">Ces valeurs remplacent celles de la classe pour les joueurs de cette sous-classe.</p>
                  <div className="race-form-row">
                    <div className="race-form-field race-form-field--grow">
                      <label>Sorts magiques / niveau</label>
                      <input type="number" value={form.nombreSortsMagiques ?? ''} onChange={(e) => set('nombreSortsMagiques', e.target.value)} />
                    </div>
                    <div className="race-form-field race-form-field--grow">
                      <label>Sorts physiques / niveau</label>
                      <input type="number" value={form.nombreSortsPhysiques ?? ''} onChange={(e) => set('nombreSortsPhysiques', e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="race-form-hint" style={{ opacity: 0.6 }}>Les sorts de la classe parente sont utilisés.</p>
              )}
            </div>

            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Verrou de race</div>
              <RaceLockFields value={form.allowedRaces} races={races} onChange={(v) => set('allowedRaces', v)} />
            </div>
          </div>
          <div className="race-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="race-form-save-btn" disabled={!canSave} onClick={save}>
              {initial ? 'Enregistrer' : 'Créer la sous-classe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SousClassesPanel() {
  const {
    customSubclasses, customClasses, customClassCategories, customRaces, customMaitriseEntries, customArchetypes,
    addSubclass, updateSubclass, deleteSubclass,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSubclass, setEditingSubclass] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const raceLockOptions = getRaceOptionsForLocks(customRaces);
  const archetypes = asArray(customArchetypes);
  const archetypeRoots = archetypes.filter((a) => !a.parentId);
  const archetypeChildrenOf = (id) => archetypes.filter((a) => String(a.parentId) === String(id));
  const classes = asArray(customClasses);
  const classCategories = asArray(customClassCategories);
  const maitrises = asArray(customMaitriseEntries);
  const entries = asArray(customSubclasses);

  const filtered = entries.filter((sc) => (
    (classeFilter === 'all' || sc.classe === classeFilter)
    && (includesText(sc.nom, search) || includesText(sc.classe, search) || includesText(sc.description, search))
  ));

  const handleSave = (form) => {
    const payload = { ...form, key: form.key || slugifyKey(form.nom) };
    if (editingSubclass) updateSubclass(editingSubclass.id, payload);
    else addSubclass(payload);
    setShowForm(false);
    setEditingSubclass(null);
  };

  const handleDelete = (sc) => {
    setConfirmDelete({
      title: 'Supprimer la sous-classe',
      message: `Supprimer "${sc.nom}" ?`,
      onConfirm: () => deleteSubclass(sc.id),
    });
  };

  const renderSubclassCard = (sc, entryIndex) => {
    const parentClass = classes.find((c) => (c.key || slugifyKey(c.nom)) === sc.classe || c.nom === sc.classe);
    const color = classCategories.find((c) => c.key === parentClass?.type)?.couleur || '#8888aa';
    // La maîtrise se déclare enfant d'une sous-classe à sa propre création
    // (voir MaitriseDefPanel, champ sousClasses) — ici on ne fait que
    // dériver l'affichage inverse, pas de champ à part sur la sous-classe.
    const scKey = sc.key || slugifyKey(sc.nom);
    const linkedMaitrises = maitrises.filter((m) => asArray(m.sousClasses).includes(scKey));
    return (
      <div key={`${sc.nom}-${entryIndex}`} className="entry-card" style={{ '--entry-color': color }}>
        <div className="entry-card-top">
          <div className="entry-card-badge">{sc.nom.trim().charAt(0).toUpperCase()}</div>
          <div className="entry-card-body">
            <span className="entry-card-kicker">Sous-classe — {parentClass?.nom || sc.classe || '—'}</span>
            <h3 className="entry-card-title">{sc.nom}</h3>
          </div>
        </div>
        <div className="entry-card-detail">
          <span>
            Archétype : <b>{sc.archetypeId != null
              ? (archetypes.find((a) => String(a.id) === String(sc.archetypeId))?.nom || '—')
              : `Hérite de ${parentClass?.nom || 'la classe'}`}</b>
          </span>
          <span>
            Dés : <b>{sc.replaceClassResourceDice ? resourceDiceSummary(sc) : `Hérite de ${parentClass?.nom || 'la classe'}`}</b>
          </span>
          <span>
            Par niveau : <b>{sc.replaceClassSpellCounts
              ? `${sc.nombreSortsMagiques ?? 0} sort(s) magique(s) · ${sc.nombreSortsPhysiques ?? 0} sort(s) physique(s)`
              : `Hérite de ${parentClass?.nom || 'la classe'}`} · {sc.nombreCompetences ?? 0} compétence(s)</b>
          </span>
          {linkedMaitrises.length > 0 && (
            <span>Maîtrises : <b>{linkedMaitrises.map((m) => m.label || m.nom).join(', ')}</b></span>
          )}
          {asArray(sc.allowedRaces).length > 0 && (
            <span>Races : <b>{asArray(sc.allowedRaces).map((k) => raceLockOptions.find((r) => r.key === k)?.nom || k).join(', ')}</b></span>
          )}
        </div>
        {sc.description && <div className="entry-card-desc">{sc.description}</div>}
        <div className="entry-card-actions">
          <button className="admin-btn" onClick={() => { setEditingSubclass(sc); setShowForm(true); }}>Modifier</button>
          <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(sc)}>Supprimer</button>
        </div>
      </div>
    );
  };

  const classOptions = [...new Set(entries.map((sc) => sc.classe).filter(Boolean))];

  const categories = classes
    .filter((cls) => classeFilter === 'all' || (cls.key || slugifyKey(cls.nom)) === classeFilter)
    .filter((cls) => filtered.some((sc) => sc.classe === (cls.key || slugifyKey(cls.nom)) || sc.classe === cls.nom))
    .map((cls) => ({
      key: cls.key || slugifyKey(cls.nom),
      nom: cls.nom,
      couleur: classCategories.find((c) => c.key === cls.type)?.couleur || '#8888aa',
    }));

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        {classes.length === 0 ? (
          <p className="race-form-hint">Créez d'abord des classes avant d'ajouter des sous-classes.</p>
        ) : (
          <button className="admin-btn admin-btn--add" onClick={() => { setEditingSubclass(null); setShowForm(true); }}>+ Nouvelle sous-classe</button>
        )}
      </div>

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
        <SubclassFormModal
          initial={editingSubclass}
          classes={classes}
          classCategories={classCategories}
          races={raceLockOptions}
          archetypeRoots={archetypeRoots}
          archetypeChildrenOf={archetypeChildrenOf}
          onClose={() => { setShowForm(false); setEditingSubclass(null); }}
          onSave={handleSave}
        />
      )}

      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        total={entries.length}
        fields={[{ key: 'classe', label: 'Classe', value: classeFilter, onChange: setClasseFilter, options: uniqueOptions(classes.map((c) => c.key || slugifyKey(c.nom)), 'Toutes') }]}
      />

      {entries.length === 0 ? (
        <div className="index-empty">
          {classes.length === 0
            ? 'Aucune classe trouvée — créez des classes en premier.'
            : 'Aucune sous-classe créée. Les sous-classes permettent de spécialiser une classe.'}
        </div>
      ) : categories.length === 0 ? (
        <div className="index-empty">Aucune sous-classe correspondant aux filtres.</div>
      ) : (
        <CategoryAccordionList
          categories={categories}
          entriesForCategory={(category) =>
            filtered.filter((sc) => sc.classe === category.key || sc.classe === category.nom)
          }
          renderContent={(category, categoryEntries) => (
            <div className="entry-card-grid entry-card-grid--wide">
              {categoryEntries.length > 0 ? categoryEntries.map(renderSubclassCard) : (
                <div className="index-empty">Aucune sous-classe dans cette classe.</div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
