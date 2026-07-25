import { useState } from 'react';
import {
  HardHat, Shield, Wind, Hand, Link2, Footprints, Gem, Sword,
  Package, LayoutGrid, Circle,
} from 'lucide-react';
import ItemEffectSummary from '../admin/ItemEffectSummary';
import { useCharacterStore } from '../../store/characterStore';
import { useAdminStore } from '../../store/adminStore';
import { APTITUDES, RESISTANCES_DEF } from '../../data/gameData';

// ── Constants ────────────────────────────────────────────────────────────────

export const EQUIP_SLOTS_DEF = [
  { key: 'casque',   label: 'Casque',   accepts: ['casque'],                area: 'casque'   },
  { key: 'cou',      label: 'Cou',      accepts: ['cou', 'bijou', 'bague'], area: 'cou'      },
  { key: 'cape',     label: 'Cape',     accepts: ['cape'],                  area: 'cape'     },
  { key: 'torse',    label: 'Torse',    accepts: ['torse'],                 area: 'torse'    },
  { key: 'gants',    label: 'Gants',    accepts: ['gants'],                 area: 'gants'    },
  { key: 'bague1',   label: 'Bijou 1',  accepts: ['bague', 'bijou', 'cou'], area: 'bijou1'   },
  { key: 'ceinture', label: 'Ceinture', accepts: ['ceinture'],              area: 'ceinture' },
  { key: 'bague2',   label: 'Bijou 2',  accepts: ['bague', 'bijou', 'cou'], area: 'bijou2'   },
  { key: 'bottes',   label: 'Bottes',   accepts: ['bottes'],                area: 'bottes'   },
  { key: 'arme1',    label: 'Arme 1',   accepts: ['arme'],                  area: 'arme1'    },
  { key: 'arme2',    label: 'Arme 2',   accepts: ['arme'],                  area: 'arme2'    },
];

export const INV_CATEGORIES = [
  { key: 'tout',     label: 'Tout',     color: '#c8a84a' },
  { key: 'casque',   label: 'Casque',   color: '#a0c8e0' },
  { key: 'torse',    label: 'Torse',    color: '#c8a84a' },
  { key: 'cape',     label: 'Cape',     color: '#c0a0d8' },
  { key: 'gants',    label: 'Gants',    color: '#a8c8a0' },
  { key: 'ceinture', label: 'Ceinture', color: '#c8b480' },
  { key: 'bottes',   label: 'Bottes',   color: '#b08878' },
  { key: 'bijou',    label: 'Bijoux',   color: '#80d8e0' },
  { key: 'arme',     label: 'Arme',     color: '#e08080' },
];

const BIJOU_SLOTS = new Set(['bijou', 'bague', 'cou']);

export const RARITY_COLOR = {
  common: 'var(--dim)', uncommon: '#4ac87a', rare: '#4a7ac8',
  epic: '#8a4ac8', legendary: '#c8a84a',
};

// Module-level — survives re-renders, needed for DnD (dataTransfer is empty during dragover)
let _dndPayload = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const slugifyKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function normalizeEquipType(type) {
  const v = String(type ?? '').toLowerCase();
  if (v.startsWith('arme')) return 'arme';
  if (BIJOU_SLOTS.has(v)) return 'bijou';
  return v;
}

export function getItemEquipType(item) {
  return normalizeEquipType(item?.equipSlot ?? item?.type);
}

export function getInventoryItemCategory(item) {
  const categoryKey = getItemEquipType(item);
  const category = INV_CATEGORIES.find((cat) => cat.key === categoryKey);
  return category ?? {
    key: categoryKey || 'objet',
    label: item?.categorie || item?.category || item?.type || 'Objet',
    color: '#c8a84a',
  };
}

export function getItemRarityColor(item) {
  return (
    item?.rareteColor ||
    item?.rarityColor ||
    item?.couleurRarete ||
    item?.rarete?.color ||
    RARITY_COLOR[item?.rarete] ||
    'rgba(200, 168, 74, 0.45)'
  );
}

export function getItemEffectLookupOptions(customAptitudes = [], customResistanceEntries = []) {
  const aptitudeOptions = [
    ...APTITUDES.map((a) => ({ key: slugifyKey(a.nom), label: a.nom })),
    ...customAptitudes.map((a) => ({ key: a.key || slugifyKey(a.nom), label: a.nom })),
  ].filter((o, i, list) => o.key && list.findIndex((e) => e.key === o.key) === i);

  const resistanceOptions = [
    ...Object.entries(RESISTANCES_DEF).flatMap(([groupKey, group]) =>
      (group.items || []).map((label) => ({ key: `${groupKey}.${slugifyKey(label)}`, label }))
    ),
    ...customResistanceEntries.map((e) => ({ key: e.key || slugifyKey(e.label), label: e.label || e.key })),
  ].filter((o, i, list) => o.key && list.findIndex((e) => e.key === o.key) === i);

  return { aptitudeOptions, resistanceOptions };
}

