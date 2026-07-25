import { useMemo, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor, { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, includesText, mergeTemporaryRows } from '../adminUtils';
import { DEFAULT_SPELL_TYPES } from '../spellDefaults';

const BLANK_SPELL_TYPE = {
  nom: '',
  couleur: '#7ddcff',
  modes: [],
  accroche: '',
  description: '',
  usages: [],
  contraintes: [],
  champs: [],
  sortie: '',
};

const MODE_OPTIONS = [
  { key: 'ciblage', label: 'Ciblage (cible unique ou multiple)' },
  { key: 'zone', label: 'Zone (forme et portée)' },
];

function StringListField({ label, hint, value = [], onChange, placeholder }) {
  const rows = asArray(value);
  const setRow = (index, text) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? text : row)));
  const addRow = () => onChange([...rows, '']);
  const removeRow = (index) => onChange(rows.filter((_, rowIndex) => rowIndex !== index));

  return (
    <div className="comp-form-field">
      <label>{label}</label>
      {hint && <span style={{ fontSize: '0.8em', opacity: 0.6 }}>{hint}</span>}
      {rows.map((row, index) => (
        <div className="comp-form-row" key={index}>
          <div className="comp-form-field comp-form-field--grow">
            <input value={row} onChange={(e) => setRow(index, e.target.value)} placeholder={placeholder} />
          </div>
          <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeRow(index)}>✕</button>
        </div>
      ))}
      <button type="button" className="admin-btn" onClick={addRow}>+ Ligne</button>
    </div>
  );
}

