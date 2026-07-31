import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HardHat, Shield, Wind, Hand, Link2, Footprints, Gem, Sword, BowArrow,
  Package, LayoutGrid, Circle, Cpu,
} from 'lucide-react';
import ItemEffectSummary from '../admin/ItemEffectSummary';
import { useCharacterStore } from '../../store/characterStore';
import { useAdminStore } from '../../store/adminStore';
import { APTITUDES, RESISTANCES_DEF } from '../../data/gameData';
import { resolveLiveItem, getGadgetSlotCount, getGadgetSlotLabel, getGadgetItemCategoryId } from '../../domain/characterCalculations';

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
  { key: 'arme1',        label: 'Main droite',      accepts: ['arme'],           area: 'arme1'        },
  { key: 'armeDistance', label: 'Arme à distance',  accepts: ['armeDistance'],   area: 'armeDistance' },
  { key: 'arme2',        label: 'Main gauche',      accepts: ['arme'],           area: 'arme2'        },
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

// 'bague1'/'bague2' n'existent pas dans ITEM_EQUIP_SLOTS (le builder d'item
// ne propose que 'bijou') — gardés ici en filet de sécurité pour d'anciens
// items dont le equipSlot avait été écrasé par la clé de doll (bug corrigé,
// voir slotAcceptsItem/handleSlotDrop).
const BIJOU_SLOTS = new Set(['bijou', 'bague', 'cou', 'bague1', 'bague2']);

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

// D'anciens items équipés avant le fix de handleSlotDrop/EquipSlotBox ont
// leur equipSlot figé sur une clé de doll précise (ex: 'arme1', 'bague2')
// au lieu de la valeur canonique choisie dans le builder ('arme', 'bijou').
// On les réconcilie ici pour que le matching reste correct même sur ces
// items legacy, sans réintroduire de regroupement par catégorie pour les
// items sains (armeDistance reste exclusif, volontairement absent d'ici).
const LEGACY_SLOT_ALIASES = { arme1: 'arme', arme2: 'arme', bague1: 'bijou', bague2: 'bijou' };