export function slotAcceptsItem(slotDef, item) {
  if (!slotDef || !item) return false;
  const rawType = String(item.equipSlot ?? item.type ?? '').toLowerCase();
  const normalized = normalizeEquipType(rawType);
  return slotDef.key === rawType || slotDef.accepts.includes(rawType) || slotDef.accepts.includes(normalized);
}

// ── Sub-components ───────────────────────────────────────────────────────────

export function SlotIcon({ slotKey }) {
  const props = { size: 22, strokeWidth: 1.4, color: 'rgba(200,168,74,0.35)' };
  switch (slotKey) {
    case 'casque':   return <HardHat    {...props} />;
    case 'torse':    return <Shield     {...props} />;
    case 'cape':     return <Wind       {...props} />;
    case 'gants':    return <Hand       {...props} />;
    case 'ceinture': return <Link2      {...props} />;
    case 'bottes':   return <Footprints {...props} />;
    case 'cou':      return <Link2      {...props} />;
    case 'bague1':
    case 'bague2':   return <Gem        {...props} />;
    case 'arme1':
    case 'arme2':    return <Sword      {...props} />;
    default:         return <Package    {...props} />;
  }
}

export function CatSVG({ catKey, color = 'currentColor' }) {
  const props = { size: 18, color, strokeWidth: 1.6 };
  switch (catKey) {
    case 'tout':     return <LayoutGrid  {...props} />;
    case 'casque':   return <HardHat     {...props} />;
    case 'torse':    return <Shield      {...props} />;
    case 'cape':     return <Wind        {...props} />;
    case 'gants':    return <Hand        {...props} />;
    case 'ceinture': return <Link2       {...props} />;
    case 'bottes':   return <Footprints  {...props} />;
    case 'cou':      return <Link2       {...props} />;
    case 'bague':    return <Circle      {...props} />;
    case 'bijou':    return <Gem         {...props} />;
    case 'arme':     return <Sword       {...props} />;
    default:         return <Package     {...props} />;
  }
}

