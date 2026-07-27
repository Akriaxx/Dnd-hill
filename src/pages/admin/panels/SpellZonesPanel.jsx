import { useMemo, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import { ConfirmModal, AdminFilterPanel, TagColorPicker } from '../AdminShared';
import { asArray, slugifyKey, mergeTemporaryRows, normalizeSpellRanks } from '../adminUtils';
import { SPELL_ZONE_CELL_COUNT, DEFAULT_SPELL_ZONE_PLAYER, DEFAULT_SPELL_ZONES } from '../spellDefaults';

const createSpellZoneCells = (activeCells = [], playerCell = DEFAULT_SPELL_ZONE_PLAYER) => (
  Array.from({ length: SPELL_ZONE_CELL_COUNT }, (_, index) => ({
    index,
    active: asArray(activeCells).includes(index),
    player: index === playerCell,
  }))
);

const BLANK_SPELL_ZONE = {
  nom: '',
  famille: 'Cône',
  portee: 1,
  couleur: '#bcecff',
  description: '',
  minRank: 1,
  playerCell: DEFAULT_SPELL_ZONE_PLAYER,
  cells: [],
};

const normalizeSpellZoneFamily = (value = '') =>
  value.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const findPreviousSpellZone = (zones, famille, portee) => {
  const familyKey = normalizeSpellZoneFamily(famille);
  const targetRange = Number(portee) || 1;
  return [...asArray(zones)]
    .filter((zone) =>
      normalizeSpellZoneFamily(zone.famille || 'Zone') === familyKey &&
      (Number(zone.portee) || 1) < targetRange
    )
    .sort((a, b) => (Number(b.portee) || 1) - (Number(a.portee) || 1))[0] || null;
};

const MAX_SPELL_RANK = 10;

const getSpellRankOptions = (ranks = []) => {
  const normalized = normalizeSpellRanks(ranks);
  const byValue = new Map(normalized.map((rank) => [rank.value, rank]));
  return Array.from({ length: MAX_SPELL_RANK }, (_, index) => {
    const value = index + 1;
    return byValue.get(value) || {
      id: `fallback-rank-${value}`,
      value,
      label: `Rang ${value}`,
      couleur: '#c8a84a',
      fallback: true,
    };
  });
};

function SpellZoneGrid({ zone, editable = false, mode = 'zone', onToggleCell, onSetPlayer }) {
  const playerCell = Number.isInteger(zone?.playerCell) ? zone.playerCell : DEFAULT_SPELL_ZONE_PLAYER;
  const cells = createSpellZoneCells(zone?.cells, playerCell);

  return (
    <div
      className={`spell-zone-grid${editable ? ' is-editable' : ''}`}
      style={{ '--zone-color': zone?.couleur || '#bcecff' }}
      aria-label="Matrice de zone de sort"
    >
      {cells.map((cell) => (
        <button
          key={cell.index}
          type="button"
          className={['spell-zone-cell', cell.active ? 'is-active' : '', cell.player ? 'is-player' : ''].filter(Boolean).join(' ')}
          disabled={!editable}
          onClick={() => {
            if (!editable) return;
            if (mode === 'player') onSetPlayer?.(cell.index);
            else if (!cell.player) onToggleCell?.(cell.index);
          }}
          title={cell.player ? 'Position du lanceur' : `Cellule ${cell.index + 1}`}
        >
          {cell.player ? '✚' : ''}
        </button>
      ))}
    </div>
  );
}

export default function SpellZonesPanel() {
  const customSpellZones = useAdminStore((state) => state.customSpellZones || []);
  const customSpellRanks = useAdminStore((state) => state.customSpellRanks || []);
  const addSpellZone = useAdminStore((state) => state.addSpellZone);
  const updateSpellZone = useAdminStore((state) => state.updateSpellZone);
  const deleteSpellZone = useAdminStore((state) => state.deleteSpellZone);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [paintMode, setPaintMode] = useState('zone');
  const [form, setForm] = useState(BLANK_SPELL_ZONE);
  const [activeZoneByFamily, setActiveZoneByFamily] = useState({});

  const zones = useMemo(() => mergeTemporaryRows(DEFAULT_SPELL_ZONES, customSpellZones), [customSpellZones]);
  const rankOptions = useMemo(() => getSpellRankOptions(customSpellRanks), [customSpellRanks]);
  const rankLabelByValue = useMemo(
    () => new Map(rankOptions.map((rank) => [rank.value, rank.label])),
    [rankOptions]
  );
  const previousZone = useMemo(
    () => (!editingZone ? findPreviousSpellZone(zones, form.famille, form.portee) : null),
    [editingZone, zones, form.famille, form.portee]
  );
  const filteredZones = zones.filter((zone) => {
    const haystack = `${zone.nom || ''} ${zone.famille || ''} ${zone.description || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const totalFamilyCount = useMemo(() => (
    new Set(zones.map((zone) => normalizeSpellZoneFamily(zone.famille || 'Zone'))).size
  ), [zones]);
  const familyGroups = useMemo(() => {
    const map = new Map();
    filteredZones.forEach((zone) => {
      const familyKey = normalizeSpellZoneFamily(zone.famille || 'Zone');
      if (!map.has(familyKey)) map.set(familyKey, { key: familyKey, famille: zone.famille || 'Zone', zones: [] });
      map.get(familyKey).zones.push(zone);
    });
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        zones: [...group.zones].sort((a, b) => (Number(a.portee) || 1) - (Number(b.portee) || 1)),
      }))
      .sort((a, b) => a.famille.localeCompare(b.famille));
  }, [filteredZones]);

  const openCreate = () => { setEditingZone(null); setPaintMode('zone'); setForm(BLANK_SPELL_ZONE); setShowForm(true); };

  const openNextZone = (baseZone) => {
    const nextRange = (Number(baseZone.portee) || 1) + 1;
    const family = baseZone.famille || 'Zone';
    setEditingZone(null);
    setPaintMode('zone');
    setForm({
      ...BLANK_SPELL_ZONE,
      nom: `${family} x${nextRange}`,
      famille: family,
      portee: nextRange,
      couleur: baseZone.couleur || BLANK_SPELL_ZONE.couleur,
      description: baseZone.description || '',
      minRank: Math.min(10, Math.max(1, (Number(baseZone.minRank) || Number(baseZone.portee) || 1) + 1)),
      playerCell: Number.isInteger(baseZone.playerCell) ? baseZone.playerCell : DEFAULT_SPELL_ZONE_PLAYER,
      cells: asArray(baseZone.cells),
    });
    setShowForm(true);
  };

  const openEdit = (zone) => {
    if (zone.isDefault) return;
    setEditingZone(zone);
    setPaintMode('zone');
    setForm({
      ...BLANK_SPELL_ZONE,
      ...zone,
      playerCell: Number.isInteger(zone.playerCell) ? zone.playerCell : DEFAULT_SPELL_ZONE_PLAYER,
      cells: asArray(zone.cells),
    });
    setShowForm(true);
  };

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleCell = (index) => {
    setForm((current) => {
      const cells = new Set(asArray(current.cells));
      if (cells.has(index)) cells.delete(index);
      else cells.add(index);
      return { ...current, cells: [...cells].sort((a, b) => a - b) };
    });
  };

  const setPlayerCell = (index) => {
    setForm((current) => ({
      ...current,
      playerCell: index,
      cells: asArray(current.cells).filter((cell) => cell !== index),
    }));
  };

  const inheritPreviousZone = () => {
    if (!previousZone) return;
    setForm((current) => ({
      ...current,
      couleur: current.couleur || previousZone.couleur || BLANK_SPELL_ZONE.couleur,
      playerCell: Number.isInteger(previousZone.playerCell) ? previousZone.playerCell : DEFAULT_SPELL_ZONE_PLAYER,
      cells: asArray(previousZone.cells),
    }));
  };

  const save = () => {
    const nom = form.nom.trim();
    if (!nom) return;
    const payload = {
      ...form,
      nom,
      key: editingZone?.key || slugifyKey(nom),
      famille: form.famille.trim() || 'Zone',
      portee: Math.max(1, Number(form.portee) || 1),
      minRank: Math.min(10, Math.max(1, Number(form.minRank) || 1)),
      playerCell: Number.isInteger(form.playerCell) ? form.playerCell : DEFAULT_SPELL_ZONE_PLAYER,
      cells: asArray(form.cells).filter((cell) => cell !== form.playerCell),
    };
    if (editingZone) {
      updateSpellZone(editingZone.id, payload);
    } else {
      addSpellZone(payload);
      const familyKey = normalizeSpellZoneFamily(payload.famille);
      setActiveZoneByFamily((current) => {
        const next = { ...current };
        delete next[familyKey];
        return next;
      });
    }
    setShowForm(false);
  };

  return (
    <div className="admin-panel spell-zones-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--primary" type="button" onClick={openCreate}>+ Famille</button>
      </div>

      <div className="spell-types-intro">
        <div>
          <h3>Zones de sorts</h3>
          <p>
            Les zones servent de gabarits visuels pour les sorts : une croix bleue indique la position du lanceur,
            et les cellules noircies représentent la zone réellement affectée. Chaque famille (Cône, Ligne...) a une
            seule carte, et ses niveaux de portée s'affichent dans des onglets pour éviter d'empiler les cartes.
          </p>
        </div>
        <div className="spell-types-badge">{totalFamilyCount} famille{totalFamilyCount > 1 ? 's' : ''} · {zones.length} niveaux</div>
      </div>

      <AdminFilterPanel search={search} onSearch={setSearch} count={filteredZones.length} total={zones.length} />

      <div className="spell-zone-card-grid">
        {familyGroups.map((group) => {
          const lastZone = group.zones[group.zones.length - 1];
          const activeId = activeZoneByFamily[group.key] ?? lastZone?.id;
          const activeZone = group.zones.find((zone) => zone.id === activeId) || lastZone;
          return (
            <article key={group.key} className="spell-zone-card" style={{ '--zone-color': activeZone.couleur || '#bcecff' }}>
              <div className="spell-zone-card-head">
                <div>
                  <span className="spell-zone-family">{group.zones.length} niveau{group.zones.length > 1 ? 'x' : ''}</span>
                  <h3>{group.famille}</h3>
                </div>
                <button className="admin-btn admin-btn--add" type="button" onClick={() => openNextZone(lastZone)}>+ Niveau</button>
              </div>

              <div className="spell-zone-tabs">
                {group.zones.map((zone) => (
                  <button
                    key={zone.id || zone.key}
                    type="button"
                    className={`spell-zone-tab${zone.id === activeZone.id ? ' is-active' : ''}`}
                    onClick={() => setActiveZoneByFamily((current) => ({ ...current, [group.key]: zone.id }))}
                  >
                    Portée {zone.portee || 1}
                  </button>
                ))}
              </div>

              <div className="spell-zone-card-main">
                <div className="spell-zone-card-copy">
                  <span className="spell-zone-family">{activeZone.nom}</span>
                  <p>{activeZone.description || 'Aucune description.'}</p>
                  <div className="spell-zone-unlock">
                    Débloqué de {rankLabelByValue.get(activeZone.minRank || 1) || `Rang ${activeZone.minRank || 1}`} à {rankLabelByValue.get(10) || 'Rang 10'}
                  </div>
                </div>
                <SpellZoneGrid zone={activeZone} />
              </div>
              <div className="spell-zone-card-footer">
                <span>{asArray(activeZone.cells).length} cellule(s) affectée(s)</span>
                <div>
                  <button className="admin-btn" type="button" disabled={activeZone.isDefault} onClick={() => openEdit(activeZone)}>Modifier</button>
                  <button
                    className="admin-btn"
                    type="button"
                    disabled={activeZone.isDefault}
                    onClick={() => setConfirmDelete({
                      title: 'Supprimer la zone',
                      message: `Supprimer "${activeZone.nom}" ?`,
                      dangerLabel: 'Supprimer',
                      onConfirm: () => deleteSpellZone(activeZone.id),
                    })}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {showForm && (
        <div className="index-modal-backdrop">
          <div className="index-modal index-modal--wide spell-zone-builder">
            <div className="index-modal-header">
              <h3>{editingZone ? 'Modifier la zone' : 'Nouvelle zone'}</h3>
              <button className="admin-btn" type="button" onClick={() => setShowForm(false)}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(event) => set('nom', event.target.value)} placeholder="Ex: Cône x4" />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Famille</label>
                  <input value={form.famille} onChange={(event) => set('famille', event.target.value)} placeholder="Cône, ligne, aura..." />
                </div>
              </div>
              <div className="comp-form-row">
                <div className="comp-form-field">
                  <label>Portée</label>
                  <input type="number" min="1" value={form.portee} onChange={(event) => set('portee', event.target.value)} />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Débloqué à partir du rang</label>
                  <select value={form.minRank || 1} onChange={(event) => set('minRank', Number(event.target.value))}>
                    {rankOptions.map((rank) => (
                      <option key={rank.value} value={rank.value}>{rank.label}</option>
                    ))}
                  </select>
                </div>
                <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(value) => set('description', value)} placeholder="Décris le gabarit et son usage..." />
              </div>

              <div className="spell-zone-editor">
                <div className="spell-zone-editor-head">
                  <div>
                    <h4>Matrice symétrique</h4>
                    <p>Choisis la position du lanceur, puis peins les cellules affectées.</p>
                  </div>
                  <div className="spell-zone-editor-actions">
                    {!editingZone && previousZone && (
                      <button className="admin-btn" type="button" onClick={inheritPreviousZone}>
                        Reprendre {previousZone.nom}
                      </button>
                    )}
                    <div className="spell-zone-mode-switch">
                      <button className={paintMode === 'zone' ? 'is-active' : ''} type="button" onClick={() => setPaintMode('zone')}>Zone</button>
                      <button className={paintMode === 'player' ? 'is-active' : ''} type="button" onClick={() => setPaintMode('player')}>Croix bleue</button>
                    </div>
                  </div>
                </div>
                <SpellZoneGrid
                  zone={form}
                  editable
                  mode={paintMode}
                  onToggleCell={toggleCell}
                  onSetPlayer={setPlayerCell}
                />
              </div>

              <div className="comp-form-footer">
                <button className="admin-btn" type="button" onClick={() => setShowForm(false)}>Annuler</button>
                <button className="race-form-save-btn" type="button" onClick={save}>{editingZone ? 'Enregistrer' : 'Créer la zone'}</button>
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
    </div>
  );
}
