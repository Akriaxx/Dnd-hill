import { useState } from 'react';
import { useCharacterStore } from '../../store/characterStore';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

const EMPTY_ITEM = { nom: '', qte: 1, poids: 0, rarete: 'common', desc: '' };

export default function InventoryTab({ char }) {
  const { addInventoryItem, removeInventoryItem, updateInventoryItem } = useCharacterStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_ITEM);

  const totalWeight = char.inventaire.reduce((sum, i) => sum + i.qte * i.poids, 0);

  const handleAdd = () => {
    if (!form.nom.trim()) return;
    addInventoryItem(char.id, form);
    setForm(EMPTY_ITEM);
    setAdding(false);
  };

  return (
    <>
      <section>
        <h2 className="section-heading">
          Inventaire
          <span style={{ fontSize: 14, color: 'var(--dim)', fontFamily: 'var(--font-caps)', letterSpacing: 1, fontWeight: 400 }}>
            {char.inventaire.length} objets · {totalWeight.toFixed(1)} kg
          </span>
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Objet</th>
                <th>Qté</th>
                <th>Poids</th>
                <th>Rareté</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {char.inventaire.map((item) => (
                <tr key={item.id}>
                  <td><span className="item-name">{item.nom}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '2px 8px', fontSize: 16 }}
                        onClick={() => item.qte > 1 && updateInventoryItem(char.id, item.id, { qte: item.qte - 1 })}
                      >−</button>
                      <span className="item-qty">{item.qte}</span>
                      <button
                        className="btn-ghost"
                        style={{ padding: '2px 8px', fontSize: 16 }}
                        onClick={() => updateInventoryItem(char.id, item.id, { qte: item.qte + 1 })}
                      >+</button>
                    </div>
                  </td>
                  <td><span className="item-weight">{item.poids} kg</span></td>
                  <td><span className={`item-rarity ${item.rarete}`}>{RARITY_LABELS[item.rarete]}</span></td>
                  <td style={{ color: 'var(--dim)', fontSize: 14, maxWidth: 220 }}>{item.desc}</td>
                  <td>
                    <button
                      className="btn-danger"
                      onClick={() => removeInventoryItem(char.id, item.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add form */}
        {adding ? (
          <div style={{ marginTop: 20, background: '#1a1608', border: '1px solid #3a2e18', borderRadius: 3, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Nom', field: 'nom', type: 'text' },
                { label: 'Quantité', field: 'qte', type: 'number' },
                { label: 'Poids (kg)', field: 'poids', type: 'number' },
              ].map(({ label, field, type }) => (
                <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                  <label>{label}</label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  />
                </div>
              ))}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Rareté</label>
                <select
                  value={form.rarete}
                  onChange={(e) => setForm((f) => ({ ...f, rarete: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2318', borderRadius: 2, color: 'var(--text)', padding: '9px 14px', width: '100%', fontFamily: 'Sen, sans-serif' }}
                >
                  {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Description</label>
              <input
                type="text"
                value={form.desc}
                onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '8px 24px' }} onClick={handleAdd}>
                Ajouter
              </button>
              <button className="btn-ghost" onClick={() => { setAdding(false); setForm(EMPTY_ITEM); }}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
            + Ajouter un objet
          </button>
        )}
      </section>
    </>
  );
}