export function EquipSlotBox({ slotDef, equippedItem, onDrop, onUnequip, dragOver, onDragOver, onDragLeave, itemEffectOptions }) {
  const isEmpty = !equippedItem?.nom;
  return (
    <div
      className={`eqdoll-slot${isEmpty ? ' eqdoll-slot--empty' : ''}${dragOver ? ' eqdoll-slot--over' : ''}`}
      data-area={slotDef.area}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(e); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(e); }}
    >
      <div className="eqdoll-slot-head">
        <SlotIcon slotKey={slotDef.key} />
        <span className="eqdoll-slot-label">{slotDef.label}</span>
      </div>

      {isEmpty ? (
        <div className="eqdoll-slot-placeholder">Emplacement libre</div>
      ) : (
        <div
          className="eqdoll-slot-filled"
          draggable
          onDragStart={(e) => {
            const payload = {
              type: 'slot',
              slotKey: slotDef.key,
              item: { ...equippedItem, equipSlot: slotDef.key, type: normalizeEquipType(slotDef.key) },
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/json', JSON.stringify(payload));
            _dndPayload = payload;
          }}
          onDragEnd={() => { _dndPayload = null; }}
          onClick={onUnequip}
          title="Cliquer pour déséquiper"
        >
          <span className="eqdoll-item-name" style={{ color: RARITY_COLOR[equippedItem.rarete] || 'var(--gold2)' }}>
            {equippedItem.nom}
          </span>
          {equippedItem.desc && (
            <span className="eqdoll-item-desc">{equippedItem.desc}</span>
          )}
          <ItemEffectSummary item={equippedItem} {...itemEffectOptions} mode="compact" />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EquipementPanel({ char }) {
  const { equipItem, unequipSlot, equipFromInventory, unequipToInventory } = useCharacterStore();
  const { customAptitudes, customResistanceEntries } = useAdminStore();
  const liveChar = useCharacterStore((s) => s.getCharacter(char.id)) ?? char;
  const [dropOver, setDropOver]   = useState(null);
  const [catFilter, setCatFilter] = useState('tout');

  const itemEffectOptions = getItemEffectLookupOptions(customAptitudes, customResistanceEntries);
  const equip      = liveChar.equipement ?? {};
  const inventaire = liveChar.inventaire ?? [];

  const equippableItems = inventaire.filter((i) => getItemEquipType(i));

  const filteredItems = catFilter === 'tout'
    ? equippableItems
    : catFilter === 'bijou'
      ? equippableItems.filter((i) => normalizeEquipType(i.equipSlot) === 'bijou')
      : equippableItems.filter((i) => normalizeEquipType(i.equipSlot) === catFilter);

  const presentCats = new Set(equippableItems.map((i) => normalizeEquipType(i.equipSlot)));

  const handleSlotDrop = (e, slotDef) => {
    let parsedPayload = null;
    try { parsedPayload = JSON.parse(e.dataTransfer.getData('application/json')); } catch { /* empty */ }
    const payload = _dndPayload ?? parsedPayload;
    setDropOver(null);
    if (!payload) return;

    if (payload.type === 'inv') {
      const item = payload.item;
      if (!slotAcceptsItem(slotDef, item)) return;
      equipFromInventory(char.id, slotDef.key, {
        ...item,
        type: getItemEquipType(item),
        equipSlot: slotDef.key,
        desc: item.desc ?? '',
      });
    } else if (payload.type === 'slot') {
      if (payload.slotKey === slotDef.key) { _dndPayload = null; return; }
      const srcEquipped = payload.item ?? equip[payload.slotKey];
      if (!srcEquipped || !slotAcceptsItem(slotDef, srcEquipped)) return;
      const targetEquipped = equip[slotDef.key];
      const srcSlot = EQUIP_SLOTS_DEF.find((s) => s.key === payload.slotKey);
      equipItem(char.id, slotDef.key, srcEquipped);
      if (targetEquipped && slotAcceptsItem(srcSlot, targetEquipped)) {
        equipItem(char.id, payload.slotKey, targetEquipped);
      } else {
        unequipSlot(char.id, payload.slotKey);
      }
    }
    _dndPayload = null;
  };

  const handleSlotDragOver = (e, slotDef) => {
    const p = _dndPayload;
    if (!p) { setDropOver(null); return; }
    const item = p.type === 'inv' ? p.item : (p.item ?? equip[p.slotKey]);
    if (slotAcceptsItem(slotDef, item)) {
      e.dataTransfer.dropEffect = 'move';
      setDropOver(slotDef.key);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropOver(null);
    }
  };

  return (
    <div className="detail-content eqdoll-content">
      <div className="eqdoll-layout">

        {/* ── Equipment slots ── */}
        <div className="eqdoll-body">
          <div className="eqdoll-title">Mon Équipement</div>
          <div className="eqdoll-slots-grid">
            {EQUIP_SLOTS_DEF.map((slotDef) => (
              <EquipSlotBox
                key={slotDef.key}
                slotDef={slotDef}
                equippedItem={equip[slotDef.key]}
                dragOver={dropOver === slotDef.key}
                onDragOver={(e) => handleSlotDragOver(e, slotDef)}
                onDragLeave={() => setDropOver(null)}
                onDrop={(e) => handleSlotDrop(e, slotDef)}
                onUnequip={() => unequipToInventory(char.id, slotDef.key)}
                itemEffectOptions={itemEffectOptions}
              />
            ))}
          </div>
        </div>

        {/* ── Equippable inventory ── */}
        <div className="eqdoll-inv">
          <div className="eqdoll-inv-title">Inventaire</div>

          <div className="eqdoll-cat-bar">
            {INV_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`eqdoll-cat-btn${catFilter === cat.key ? ' active' : ''}${cat.key !== 'tout' && !presentCats.has(cat.key) ? ' empty' : ''}`}
                onClick={() => setCatFilter(cat.key)}
                title={cat.key !== 'tout' && !presentCats.has(cat.key) ? `${cat.label} (vide)` : cat.label}
              >
                <span className="eqdoll-cat-icon">
                  <CatSVG catKey={cat.key} color={catFilter === cat.key ? cat.color : 'rgba(200,168,74,0.45)'} />
                </span>
                <span className="eqdoll-cat-label">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="eqdoll-inv-hint">
            Glisser vers un emplacement pour équiper · Cliquer sur un équipé pour le retirer
          </div>

          <div
            className="eqdoll-inv-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDropOver(null);
              const payload = _dndPayload;
              if (payload?.type === 'slot') unequipToInventory(char.id, payload.slotKey);
              _dndPayload = null;
            }}
          >
            {filteredItems.length === 0 && (
              <p className="eqdoll-inv-empty">
                {catFilter === 'tout'
                  ? "Aucun objet équipable dans l'inventaire."
                  : `Aucun objet de type "${catFilter}" dans l'inventaire.`}
              </p>
            )}
            {filteredItems.map((item) => {
              const itemType = getItemEquipType(item);
              const cat = INV_CATEGORIES.find((c) => c.key === itemType);
              return (
                <div
                  key={item.id}
                  className="eqdoll-inv-item"
                  draggable
                  onDragStart={(e) => {
                    const payload = { type: 'inv', item };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/json', JSON.stringify(payload));
                    _dndPayload = payload;
                  }}
                  onDragEnd={() => { _dndPayload = null; setDropOver(null); }}
                >
                  <div className="eqdoll-inv-item-main">
                    <span className="eqdoll-inv-item-slot">
                      {cat && <span className="eqdoll-inv-slot-icon"><CatSVG catKey={cat.key} color={cat.color} /></span>}
                      {itemType}
                    </span>
                    <span className="eqdoll-inv-item-name" style={{ color: RARITY_COLOR[item.rarete] }}>
                      {item.nom}
                    </span>
                  </div>
                  {item.desc && <p className="eqdoll-inv-item-desc">{item.desc}</p>}
                  <ItemEffectSummary item={item} {...itemEffectOptions} mode="compact" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