export default function SpellTypesPanel() {
  const customSpellTypes = useAdminStore((state) => state.customSpellTypes || []);
  const addSpellType = useAdminStore((state) => state.addSpellType);
  const updateSpellType = useAdminStore((state) => state.updateSpellType);
  const deleteSpellType = useAdminStore((state) => state.deleteSpellType);

  const [search, setSearch] = useState('');
  const [openType, setOpenType] = useState(DEFAULT_SPELL_TYPES[0].key);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_SPELL_TYPE);

  const types = useMemo(() => mergeTemporaryRows(DEFAULT_SPELL_TYPES, customSpellTypes), [customSpellTypes]);
  const filteredTypes = types.filter((type) =>
    includesText(type.nom, search) || includesText(type.accroche, search) || includesText(type.description, search)
  );

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditingType(null);
    setForm(BLANK_SPELL_TYPE);
    setShowForm(true);
  };

  const openEdit = (type) => {
    if (type.isDefault) return;
    setEditingType(type);
    setForm({
      ...BLANK_SPELL_TYPE,
      ...type,
      modes: asArray(type.modes),
      usages: asArray(type.usages),
      contraintes: asArray(type.contraintes),
      champs: asArray(type.champs),
    });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingType(null); setForm(BLANK_SPELL_TYPE); };

  const save = () => {
    const nom = form.nom.trim();
    if (!nom) return;
    const payload = {
      ...form,
      nom,
      key: editingType?.key || slugifyKey(nom),
      couleur: form.couleur || BLANK_SPELL_TYPE.couleur,
      accroche: form.accroche.trim(),
      description: form.description.trim(),
      sortie: form.sortie.trim(),
      modes: asArray(form.modes),
      usages: asArray(form.usages).map((row) => row.trim()).filter(Boolean),
      contraintes: asArray(form.contraintes).map((row) => row.trim()).filter(Boolean),
      champs: asArray(form.champs).map((row) => row.trim()).filter(Boolean),
    };
    if (editingType) updateSpellType(editingType.id, payload);
    else addSpellType(payload);
    cancelForm();
  };

  return (
    <div className="admin-panel spell-types-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? cancelForm : openCreate}>
          {showForm ? 'Fermer type' : '+ Type'}
        </button>
      </div>

      <div className="spell-types-intro">
        <div>
          <h3>Types de sorts</h3>
          <p>
            Un type ne stocke pas seulement une couleur et une description : il impose aussi les champs et
            contraintes utiles au sort qui s'en sert.
          </p>
        </div>
        <div className="spell-types-badge">{types.length} type{types.length > 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelForm()}>
          <div className="index-modal index-modal--wide">
            <div className="index-modal-header">
              <h3>{editingType ? 'Modifier le type' : 'Nouveau type de sort'}</h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Arpenteur" />
                </div>
                <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
              </div>
              <div className="comp-form-field">
                <label>Accroche</label>
                <input value={form.accroche} onChange={(e) => set('accroche', e.target.value)} placeholder="Phrase courte qui résume le type" />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(value) => set('description', value)} placeholder="Explique ce que fait un sort de ce type..." />
              </div>
              <div className="comp-form-field">
                <label>Mode(s) de ciblage autorisé(s)</label>
                {MODE_OPTIONS.map((mode) => (
                  <label key={mode.key} className="index-value-toggle">
                    <input
                      type="checkbox"
                      checked={asArray(form.modes).includes(mode.key)}
                      onChange={(e) => {
                        const current = new Set(asArray(form.modes));
                        if (e.target.checked) current.add(mode.key); else current.delete(mode.key);
                        set('modes', [...current]);
                      }}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
              <StringListField label="Usages" value={form.usages} onChange={(rows) => set('usages', rows)} placeholder="Ex: Téléportation courte ou longue" />
              <StringListField label="Contraintes" value={form.contraintes} onChange={(rows) => set('contraintes', rows)} placeholder="Ex: Doit définir une distance ou une portée" />
              <StringListField label="Champs requis par le builder" value={form.champs} onChange={(rows) => set('champs', rows)} placeholder="Ex: Distance en cases" />
              <div className="comp-form-field">
                <label>Sortie attendue</label>
                <textarea value={form.sortie} onChange={(e) => set('sortie', e.target.value)} placeholder="Ex: téléporte une cible consentante à 6 cases..." rows={2} />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!form.nom.trim()} onClick={save}>
                  {editingType ? 'Enregistrer' : 'Créer le type'}
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
          dangerLabel={confirmDelete.dangerLabel}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      <AdminFilterPanel search={search} onSearch={setSearch} count={filteredTypes.length} total={types.length} />

      <div className="spell-types-grid">
        {filteredTypes.map((type) => {
          const isOpen = openType === type.key;
          return (
            <article
              key={type.id || type.key}
              className={`spell-type-card${isOpen ? ' is-open' : ''}`}
              style={{ '--spell-type-color': type.couleur }}
            >
              <button className="spell-type-head" type="button" onClick={() => setOpenType(isOpen ? '' : type.key)}>
                <span className="spell-type-color-dot" />
                <span>
                  <strong>{type.nom}</strong>
                  <em>{type.accroche}</em>
                </span>
                <span className="spell-type-toggle">{isOpen ? 'Réduire' : 'Examiner'}</span>
              </button>

              <div className={`spell-type-body${isOpen ? ' is-open' : ''}`}>
                <div className="spell-type-body-inner">
                  <SmartText className="spell-type-desc" text={type.description} plainTags />

                  <div className="spell-type-rule-grid">
                    <div className="spell-type-rule-block">
                      <h4>Usages</h4>
                      <ul>
                        {asArray(type.usages).map((usage) => <li key={usage}>{usage}</li>)}
                      </ul>
                    </div>
                    <div className="spell-type-rule-block">
                      <h4>Contraintes</h4>
                      <ul>
                        {asArray(type.contraintes).map((contrainte) => <li key={contrainte}>{contrainte}</li>)}
                      </ul>
                    </div>
                    <div className="spell-type-rule-block spell-type-rule-block--wide">
                      <h4>Champs requis par le builder</h4>
                      <div className="spell-type-field-list">
                        {asArray(type.champs).map((champ) => <span key={champ}>{champ}</span>)}
                      </div>
                    </div>
                    <div className="spell-type-rule-block spell-type-rule-block--wide">
                      <h4>Sortie attendue</h4>
                      <p>{type.sortie}</p>
                    </div>
                  </div>

                  <div className="spell-type-card-actions">
                    <span>{type.isDefault ? 'Type par défaut' : ''}</span>
                    <div>
                      <button className="admin-btn" type="button" disabled={type.isDefault} onClick={() => openEdit(type)}>Modifier</button>
                      <button
                        className="admin-btn"
                        type="button"
                        disabled={type.isDefault}
                        onClick={() => setConfirmDelete({
                          title: 'Supprimer le type',
                          message: `Supprimer "${type.nom}" ?`,
                          dangerLabel: 'Supprimer',
                          onConfirm: () => deleteSpellType(type.id),
                        })}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