export function slotAcceptsItem(slotDef, item) {
  if (!slotDef || !item) return false;
  // Le match dépend uniquement du "Slot équipable" choisi dans le builder
  // d'item (item.equipSlot), pas d'une catégorie dérivée/normalisée : sinon
  // une arme à distance (equipSlot: 'armeDistance') se retrouve compatible
  // avec les slots Arme 1/Arme 2 (accepts: ['arme']) via normalizeEquipType,
  // qui regroupe volontairement tout ce qui commence par "arme" pour
  // l'affichage des onglets d'inventaire — un regroupement d'affichage,
  // pas une règle d'équipement. Pas de .toLowerCase() non plus : des clés
  // comme "armeDistance" sont en camelCase.
  const raw = String(item.equipSlot ?? item.type ?? '');
  const rawType = LEGACY_SLOT_ALIASES[raw] || raw;
  return slotDef.key === rawType || slotDef.accepts.includes(rawType);
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
    case 'armeDistance': return <BowArrow {...props} />;
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

export function EquipSlotBox({ slotDef, equippedItem, onDrop, dragOver, onDragOver, onDragLeave, itemEffectOptions }) {
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
            // On ne réécrit plus equipSlot/type avec la clé de doll ici :
            // ça écrasait définitivement le "Slot équipable" d'origine de
            // l'item (ex: un bijou devenait "bague1" pour toujours, même
            // remis à l'inventaire — voir slotAcceptsItem).
            const payload = {
              type: 'slot',
              slotKey: slotDef.key,
              item: { ...equippedItem },
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/json', JSON.stringify(payload));
            _dndPayload = payload;
          }}
          onDragEnd={() => { _dndPayload = null; }}
          title="Glisser vers l'inventaire pour déséquiper"
        >
          <span className="eqdoll-item-name" style={{ color: RARITY_COLOR[equippedItem.rarete] || 'var(--gold2)' }}>
            {equippedItem.nom}
          </span>
          {equippedItem.desc && (
            <span className="eqdoll-item-desc">{equippedItem.desc}</span>
          )}
          <ItemEffectSummary item={equippedItem} {...itemEffectOptions} mode="button" />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EquipementPanel({ char }) {
  const {
    equipItem, unequipSlot, equipFromInventory, unequipToInventory,
    equipTwoHanded, unequipTwoHandedToInventory,
    equipGadget, unequipGadget,
  } = useCharacterStore();
  const { customAptitudes, customResistanceEntries } = useAdminStore();
  const liveChar = useCharacterStore((s) => s.getCharacter(char.id)) ?? char;
  const [dropOver, setDropOver]   = useState(null);
  const [catFilter, setCatFilter] = useState('tout');
  const [gadgetsPanelOpen, setGadgetsPanelOpen] = useState(false);
  const [gadgetPickerSlot, setGadgetPickerSlot] = useState(null);

  const itemEffectOptions = getItemEffectLookupOptions(customAptitudes, customResistanceEntries);
  // Résout chaque item (équipé/en inventaire) contre le catalogue courant
  // (voir resolveLiveItem) : une copie en jeu n'est plus figée au moment où
  // elle a été ajoutée, un item édité dans l'admin se répercute partout.
  const equip = Object.fromEntries(
    Object.entries(liveChar.equipement ?? {}).map(([slot, item]) => [slot, item ? resolveLiveItem(item) : item])
  );
  const inventaire = (liveChar.inventaire ?? []).map(resolveLiveItem);

  // Les sacs (equipSlot 'sac') se gèrent exclusivement via le panneau "Sac"
  // de l'inventaire, et les Gadgets (equipSlot 'custom') via le panneau
  // dédié ci-dessous — ni l'un ni l'autre n'a de place sur la poupée.
  const equippableItems = inventaire.filter((i) => {
    const type = getItemEquipType(i);
    return type && type !== 'sac' && type !== 'custom';
  });

  // Objets raciaux : emplacements accordés par la race + l'ascendance du
  // personnage (getGadgetSlotCount), le bouton n'apparaît que si ce total
  // est positif. Le pool proposable = uniquement les items equipSlot
  // 'custom' de LA catégorie d'item choisie sur la race/ascendance
  // (getGadgetItemCategoryId) — le lien se fait depuis la race, pas par un
  // verrouillage de races côté catégorie.
  const gadgetSlotCount = getGadgetSlotCount(liveChar);
  const gadgetLabel = getGadgetSlotLabel(liveChar);
  const gadgetItemCategoryId = getGadgetItemCategoryId(liveChar);
  const gadgetSlots = Array.from({ length: gadgetSlotCount }, (_, i) => {
    const item = liveChar.gadgetsEquipes?.[i] ?? null;
    return item ? resolveLiveItem(item) : null;
  });
  const availableGadgetItems = gadgetItemCategoryId == null
    ? []
    : inventaire.filter((i) => i.equipSlot === 'custom' && String(i.categoryId) === String(gadgetItemCategoryId));

  const equipGadgetToSlot = (slotIndex, itemId) => {
    const item = inventaire.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    equipGadget(char.id, slotIndex, item);
    setGadgetPickerSlot(null);
  };
  const unequipGadgetSlot = (slotIndex) => {
    if (!gadgetSlots[slotIndex]) return;
    unequipGadget(char.id, slotIndex);
  };

  const filteredItems = catFilter === 'tout'
    ? equippableItems
    : catFilter === 'bijou'
      ? equippableItems.filter((i) => normalizeEquipType(i.equipSlot) === 'bijou')
      : equippableItems.filter((i) => normalizeEquipType(i.equipSlot) === catFilter);

  const presentCats = new Set(equippableItems.map((i) => normalizeEquipType(i.equipSlot)));

  // Seul chemin de déséquipement de la poupée : glisser vers l'inventaire
  // (plus de clic direct — trop facile de retirer un item par erreur, ex. en
  // fermant le popover "Effets", voir ItemEffectSummary). Une arme à deux
  // mains occupe arme1 ET arme2 avec le même item : la retirer d'une seule
  // main via unequipToInventory laisserait l'autre main "orpheline" et
  // dupliquerait l'item si elle était ensuite retirée aussi — d'où ce même
  // garde-fou que gérait auparavant EquipSlotBox.onUnequip.
  const unequipSlotToInventory = (slotKey) => {
    const isLinkedTwoHanded = (slotKey === 'arme1' || slotKey === 'arme2')
      && equip.arme1 && equip.arme2
      && String(equip.arme1.id) === String(equip.arme2.id);
    if (isLinkedTwoHanded) {
      unequipTwoHandedToInventory(char.id);
    } else {
      unequipToInventory(char.id, slotKey);
    }
  };

  const handleSlotDrop = (e, slotDef) => {
    let parsedPayload = null;
    try { parsedPayload = JSON.parse(e.dataTransfer.getData('application/json')); } catch { /* empty */ }
    const payload = _dndPayload ?? parsedPayload;
    setDropOver(null);
    if (!payload) return;

    if (payload.type === 'inv') {
      const item = payload.item;
      if (!slotAcceptsItem(slotDef, item)) return;
      // On garde item.equipSlot/type tels quels : les écraser avec la clé
      // de doll (ex: 'bague1') corrompait le "Slot équipable" d'origine de
      // l'item de façon permanente, même après un déséquipement.
      const itemToEquip = { ...item, desc: item.desc ?? '' };
      if (item.deuxMains && (slotDef.key === 'arme1' || slotDef.key === 'arme2')) {
        equipTwoHanded(char.id, itemToEquip);
      } else {
        equipFromInventory(char.id, slotDef.key, itemToEquip);
      }
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
            {gadgetSlotCount > 0 && (
              <button
                type="button"
                className="eqdoll-slot eqdoll-gadget-btn"
                data-area="gadgets"
                onClick={() => setGadgetsPanelOpen(true)}
                title={gadgetLabel}
              >
                <Cpu size={20} />
                <span>{gadgetLabel}</span>
                <span className="eqdoll-gadget-btn-count">{gadgetSlots.filter(Boolean).length}/{gadgetSlotCount}</span>
              </button>
            )}
            {EQUIP_SLOTS_DEF.map((slotDef) => (
              <EquipSlotBox
                key={slotDef.key}
                slotDef={slotDef}
                equippedItem={equip[slotDef.key]}
                dragOver={dropOver === slotDef.key}
                onDragOver={(e) => handleSlotDragOver(e, slotDef)}
                onDragLeave={() => setDropOver(null)}
                onDrop={(e) => handleSlotDrop(e, slotDef)}
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
            Glisser vers un emplacement pour équiper · Glisser un équipé vers ici pour le retirer
          </div>

          <div
            className="eqdoll-inv-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDropOver(null);
              const payload = _dndPayload;
              if (payload?.type === 'slot') unequipSlotToInventory(payload.slotKey);
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
                  <ItemEffectSummary item={item} {...itemEffectOptions} mode="button" />
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {gadgetsPanelOpen && createPortal(
        <div className="index-modal-backdrop" onClick={() => { setGadgetsPanelOpen(false); setGadgetPickerSlot(null); }}>
          <div className="index-confirm-modal inv-bag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="index-modal-header">
              <h3>Mes {gadgetLabel}</h3>
              <button className="admin-btn" onClick={() => { setGadgetsPanelOpen(false); setGadgetPickerSlot(null); }}>✕ Fermer</button>
            </div>
            <div className="inv-bag-hint">
              Seuls les objets "Race Custom" compatibles avec cette race peuvent être équipés ici. Un objet équipé quitte l'inventaire.
              Les objets passifs appliquent toujours leur bonus ; les objets actifs doivent être activés depuis l'onglet Stats ou le panneau Combat.
            </div>
            <div className="inv-bag-slots">
              {gadgetSlots.map((gadgetItem, slotIndex) => (
                <div key={slotIndex} className={`inv-bag-slot${gadgetItem ? ' is-filled' : ''}`}>
                  {gadgetItem ? (
                    <>
                      <div className="inv-bag-slot-main">
                        <strong>{gadgetItem.nom}</strong>
                        <span className="eqdoll-gadget-type">{gadgetItem.actif ? 'Actif' : 'Passif'}</span>
                        {gadgetItem.desc && <span className="inv-bag-slot-desc">{gadgetItem.desc}</span>}
                        <ItemEffectSummary item={gadgetItem} {...itemEffectOptions} mode="button" />
                      </div>
                      <button className="inv-bag-slot-remove" title="Retirer" onClick={() => unequipGadgetSlot(slotIndex)}>✕</button>
                    </>
                  ) : gadgetPickerSlot === slotIndex ? (
                    <div className="inv-bag-slot-picker">
                      {availableGadgetItems.length === 0 ? (
                        <p className="inv-bag-slot-empty-hint">Aucun objet racial disponible dans l'inventaire.</p>
                      ) : availableGadgetItems.map((item) => (
                        <button key={item.id} className="inv-bag-slot-picker-item" onClick={() => equipGadgetToSlot(slotIndex, item.id)}>
                          {item.nom}
                        </button>
                      ))}
                      <button className="inv-bag-slot-picker-cancel" onClick={() => setGadgetPickerSlot(null)}>Annuler</button>
                    </div>
                  ) : (
                    <button className="inv-bag-slot-add" onClick={() => setGadgetPickerSlot(slotIndex)}>
                      <span>+ Emplacement libre</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
