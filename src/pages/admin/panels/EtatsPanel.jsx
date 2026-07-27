import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor, { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, TagColorPicker, SubclassPicker, MaitriseLockFields, CategoryAccordionList } from '../AdminShared';
import {
  asArray,
  includesText,
  slugifyKey,
  BLANK_ETAT_CATEGORY,
  BLANK_ETAT,
  REMOVAL_CONDITION_TYPES,
  SAVE_TIMING_OPTIONS,
  blankRemovalCondition,
} from '../adminUtils';

function EtatCategoryModal({ existingKeys, initial, subclasses, classes, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...BLANK_ETAT_CATEGORY, ...(initial || {}) }));
  const [error, setError] = useState('');
  const sf = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const toggleSubclass = (key) => {
    const current = new Set(asArray(form.sousClasses));
    if (current.has(key)) current.delete(key); else current.add(key);
    sf('sousClasses', [...current]);
  };
  const toggleManySubclasses = (keys, shouldSelect) => {
    const current = new Set(asArray(form.sousClasses));
    keys.forEach((key) => (shouldSelect ? current.add(key) : current.delete(key)));
    sf('sousClasses', [...current]);
  };

  const handleSave = () => {
    const nom = form.nom.trim();
    const key = initial?.key || slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (!initial && existingKeys.has(key)) { setError('Cette catégorie existe déjà.'); return; }
    onSave({ ...form, nom, key, sousClasses: asArray(form.sousClasses) });
  };

  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{initial ? 'Modifier la catégorie' : "Nouvelle catégorie d'état"}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="comp-form-row">
            <div className="comp-form-field comp-form-field--grow">
              <label>Nom *</label>
              <input value={form.nom} onChange={(e) => sf('nom', e.target.value)} placeholder="Ex: Malédiction" autoFocus />
            </div>
            <TagColorPicker value={form.couleur} onChange={(v) => sf('couleur', v)} />
          </div>
          {error && <div className="player-field-error">{error}</div>}
          {subclasses.length === 0 ? (
            <div className="race-lock-panel">
              <div className="race-lock-head"><span>Classe(s) / sous-classe(s) pouvant appliquer cette catégorie</span></div>
              <p className="race-form-hint">Aucune sous-classe créée — laissez vide pour l'instant, ou créez d'abord une classe puis une sous-classe.</p>
            </div>
          ) : (
            <SubclassPicker
              subclasses={subclasses}
              classes={classes}
              selected={asArray(form.sousClasses)}
              onToggle={toggleSubclass}
              onToggleMany={toggleManySubclasses}
              label="Classe(s) / sous-classe(s) pouvant appliquer cette catégorie"
              hint="Laissez vide pour que tout le monde puisse appliquer un état de cette catégorie."
            />
          )}
        </div>
        <div className="comp-form-footer">
          <button className="admin-btn" onClick={onClose}>Annuler</button>
          <button className="race-form-save-btn" onClick={handleSave} disabled={!form.nom.trim()}>
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemovalConditionRow({ condition, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...condition, [k]: v });
  return (
    <div className="comp-form-row removal-condition-row">
      <div className="comp-form-field">
        <label>Type de condition</label>
        <select value={condition.type} onChange={(e) => onChange(blankRemovalCondition(e.target.value))}>
          {REMOVAL_CONDITION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {condition.type === 'save' && (
        <>
          <div className="comp-form-field">
            <label>Caractéristique / compétence</label>
            <input value={condition.stat || ''} onChange={(e) => set('stat', e.target.value)} placeholder="Ex: Sagesse" />
          </div>
          <div className="comp-form-field">
            <label>Moment</label>
            <select value={condition.timing || 'end_of_turn'} onChange={(e) => set('timing', e.target.value)}>
              {SAVE_TIMING_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="comp-form-field">
            <label>Difficulté</label>
            <input value={condition.difficulty || ''} onChange={(e) => set('difficulty', e.target.value)} placeholder="Ex: niveau du sort" />
          </div>
          <div className="comp-form-field">
            <label>Durée max (tours)</label>
            <input
              type="number"
              min="0"
              value={condition.durationTurns ?? ''}
              onChange={(e) => set('durationTurns', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="Illimité"
            />
          </div>
        </>
      )}

      {condition.type === 'spell_type' && (
        <div className="comp-form-field comp-form-field--grow">
          <label>Type(s) de sort dissipant l'état</label>
          <input
            value={asArray(condition.spellTypes).join(', ')}
            onChange={(e) => set('spellTypes', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
            placeholder="Ex: Exorcisme, Guérison"
          />
        </div>
      )}

      {condition.type === 'action' && (
        <>
          <div className="comp-form-field">
            <label>Type d'action</label>
            <input value={condition.actionType || ''} onChange={(e) => set('actionType', e.target.value)} placeholder="Ex: Action Simple" />
          </div>
          <div className="comp-form-field">
            <label>Qui peut l'effectuer</label>
            <select value={condition.by || 'self'} onChange={(e) => set('by', e.target.value)}>
              <option value="self">Soi-même</option>
              <option value="adjacent_ally">Allié adjacent</option>
              <option value="self_or_adjacent_ally">Soi-même ou allié adjacent</option>
            </select>
          </div>
          <div className="comp-form-field comp-form-field--grow">
            <label>Description</label>
            <input value={condition.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Ex: Premiers soins (un bandage)" />
          </div>
        </>
      )}

      {condition.type === 'positional' && (
        <div className="comp-form-field comp-form-field--grow">
          <label>Description</label>
          <input value={condition.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Ex: Sortir de la zone d'effet" />
        </div>
      )}

      <button type="button" className="admin-btn admin-btn--danger" onClick={onRemove}>✕</button>
    </div>
  );
}

function removalConditionSummary(condition) {
  if (condition.type === 'save') {
    const timing = SAVE_TIMING_OPTIONS.find((t) => t.key === condition.timing)?.label || condition.timing;
    return `Jet de ${condition.stat || '?'} (${timing}, DD ${condition.difficulty || '?'})`;
  }
  if (condition.type === 'spell_type') return `Sort: ${asArray(condition.spellTypes).join(', ') || '?'}`;
  if (condition.type === 'action') return `${condition.actionType || 'Action'} — ${condition.description || ''}`;
  return condition.description || 'Condition positionnelle';
}

export default function EtatsPanel() {
  const {
    customEtatCategories,
    customEtats,
    customClasses,
    customSubclasses,
    customMaitriseEntries,
    addEtatCategory,
    updateEtatCategory,
    deleteEtatCategory,
    addEtat,
    updateEtat,
    deleteEtat,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_ETAT);
  const [editingEtat, setEditingEtat] = useState(null);
  const [viewingEtat, setViewingEtat] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const classes = asArray(customClasses);
  const subclasses = asArray(customSubclasses);
  const maitrises = asArray(customMaitriseEntries);
  const categories = asArray(customEtatCategories);
  const etats = asArray(customEtats);

  const filteredEtats = etats.filter((e) => (
    (categoryFilter === 'all' || asArray(e.categoryKeys).includes(categoryFilter))
    && (includesText(e.nom, search) || includesText(e.description, search) || includesText(e.effects, search))
  ));

  const openCreateCategory = () => { setEditingCategory(null); setShowCategoryForm(true); };
  const openEditCategory = (category) => { setEditingCategory(category); setShowCategoryForm(true); };
  const requestDeleteCategory = (category) => {
    const affected = etats.filter((e) => asArray(e.categoryKeys).includes(category.key));
    const toDeleteCount = affected.filter((e) => asArray(e.categoryKeys).length <= 1).length;
    setConfirmDelete({
      title: 'Supprimer la catégorie',
      message: toDeleteCount > 0
        ? `Supprimer "${category.nom}" ? ${toDeleteCount} état(s) n'ayant que cette catégorie seront supprimés aussi (les autres resteront, juste détachés de "${category.nom}").`
        : `Supprimer "${category.nom}" ?`,
      onConfirm: () => deleteEtatCategory(category.key),
    });
  };

  const openCreate = () => { setEditingEtat(null); setForm({ ...BLANK_ETAT, categoryKeys: categories[0] ? [categories[0].key] : [] }); setShowForm(true); };
  const openEdit = (etat) => { setEditingEtat(etat); setForm({ ...BLANK_ETAT, ...etat }); setShowForm(true); };
  const closeForm = () => { setForm(BLANK_ETAT); setEditingEtat(null); setShowForm(false); };

  const toggleFormCategory = (key) => {
    const current = new Set(asArray(form.categoryKeys));
    if (current.has(key)) current.delete(key); else current.add(key);
    sf('categoryKeys', [...current]);
  };

  const handleSave = () => {
    if (!form.nom.trim() || asArray(form.categoryKeys).length === 0) return;
    if (editingEtat) updateEtat(editingEtat.id, form);
    else addEtat(form);
    closeForm();
  };

  const requestDelete = (etat) => {
    setConfirmDelete({
      title: "Supprimer l'état",
      message: `Supprimer "${etat.nom}" ?`,
      onConfirm: () => deleteEtat(etat.id),
    });
  };

  const addCondition = () => sf('removalConditions', [...asArray(form.removalConditions), blankRemovalCondition()]);
  const updateCondition = (index, next) => {
    const list = [...asArray(form.removalConditions)];
    list[index] = next;
    sf('removalConditions', list);
  };
  const removeCondition = (index) => sf('removalConditions', asArray(form.removalConditions).filter((_, i) => i !== index));

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={openCreateCategory}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={openCreate} disabled={categories.length === 0}>+ Nouvel état</button>
      </div>
      {categories.length === 0 && (
        <div className="index-empty">Créez d'abord une catégorie (Malédiction, Psychique…) avant d'ajouter des états.</div>
      )}

      {showCategoryForm && (
        <EtatCategoryModal
          existingKeys={new Set(categories.map((c) => c.key))}
          initial={editingCategory}
          classes={classes}
          subclasses={subclasses}
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => {
            if (editingCategory) updateEtatCategory(editingCategory.key, payload);
            else addEtatCategory(payload);
            setShowCategoryForm(false);
          }}
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

      {viewingEtat && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setViewingEtat(null)}>
          <div className="index-modal index-modal--wide competence-detail-modal">
            <div className="index-modal-header">
              <h3>{viewingEtat.nom}</h3>
              <button className="admin-btn" onClick={() => setViewingEtat(null)}>✕ Fermer</button>
            </div>
            <div className="competence-detail-body" style={{ '--competence-color': viewingEtat.tagColor || '#d77ee8' }}>
              <div className="competence-detail-meta">
                {asArray(viewingEtat.categoryKeys).map((key) => (
                  <span key={key}>{categories.find((c) => c.key === key)?.nom || key}</span>
                ))}
                {asArray(viewingEtat.maitriseKeys).map((key) => (
                  <span key={key}>{maitrises.find((m) => m.key === key)?.label || key}</span>
                ))}
              </div>
              {viewingEtat.description && (
                <div className="competence-detail-description">
                  <SmartText text={viewingEtat.description} />
                </div>
              )}
              {viewingEtat.effects && (
                <>
                  <h4>Effets gameplay</h4>
                  <div className="competence-detail-description">
                    <SmartText text={viewingEtat.effects} />
                  </div>
                </>
              )}
              {asArray(viewingEtat.removalConditions).length > 0 && (
                <>
                  <h4>Fin de l'état</h4>
                  <ul>
                    {viewingEtat.removalConditions.map((condition, i) => (
                      <li key={i}>{removalConditionSummary(condition)}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="competence-detail-actions">
                <button className="admin-btn" onClick={() => { setViewingEtat(null); openEdit(viewingEtat); }}>Modifier</button>
                <button className="admin-btn admin-btn--danger" onClick={() => { setViewingEtat(null); requestDelete(viewingEtat); }}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal index-modal--wide">
            <div className="index-modal-header">
              <h3>{editingEtat ? "Modifier l'état" : 'Nouvel état'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Annuler</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => sf('nom', e.target.value)} placeholder="Ex: Aveuglé" />
                </div>
                <TagColorPicker value={form.tagColor} onChange={(v) => sf('tagColor', v)} />
              </div>

              <div className="race-lock-panel">
                <div className="race-lock-head">
                  <span>Catégorie(s) *</span>
                  <small>{asArray(form.categoryKeys).length === 0 ? 'Aucune sélectionnée' : `${form.categoryKeys.length} sélectionnée(s)`}</small>
                </div>
                <p className="race-form-hint">
                  Un même état peut appartenir à plusieurs catégories (ex: "Aveuglé" accessible via Malédiction pour un sorcier ET via une autre catégorie pour un paladin). Au moins une catégorie requise.
                </p>
                <div className="race-lock-grid">
                  {categories.map((c) => (
                    <label key={c.key} className={`race-lock-choice${asArray(form.categoryKeys).includes(c.key) ? ' active' : ''}`} style={{ '--race-lock-color': c.couleur || '#d77ee8' }}>
                      <input type="checkbox" checked={asArray(form.categoryKeys).includes(c.key)} onChange={() => toggleFormCategory(c.key)} />
                      <span>{c.nom}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => sf('description', v)} placeholder="Description narrative de l'état…" />
              </div>

              <div className="comp-form-field">
                <label>Effets gameplay</label>
                <SmartDescEditor value={form.effects} onChange={(v) => sf('effects', v)} placeholder="Conséquences mécaniques : malus, restrictions d'action, dégâts…" />
              </div>

              <MaitriseLockFields
                value={form.maitriseKeys}
                maitrises={maitrises}
                onChange={(v) => sf('maitriseKeys', v)}
              />

              <div className="removal-conditions-block">
                <div className="race-lock-head">
                  <span>Fin de l'état</span>
                  <button type="button" className="admin-btn" onClick={addCondition}>+ Ajouter une condition</button>
                </div>
                {asArray(form.removalConditions).length === 0 && (
                  <p className="race-form-hint">Aucune condition de fin — cet état ne se dissipera jamais tout seul.</p>
                )}
                {asArray(form.removalConditions).map((condition, i) => (
                  <RemovalConditionRow
                    key={i}
                    condition={condition}
                    onChange={(next) => updateCondition(i, next)}
                    onRemove={() => removeCondition(i)}
                  />
                ))}
              </div>
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={closeForm}>Annuler</button>
              <button className="race-form-save-btn" onClick={handleSave} disabled={!form.nom.trim() || asArray(form.categoryKeys).length === 0}>
                {editingEtat ? '💾 Enregistrer' : '✦ Créer l\'état'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filteredEtats.length}
        total={etats.length}
        fields={[
          { key: 'category', label: 'Catégorie', value: categoryFilter, onChange: setCategoryFilter, options: [
            { value: 'all', label: 'Toutes' },
            ...categories.map((c) => ({ value: c.key, label: c.nom })),
          ]},
        ]}
      />

      <CategoryAccordionList
        categories={categories.map((c) => ({
          ...c,
          actions: (
            <span className="role-row-actions" onClick={(e) => e.stopPropagation()}>
              <button className="admin-btn" onClick={() => openEditCategory(c)}>Modifier</button>
              <button className="admin-btn admin-btn--danger" onClick={() => requestDeleteCategory(c)}>Supprimer</button>
            </span>
          ),
        }))}
        entriesForCategory={(category) => filteredEtats.filter((e) => asArray(e.categoryKeys).includes(category.key))}
        emptyLabel="Aucun état dans cette catégorie."
        renderEntry={(e) => (
          <div key={e.id} className="entry-card" style={{ '--entry-color': e.tagColor || '#d77ee8' }}>
            <div className="entry-card-top">
              <div className="entry-card-badge">{(e.nom || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="entry-card-body">
                <span className="entry-card-kicker">État</span>
                <h3 className="entry-card-title">{e.nom}</h3>
              </div>
            </div>
            {asArray(e.maitriseKeys).length > 0 && (
              <div className="entry-card-meta">
                {e.maitriseKeys.map((key) => (
                  <span key={key}>{maitrises.find((m) => m.key === key)?.label || key}</span>
                ))}
              </div>
            )}
            {e.description && (
              <div className="entry-card-desc entry-card-desc--clamped">
                <SmartText text={e.description} />
              </div>
            )}
            <div className="entry-card-actions">
              <button className="admin-btn" onClick={() => setViewingEtat(e)}>Consulter</button>
              <button className="admin-btn" onClick={() => openEdit(e)}>Modifier</button>
              <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(e)}>Supprimer</button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
