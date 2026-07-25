import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal } from '../AdminShared';
import { asArray } from '../adminUtils';

const BLANK_CARAC = {
  nom: '',
  cle: '',
  description: '',
  pointsParModificateur: 2,
  ordre: 0,
};

export default function CaracteristiquesPanel() {
  const {
    customCaracteristiques,
    addCaracteristique,
    updateCaracteristique,
    deleteCaracteristique,
  } = useAdminStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_CARAC);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const caracs = asArray(customCaracteristiques).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK_CARAC, ordre: caracs.length });
    setShowForm(true);
  };

  const openEdit = (carac) => {
    setEditing(carac);
    setForm({ ...BLANK_CARAC, ...carac });
    setShowForm(true);
  };

  const closeForm = () => {
    setForm(BLANK_CARAC);
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.nom.trim() || !form.cle.trim()) return;
    const payload = {
      ...form,
      cle: form.cle.toUpperCase().trim(),
      pointsParModificateur: Math.max(1, Number(form.pointsParModificateur) || 1),
      ordre: Number(form.ordre) || 0,
    };
    if (editing) updateCaracteristique(editing.id, payload);
    else addCaracteristique(payload);
    closeForm();
  };

  const requestDelete = (carac) => {
    setConfirmDelete({
      title: 'Supprimer la caractéristique',
      message: `Supprimer "${carac.nom}" (${carac.cle}) ?`,
      onConfirm: () => deleteCaracteristique(carac.id),
    });
  };

  const exampleModifier = (ppm) => {
    const steps = [0, ppm, ppm * 2, ppm * 3];
    return steps.map((pts) => `${pts}pts → +${Math.floor(pts / ppm)}`).join('  |  ');
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={openCreate}>
          + Nouvelle caractéristique
        </button>
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
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editing ? 'Modifier la caractéristique' : 'Nouvelle caractéristique'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Annuler</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input
                    value={form.nom}
                    onChange={(e) => sf('nom', e.target.value)}
                    placeholder="Ex : Force"
                  />
                </div>
                <div className="comp-form-field" style={{ width: '110px' }}>
                  <label>Clé * (abréviation)</label>
                  <input
                    value={form.cle}
                    onChange={(e) => sf('cle', e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="Ex : FOR"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>
                <div className="comp-form-field" style={{ width: '80px' }}>
                  <label>Ordre</label>
                  <input
                    type="number"
                    min={0}
                    value={form.ordre}
                    onChange={(e) => sf('ordre', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="comp-form-field">
                <label>Points par modificateur *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.pointsParModificateur}
                    onChange={(e) => sf('pointsParModificateur', Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: '80px' }}
                  />
                  <span style={{ color: 'var(--dim)', fontSize: '12px', fontFamily: 'monospace' }}>
                    {exampleModifier(Math.max(1, Number(form.pointsParModificateur) || 1))}
                  </span>
                </div>
                <span style={{ color: 'var(--dim)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Tous les <strong>{Math.max(1, Number(form.pointsParModificateur) || 1)}</strong> points distribués dans cette caractéristique donnent +1 au modificateur.
                </span>
              </div>

              <div className="comp-form-field">
                <label>Description (optionnel)</label>
                <SmartDescEditor value={form.description} onChange={(value) => sf('description', value)} placeholder="Décrivez la caractéristique… Tapez { pour insérer un tag dynamique." />
              </div>
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={closeForm}>Annuler</button>
              <button
                className="race-form-save-btn"
                onClick={handleSave}
                disabled={!form.nom.trim() || !form.cle.trim()}
              >
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {caracs.length === 0 ? (
        <div className="admin-empty">
          <p>Aucune caractéristique définie.</p>
          <p>Créez les attributs de base de votre système (ex : Force, Dextérité, Constitution…)</p>
        </div>
      ) : (
        <div className="carac-list">
          {caracs.map((carac) => (
            <div key={carac.id} className="carac-row">
              <div className="carac-row-cle">{carac.cle}</div>
              <div className="carac-row-info">
                <div className="carac-row-nom">{carac.nom}</div>
                {carac.description && (
                  <div className="carac-row-desc">{carac.description}</div>
                )}
                <div className="carac-row-meta">
                  Modificateur : +1 tous les <strong>{carac.pointsParModificateur}</strong> point{carac.pointsParModificateur > 1 ? 's' : ''}
                </div>
              </div>
              <div className="carac-row-actions">
                <button className="admin-btn" onClick={() => openEdit(carac)}>Modifier</button>
                <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(carac)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
