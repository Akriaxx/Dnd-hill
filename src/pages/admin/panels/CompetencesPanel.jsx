import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor, { SmartText } from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, TagColorPicker } from '../AdminShared';
import {
  asArray,
  includesText,
  DEFAULT_COMPETENCE_CATEGORIES,
  BLANK_COMP,
} from '../adminUtils';

function KnowledgeCategoryModal({ existingKeys, initial, title = 'Nouvelle catégorie', onClose, onSave }) {
  const [nom, setNom] = useState(initial?.nom || '');
  const [couleur, setCouleur] = useState(initial?.couleur || '#d77ee8');
  const key = nom.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const conflict = !initial && existingKeys.has(key);
  const canSave = nom.trim().length > 0 && !conflict;

  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{title}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="comp-form-row">
            <div className="comp-form-field comp-form-field--grow">
              <label>Nom *</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Combat" autoFocus />
              {conflict && <span style={{ color: '#c84a4a', fontSize: '0.8em' }}>Clé déjà utilisée</span>}
            </div>
            <TagColorPicker value={couleur} onChange={setCouleur} />
          </div>
        </div>
        <div className="comp-form-footer">
          <button className="admin-btn" onClick={onClose}>Annuler</button>
          <button className="race-form-save-btn" disabled={!canSave} onClick={() => onSave({ nom: nom.trim(), couleur, key })}>
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompetencesPanel() {
  const {
    customCompetenceCategories,
    customCompetences,
    customClasses,
    customSubclasses,
    customLevelRules,
    addCompetenceCategory,
    addCompetence,
    updateCompetence,
    deleteCompetence,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [classeFilter, setClasseFilter] = useState('all');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_COMP);
  const [editingCompetence, setEditingCompetence] = useState(null);
  const [viewingCompetence, setViewingCompetence] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const classeOptions = asArray(customClasses).map((c) => c.nom).filter(Boolean);
  const levelOptions = asArray(customLevelRules).slice().sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  const scOptions = form.classe
    ? asArray(customSubclasses).filter((s) => s.classe === form.classe).map((s) => s.nom)
    : [];

  const categories = [
    ...DEFAULT_COMPETENCE_CATEGORIES,
    ...asArray(customCompetenceCategories),
  ];
  const existingCategoryKeys = new Set(categories.map((c) => c.key));

  const competenceEntries = asArray(customCompetences).map((c) => ({
    ...c,
    categoryKey: c.categoryKey || 'general',
  }));

  const filteredCompetences = competenceEntries.filter((c) => (
    (typeFilter === 'all' || c.type === typeFilter)
    && (categoryFilter === 'all' || c.categoryKey === categoryFilter)
    && (classeFilter === 'all' || c.classe === classeFilter || (!c.classe && classeFilter === ''))
    && (
      includesText(c.nom, search)
      || includesText(c.description, search)
      || includesText(c.classe, search)
      || includesText(c.sousClasse, search)
    )
  ));

  const handleSave = () => {
    if (!form.nom.trim()) return;
    const payload = {
      ...form,
      restrictLevel: form.restrictLevel ? Number(form.restrictLevel) : null,
    };
    if (editingCompetence) updateCompetence(editingCompetence.id, payload);
    else addCompetence(payload);
    closeForm();
  };

  const openCreate = () => {
    setEditingCompetence(null);
    setForm(BLANK_COMP);
    setShowForm(true);
  };

  const openEdit = (competence) => {
    setEditingCompetence(competence);
    setForm({ ...BLANK_COMP, ...competence });
    setShowForm(true);
  };

  const closeForm = () => {
    setForm(BLANK_COMP);
    setEditingCompetence(null);
    setShowForm(false);
  };

  const requestDelete = (competence) => {
    setConfirmDelete({
      title: 'Supprimer la compétence',
      message: `Supprimer "${competence.nom}" ?`,
      onConfirm: () => deleteCompetence(competence.id),
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={openCreate}>+ Nouvelle compétence</button>
      </div>

      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={existingCategoryKeys}
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => { addCompetenceCategory(payload); setShowCategoryForm(false); }}
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

      {viewingCompetence && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setViewingCompetence(null)}>
          <div className="index-modal index-modal--wide competence-detail-modal">
            <div className="index-modal-header">
              <h3>{viewingCompetence.nom}</h3>
              <button className="admin-btn" onClick={() => setViewingCompetence(null)}>✕ Fermer</button>
            </div>
            <div className="competence-detail-body" style={{ '--competence-color': viewingCompetence.tagColor || '#d77ee8' }}>
              <div className="competence-detail-meta">
                <span>{viewingCompetence.type === 'actif' ? 'Actif' : 'Passif'}</span>
                <span>{categories.find((c) => c.key === (viewingCompetence.categoryKey || 'general'))?.nom || 'Général'}</span>
                <span>{viewingCompetence.classe || 'Toutes les classes'}</span>
                {viewingCompetence.sousClasse && <span>{viewingCompetence.sousClasse}</span>}
                {viewingCompetence.restrictLevel && (
                  <span>Niveau {viewingCompetence.restrictLevel} minimum</span>
                )}
              </div>
              <div className="competence-detail-description">
                {viewingCompetence.description
                  ? <SmartText text={viewingCompetence.description} />
                  : 'Aucune description renseignée.'}
              </div>
              <div className="competence-detail-actions">
                <button className="admin-btn" onClick={() => { setViewingCompetence(null); openEdit(viewingCompetence); }}>Modifier</button>
                <button className="admin-btn admin-btn--danger" onClick={() => { setViewingCompetence(null); requestDelete(viewingCompetence); }}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingCompetence ? 'Modifier la compétence' : 'Nouvelle compétence'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Annuler</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => sf('nom', e.target.value)} placeholder="Ex: Frappe Éclair" />
                </div>
                <div className="comp-form-field">
                  <label>Type</label>
                  <div className="comp-type-toggle">
                    {['actif', 'passif'].map((t) => (
                      <button
                        key={t}
                        className={`comp-type-btn${form.type === t ? ' active' : ''}`}
                        onClick={() => sf('type', t)}
                      >
                        {t === 'actif' ? '⚡ Actif' : '🛡 Passif'}
                      </button>
                    ))}
                  </div>
                </div>
                <TagColorPicker value={form.tagColor} onChange={(v) => sf('tagColor', v)} />
              </div>

              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Classe (optionnel)</label>
                  <select value={form.classe} onChange={(e) => { sf('classe', e.target.value); sf('sousClasse', ''); }}>
                    <option value="">Toutes les classes</option>
                    {classeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Sous-classe (optionnel)</label>
                  <select value={form.sousClasse} onChange={(e) => sf('sousClasse', e.target.value)} disabled={!form.classe || scOptions.length === 0}>
                    <option value="">Toutes les sous-classes</option>
                    {scOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Catégorie</label>
                  <select value={form.categoryKey || 'general'} onChange={(e) => sf('categoryKey', e.target.value)}>
                    {categories.map((c) => <option key={c.key} value={c.key}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="comp-form-field">
                  <label>Niveau minimum</label>
                  <select
                    value={form.restrictLevel ?? ''}
                    onChange={(e) => sf('restrictLevel', e.target.value === '' ? null : Number(e.target.value))}
                    disabled={levelOptions.length === 0}
                  >
                    <option value="">Aucun</option>
                    {levelOptions.map((rule) => (
                      <option key={rule.level} value={rule.level}>{rule.title || `Niveau ${rule.level}`}</option>
                    ))}
                  </select>
                  {levelOptions.length === 0 && (
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}>Aucun niveau créé (Gameplay → Leveling).</span>
                  )}
                </div>
              </div>

              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor
                  value={form.description}
                  onChange={(v) => sf('description', v)}
                  placeholder="Décrivez la compétence… Tapez { pour insérer un tag dynamique."
                />
              </div>
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={closeForm}>Annuler</button>
              <button className="race-form-save-btn" onClick={handleSave} disabled={!form.nom.trim()}>
                {editingCompetence ? '💾 Enregistrer' : '✦ Créer la compétence'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filteredCompetences.length}
        total={competenceEntries.length}
        fields={[
          { key: 'type', label: 'Type', value: typeFilter, onChange: setTypeFilter, options: [
            { value: 'all', label: 'Tous' },
            { value: 'actif', label: 'Actif' },
            { value: 'passif', label: 'Passif' },
          ]},
          { key: 'category', label: 'Catégorie', value: categoryFilter, onChange: setCategoryFilter, options: [
            { value: 'all', label: 'Toutes' },
            ...categories.map((c) => ({ value: c.key, label: c.nom })),
          ]},
          { key: 'classe', label: 'Classe', value: classeFilter, onChange: setClasseFilter, options: [
            { value: 'all', label: 'Toutes' },
            { value: '', label: 'Génériques' },
            ...classeOptions.map((c) => ({ value: c, label: c })),
          ]},
        ]}
      />

      <div className="entry-card-grid entry-card-grid--wide">
        {filteredCompetences.length === 0 && (
          <div className="index-empty">Aucune compétence trouvée.</div>
        )}
        {filteredCompetences.map((c) => (
          <div key={c.id} className="entry-card" style={{ '--entry-color': c.tagColor || '#d77ee8' }}>
            <div className="entry-card-top">
              <div className="entry-card-badge">{c.type === 'actif' ? 'A' : 'P'}</div>
              <div className="entry-card-body">
                <span className="entry-card-kicker">
                  {c.type === 'actif' ? 'Actif' : 'Passif'}{c.restrictLevel ? ` — Niv. ${c.restrictLevel}+` : ''}
                </span>
                <h3 className="entry-card-title">{c.nom}</h3>
              </div>
            </div>
            <div className="entry-card-meta">
              <span>{categories.find((cat) => cat.key === (c.categoryKey || 'general'))?.nom || 'Général'}</span>
              <span>{c.classe || 'Toutes les classes'}</span>
              {c.sousClasse && <span>{c.sousClasse}</span>}
            </div>
            {c.description && (
              <div className="entry-card-desc entry-card-desc--clamped">
                <SmartText text={c.description} />
              </div>
            )}
            <div className="entry-card-actions">
              <button className="admin-btn" onClick={() => setViewingCompetence(c)}>Consulter</button>
              <button className="admin-btn" onClick={() => openEdit(c)}>Modifier</button>
              <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(c)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
