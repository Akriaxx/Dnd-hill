import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, includesText, mergeTemporaryRows } from '../adminUtils';
import { DEFAULT_MAITRISE_ENTRIES } from '../maitriseDefaults';

// Sélecteur pour rattacher une maîtrise à ses sous-classes parentes.
// Choisir une par une parmi des dizaines/centaines de sous-classes (ex:
// 57 sur 168) au clic serait trop lent quelle que soit la présentation —
// le vrai gain vient des actions groupées : "tout" par classe (une
// maîtrise couvre souvent une classe entière) et "tout" sur les résultats
// filtrés (rechercher un mot commun puis tout ajouter d'un coup). La liste
// reste visible en permanence (pas un menu qui se rouvre) pour qu'on voie
// d'un coup d'œil ce qui est déjà coché en parcourant/filtrant.
function SubclassPicker({ subclasses, classes, selected, onToggle, onToggleMany }) {
  const [query, setQuery] = useState('');
  const selectedSet = new Set(selected);
  const keyOf = (item) => item.key || slugifyKey(item.nom);

  const filtered = query
    ? subclasses.filter((sc) => includesText(sc.nom, query) || includesText(sc.classe, query))
    : subclasses;
  const filteredKeys = filtered.map(keyOf);
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every((k) => selectedSet.has(k));

  const groups = classes
    .filter((cls) => filtered.some((sc) => sc.classe === keyOf(cls) || sc.classe === cls.nom))
    .map((cls) => {
      const items = filtered.filter((sc) => sc.classe === keyOf(cls) || sc.classe === cls.nom);
      const itemKeys = items.map(keyOf);
      return {
        key: keyOf(cls),
        nom: cls.nom,
        items,
        allSelected: itemKeys.length > 0 && itemKeys.every((k) => selectedSet.has(k)),
      };
    });

  return (
    <div className="race-lock-panel">
      <div className="race-lock-head">
        <span>Sous-classe(s) parente(s)</span>
        <small>{selected.length === 0 ? 'Toutes les sous-classes' : `${selected.length} sélectionnée(s)`}</small>
      </div>
      <p className="race-form-hint">Laissez vide pour rendre cette maîtrise disponible pour toutes les sous-classes.</p>

      <input
        className="subclass-picker-search"
        type="text"
        placeholder="Filtrer par nom de sous-classe ou de classe…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filteredKeys.length > 0 && (
        <button
          type="button"
          className="subclass-picker-bulk"
          onClick={() => onToggleMany(filteredKeys, !allFilteredSelected)}
        >
          {allFilteredSelected ? '✕ Tout retirer' : '✓ Tout ajouter'} ({filteredKeys.length} résultat{filteredKeys.length > 1 ? 's' : ''})
        </button>
      )}

      <div className="subclass-picker-list">
        {groups.length === 0 ? (
          <p className="subclass-picker-empty">Aucune sous-classe correspondante.</p>
        ) : groups.map((group) => (
          <div key={group.key} className="subclass-picker-group">
            <button
              type="button"
              className="subclass-picker-group-label"
              onClick={() => onToggleMany(group.items.map(keyOf), !group.allSelected)}
            >
              <span>{group.nom}</span>
              <em>{group.allSelected ? 'Tout retirer' : 'Tout ajouter'}</em>
            </button>
            <div className="subclass-picker-group-items">
              {group.items.map((sc) => {
                const scKey = keyOf(sc);
                const isSelected = selectedSet.has(scKey);
                return (
                  <button
                    type="button"
                    key={scKey}
                    className={`subclass-picker-option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => onToggle(scKey)}
                  >
                    {isSelected && <b>✓</b>}
                    <span>{sc.nom}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BLANK_MAITRISE_ENTRY = {
  key: '',
  label: '',
  description: '',
  couleur: '#c8a84a',
  // Sous-classe(s) parente(s) : Classe → Sous-classe → Maîtrise, une
  // maîtrise se crée comme enfant d'une ou plusieurs sous-classes. Laisser
  // vide rend la maîtrise disponible pour toutes les sous-classes (même
  // convention que l'ancien allowedMaitrises côté sous-classe — sert
  // notamment aux ~50 maîtrises par défaut ci-dessous, volontairement
  // génériques/non rattachées).
  sousClasses: [],
};

export default function MaitriseDefPanel() {
  const { customMaitriseEntries, customSubclasses, customClasses, addMaitriseEntry, updateMaitriseEntry, deleteMaitriseEntry } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_MAITRISE_ENTRY);

  const entries = mergeTemporaryRows(DEFAULT_MAITRISE_ENTRIES, customMaitriseEntries);
  const subclasses = asArray(customSubclasses);
  const classes = asArray(customClasses);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSubclass = (key) => {
    const current = new Set(asArray(form.sousClasses));
    if (current.has(key)) current.delete(key); else current.add(key);
    sf('sousClasses', [...current]);
  };

  // Ajoute/retire tout un lot d'un coup (une classe entière, ou tout le
  // résultat filtré) — voir SubclassPicker.
  const toggleManySubclasses = (keys, shouldSelect) => {
    const current = new Set(asArray(form.sousClasses));
    keys.forEach((key) => (shouldSelect ? current.add(key) : current.delete(key)));
    sf('sousClasses', [...current]);
  };

  const handleSave = () => {
    if (!form.label.trim()) return;
    const payload = {
      ...form,
      key: form.key.trim() || slugifyKey(form.label),
      sousClasses: asArray(form.sousClasses),
    };
    if (editing) updateMaitriseEntry(editing.id, payload);
    else addMaitriseEntry(payload);
    setForm(BLANK_MAITRISE_ENTRY);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => { setEditing(null); setForm(BLANK_MAITRISE_ENTRY); setShowForm(true); };
  const openEdit = (entry) => {
    if (entry.isDefault) return;
    setEditing(entry); setForm({ ...BLANK_MAITRISE_ENTRY, ...entry }); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(BLANK_MAITRISE_ENTRY); };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? closeForm : openCreate}>
          {showForm ? 'Fermer' : '+ Nouvelle entrée'}
        </button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? "Modifier l'entrée" : 'Nouvelle entrée'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.label} onChange={(e) => sf('label', e.target.value)} placeholder="Ex: Épées longues" />
                </div>
                <TagColorPicker value={form.couleur} onChange={(v) => sf('couleur', v)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => sf('description', v)} />
              </div>
              {subclasses.length === 0 ? (
                <div className="race-lock-panel">
                  <div className="race-lock-head"><span>Sous-classe(s) parente(s)</span></div>
                  <p className="race-form-hint">Aucune sous-classe créée — laissez vide pour l'instant, ou créez d'abord une classe puis une sous-classe.</p>
                </div>
              ) : (
                <SubclassPicker
                  subclasses={subclasses}
                  classes={classes}
                  selected={asArray(form.sousClasses)}
                  onToggle={toggleSubclass}
                  onToggleMany={toggleManySubclasses}
                />
              )}
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={closeForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!form.label.trim()} onClick={handleSave}>
                  {editing ? '💾 Enregistrer' : "✦ Créer l'entrée"}
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
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      {entries.length === 0 && !showForm && (
        <p className="comp-empty">Aucune entrée de maîtrise.</p>
      )}

      <div className="admin-panel-grid">
        {entries.map((entry) => (
          <div key={entry.id} className="admin-card admin-card--custom index-card" style={{ '--index-color': entry.couleur || '#c8a84a' }}>
            <div className="admin-card-header">
              <div className="admin-card-title">
                <span className="index-card-color" />
                {entry.label}
              </div>
            </div>
            {entry.description && (
              <div className="admin-card-desc admin-card-desc--smart">
                <SmartText text={entry.description} />
              </div>
            )}
            <div className="admin-card-meta">
              {asArray(entry.sousClasses).length === 0
                ? 'Toutes les sous-classes'
                : asArray(entry.sousClasses).map((key) => subclasses.find((sc) => (sc.key || slugifyKey(sc.nom)) === key)?.nom || key).join(' · ')}
            </div>
            <div className="admin-card-actions">
              <button className="admin-btn" disabled={entry.isDefault} onClick={() => openEdit(entry)}>Modifier</button>
              <button
                className="admin-btn admin-btn--danger"
                disabled={entry.isDefault}
                onClick={() => setConfirmDelete({
                  title: "Supprimer l'entrée",
                  message: `Supprimer "${entry.label}" ?`,
                  onConfirm: () => deleteMaitriseEntry(entry.id),
                })}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
