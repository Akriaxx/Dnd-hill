import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, SectionGrid, AdminCard, TagColorPicker } from '../AdminShared';
import { asArray, includesText } from '../adminUtils';
import { BLANK_ITEM_RARITY } from '../itemUtils';

export default function ItemRaretePanel() {
  const { customItemRarities, addItemRarity, updateItemRarity, deleteItemRarity } = useAdminStore();
  const rarities = asArray(customItemRarities).slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const [showForm, setShowForm] = useState(false);
  const [editingRarity, setEditingRarity] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(BLANK_ITEM_RARITY);
  const [search, setSearch] = useState('');

  const set = (key, value) => setForm((c) => ({ ...c, [key]: value }));
  const canSave = form.nom.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (editingRarity) updateItemRarity(editingRarity.id, form);
    else addItemRarity(form);
    setForm(BLANK_ITEM_RARITY);
    setEditingRarity(null);
    setShowForm(false);
  };

  const startCreate = () => { setEditingRarity(null); setForm(BLANK_ITEM_RARITY); setShowForm(true); };
  const startEdit = (rarity) => { setEditingRarity(rarity); setForm({ ...BLANK_ITEM_RARITY, ...rarity }); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditingRarity(null); setForm(BLANK_ITEM_RARITY); };

  const filtered = rarities.filter((r) => includesText(r.nom, search) || includesText(r.description, search));

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showForm ? cancelForm : startCreate}>
          {showForm ? 'Fermer' : '+ Nouvelle rareté'}
        </button>
      </div>

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && cancelForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingRarity ? 'Modifier la rareté' : 'Nouvelle rareté'}</h3>
              <button className="admin-btn" onClick={cancelForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Commun, Rare, Légendaire..." />
                </div>
                <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(value) => set('description', value)} placeholder="Description de la rareté..." />
              </div>
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!canSave} onClick={handleSave}>
                  {editingRarity ? 'Enregistrer' : 'Créer la rareté'}
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={rarities.length} />

      {rarities.length === 0 && (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucune rareté définie.</p>
      )}

      <SectionGrid>
        {filtered.map((rarity) => (
          <AdminCard
            key={rarity.id}
            title={rarity.nom}
            badgeColor={rarity.couleur}
            desc={rarity.description}
            onEdit={() => startEdit(rarity)}
            onDelete={() => setConfirmDelete({ title: 'Supprimer la rareté', message: `Supprimer "${rarity.nom}" ?`, dangerLabel: 'Supprimer', onConfirm: () => deleteItemRarity(rarity.id) })}
          />
        ))}
      </SectionGrid>
    </div>
  );
}
