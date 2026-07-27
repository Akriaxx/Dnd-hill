import { Fragment, useState } from 'react';
import { APTITUDES, RESISTANCES_DEF } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import ItemEffectSummary from '../../../components/admin/ItemEffectSummary';
import ItemIconPicker from '../../../components/admin/ItemIconPicker';
import { getItemIcon } from '../../../data/itemIcons';
import { ConfirmModal, AdminFilterPanel, CategoryAccordionList, SectionGrid, AdminCard, EffectsPanel, GameplayEffectsToggle } from '../AdminShared';
import { useGameplayEffectsPanel, useMatchedHeight } from '../adminEffectsPanelHooks';
import { asArray, slugifyKey, includesText, mergeTemporaryRows } from '../adminUtils';
import {
  BLANK_ITEM,
  ITEM_EQUIP_SLOTS,
  ITEM_SIMPLE_EFFECTS,
  ITEM_SIMPLE_EFFECT_GROUPS,
  ITEM_EFFECT_STAT_KEYS,
  TEMP_ITEM_CATEGORIES,
  TEMP_ITEMS,
  createBlankItemEffects,
  normalizeItemEffects,
  itemEffectValue,
  hasAnyItemEffect,
  normalizeItemCategoryId,
  getItemCategoryChildren,
  getRootItemCategories,
  getItemCategoryBranchIds,
  getRootItemCategoryId,
  getItemClassesForRoot,
} from '../itemUtils';

// item.icone stocke une clé (ex: "sword"), pas du texte libre — voir
// ItemIconPicker. Rendue dans le badge rond de la card plutôt qu'en ligne
// de détail à part.
function ItemIcon({ item }) {
  const entry = getItemIcon(item.icone);
  return entry ? <entry.Icon size={20} strokeWidth={1.6} /> : null;
}

function ItemEffectBuilder({ value, onChange, aptitudeOptions, resistanceOptions, onlyKey = null }) {
  const effects = normalizeItemEffects(value);
  const setEffects = (next) => onChange(normalizeItemEffects(next));
  const setSimple = (key, nextValue) => setEffects({ ...effects, simple: { ...effects.simple, [key]: itemEffectValue(nextValue) } });
  const setStat = (key, nextValue) => setEffects({ ...effects, stats: { ...effects.stats, [key]: itemEffectValue(nextValue) } });
  const setListEntry = (listKey, index, patch) => {
    const rows = effects[listKey].map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
    setEffects({ ...effects, [listKey]: rows });
  };
  const addListEntry = (listKey, options) => {
    setEffects({ ...effects, [listKey]: [...effects[listKey], { key: options[0]?.key || '', value: 0 }] });
  };
  const removeListEntry = (listKey, index) => {
    setEffects({ ...effects, [listKey]: effects[listKey].filter((_, rowIndex) => rowIndex !== index) });
  };

  const renderList = (listKey, title, options) => (
    <div className="item-effect-panel item-effect-panel--list">
      <div className="item-effect-panel-head">
        <span>{title}</span>
        <button type="button" className="admin-btn" onClick={() => addListEntry(listKey, options)} disabled={options.length === 0}>+ Ligne</button>
      </div>
      {options.length === 0 ? (
        <div className="index-empty">Aucune donnée disponible pour ce type d'effet.</div>
      ) : effects[listKey].length === 0 ? (
        <div className="item-effect-empty">Aucun bonus ou malus configuré.</div>
      ) : (
        <div className="item-effect-list">
          {effects[listKey].map((row, index) => (
            <div className="item-effect-row" key={`${listKey}-${index}`}>
              <select value={row.key || ''} onChange={(event) => setListEntry(listKey, index, { key: event.target.value })}>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <input type="number" value={row.value ?? 0} onChange={(event) => setListEntry(listKey, index, { value: itemEffectValue(event.target.value) })} />
              <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeListEntry(listKey, index)}>Retirer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="item-effect-builder">
      {(!onlyKey || onlyKey === 'simple') && (
        <div className="item-effect-panel">
          <div className="item-effect-panel-head"><span>Ressource</span></div>
          {ITEM_SIMPLE_EFFECT_GROUPS.map((group) => (
            <div className="item-effect-subgroup" key={group.label}>
              <div className="item-effect-subgroup-head">{group.label}</div>
              <div className="item-effect-grid item-effect-grid--simple">
                {group.keys.map((key) => {
                  const effect = ITEM_SIMPLE_EFFECTS.find((e) => e.key === key);
                  return (
                    <label className="item-effect-cell" key={key}>
                      <span>{effect.label}</span>
                      <input type="number" value={effects.simple[key] ?? 0} onChange={(event) => setSimple(key, event.target.value)} />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {(!onlyKey || onlyKey === 'stats') && (
        <div className="item-effect-panel">
          <div className="item-effect-panel-head"><span>Caractéristiques</span></div>
          <div className="item-effect-grid item-effect-grid--stats">
            {ITEM_EFFECT_STAT_KEYS.map((stat) => (
              <label className="item-effect-cell" key={stat}>
                <span>{stat}</span>
                <input type="number" value={effects.stats[stat] ?? 0} onChange={(event) => setStat(stat, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      )}
      {(!onlyKey || onlyKey === 'aptitudes' || onlyKey === 'resistances') && (
        <div className="item-effect-lists">
          {(!onlyKey || onlyKey === 'aptitudes') && renderList('aptitudes', 'Aptitudes', aptitudeOptions)}
          {(!onlyKey || onlyKey === 'resistances') && renderList('resistances', 'Résistances', resistanceOptions)}
        </div>
      )}
    </div>
  );
}

function ItemEffectsPanel({ effects, onChange, aptitudeOptions, resistanceOptions }) {
  const [selected, setSelected] = useState(null);
  const categories = [
    { key: 'simple', label: 'Ressource' },
    { key: 'stats', label: 'Caractéristiques' },
    { key: 'aptitudes', label: 'Aptitudes' },
    { key: 'resistances', label: 'Résistances' },
  ];

  if (selected) {
    return (
      <>
        <div className="admin-effects-panel-body">
          <ItemEffectBuilder
            value={effects}
            onChange={onChange}
            aptitudeOptions={aptitudeOptions}
            resistanceOptions={resistanceOptions}
            onlyKey={selected}
          />
        </div>
        <div className="admin-effects-panel-actions">
          <button type="button" className="admin-btn" onClick={() => setSelected(null)}>‹ Retour à la liste</button>
        </div>
      </>
    );
  }

  return (
    <EffectsPanel categories={categories.map((category) => ({ ...category, onOpen: () => setSelected(category.key) }))} />
  );
}

export default function ItemPanel() {
  const {
    customItemCategories,
    customItemClasses,
    customItemRarities,
    customItems,
    customAptitudes,
    customResistanceEntries,
    addItem, updateItem, deleteItem,
  } = useAdminStore();
  const categories = mergeTemporaryRows(TEMP_ITEM_CATEGORIES, customItemCategories);
  const items = mergeTemporaryRows(TEMP_ITEMS, customItems);
  const itemClasses = asArray(customItemClasses);
  const itemRarities = asArray(customItemRarities).slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [itemForm, setItemForm] = useState(BLANK_ITEM);
  const [itemCategoryScopeId, setItemCategoryScopeId] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const { mounted: effectsMounted, shrink: effectsShrink, shifted: effectsShifted, visible: effectsVisible } = useGameplayEffectsPanel(effectsOpen);
  const { mounted: conditionMounted, shrink: conditionShrink, shifted: conditionShifted, visible: conditionVisible } = useGameplayEffectsPanel(conditionOpen);
  const [modalRef, modalHeight] = useMatchedHeight();
  const [search, setSearch] = useState('');

  const setItem = (key, value) => setItemForm((c) => ({ ...c, [key]: value }));
  const setItemEffects = (nextEffects) => setItem('effects', normalizeItemEffects(nextEffects));
  const setConditionEffects = (nextEffects) => setItem('conditionEffects', normalizeItemEffects(nextEffects));
  const rootCategories = getRootItemCategories(categories);
  const itemRootId = getRootItemCategoryId(categories, itemForm.categoryId);
  const relevantItemClasses = getItemClassesForRoot(itemClasses, itemRootId);
  const scopedRootId = normalizeItemCategoryId(itemCategoryScopeId);
  const categorySelectRoots = scopedRootId
    ? rootCategories.filter((section) => normalizeItemCategoryId(section.id) === scopedRootId)
    : rootCategories;
  const aptitudeOptions = [
    ...APTITUDES.map((aptitude) => ({ key: slugifyKey(aptitude.nom), label: aptitude.nom })),
    ...asArray(customAptitudes).map((aptitude) => ({ key: aptitude.key || slugifyKey(aptitude.nom), label: aptitude.nom })),
  ].filter((option, index, list) => option.key && list.findIndex((entry) => entry.key === option.key) === index);
  const resistanceOptions = [
    ...Object.entries(RESISTANCES_DEF).flatMap(([groupKey, group]) => (
      asArray(group.items).map((label) => ({ key: `${groupKey}.${slugifyKey(label)}`, label }))
    )),
    ...asArray(customResistanceEntries).map((entry) => ({
      key: entry.key || slugifyKey(entry.label),
      label: entry.label || entry.key,
    })),
  ].filter((option, index, list) => option.key && list.findIndex((entry) => entry.key === option.key) === index);

  const handleItemSave = () => {
    if (!itemForm.nom.trim()) return;
    const payload = {
      ...itemForm,
      effects: normalizeItemEffects(itemForm.effects),
      usable: Boolean(itemForm.consumable),
      useText: itemForm.consumable ? itemForm.useText : '',
      equipSlot: itemForm.equipable ? itemForm.equipSlot : '',
      classeId: itemForm.equipable ? itemForm.classeId : null,
      conditionEffects: itemForm.equipable ? normalizeItemEffects(itemForm.conditionEffects) : null,
    };
    if (editingItem) updateItem(editingItem.id, payload);
    else addItem(payload);
    setItemForm(BLANK_ITEM);
    setEditingItem(null);
    setShowItemForm(false);
  };

  const startItemCreate = (categoryId = categories[0]?.id || null, scoped = true) => {
    const rootId = getRootItemCategoryId(categories, categoryId);
    setEditingItem(null);
    setItemForm({ ...BLANK_ITEM, categoryId, effects: createBlankItemEffects() });
    setItemCategoryScopeId(scoped ? rootId : null);
    setEffectsOpen(false);
    setConditionOpen(false);
    setShowItemForm(true);
  };
  const startItemEdit = (item) => {
    setEditingItem(item);
    setItemForm({
      ...BLANK_ITEM,
      ...item,
      effects: normalizeItemEffects(item.effects),
      conditionEffects: normalizeItemEffects(item.conditionEffects),
    });
    setItemCategoryScopeId(getRootItemCategoryId(categories, item.categoryId));
    setEffectsOpen(hasAnyItemEffect(item.effects));
    setConditionOpen(hasAnyItemEffect(item.conditionEffects));
    setShowItemForm(true);
  };

  const cancelItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm(BLANK_ITEM);
    setItemCategoryScopeId(null);
    setConditionOpen(false);
  };

  const filtered = items.filter((i) => includesText(i.nom, search) || includesText(i.description, search));

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={showItemForm ? cancelItemForm : () => startItemCreate(categories[0]?.id || null, false)}>
          {showItemForm ? 'Fermer item' : '+ Item'}
        </button>
      </div>

      {showItemForm && (
        <div className={`index-modal-backdrop${(effectsShrink || conditionShrink) ? ' has-effects-panel' : ''}`}>
          <div className="index-modal index-modal--wide" ref={modalRef}>
            <div className="index-modal-header">
              <h3>{editingItem ? "Modifier l'entrée" : 'Nouvelle entrée'}</h3>
              <button className="admin-btn" onClick={cancelItemForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom *</label>
                  <input value={itemForm.nom} onChange={(e) => setItem('nom', e.target.value)} placeholder="Ex: Potion de soin" />
                </div>
                {categories.length > 0 && (
                  <div className="comp-form-field comp-form-field--grow">
                    <label>Catégorie</label>
                    <select value={itemForm.categoryId ?? ''} onChange={(e) => setItem('categoryId', Number(e.target.value) || null)}>
                      <option value="">— Aucune —</option>
                      {categorySelectRoots.map((section) => {
                        const children = getItemCategoryChildren(categories, section.id);
                        return (
                          <Fragment key={section.id}>
                            <option value={section.id}>{section.nom}</option>
                            {children.map((child) => (
                              <option key={child.id} value={child.id}>— {child.nom}</option>
                            ))}
                          </Fragment>
                        );
                      })}
                    </select>
                  </div>
                )}
                {itemRarities.length > 0 && (
                  <div className="comp-form-field comp-form-field--grow">
                    <label>Rareté</label>
                    <select value={itemForm.rareteId ?? ''} onChange={(e) => setItem('rareteId', Number(e.target.value) || null)}>
                      <option value="">— Aucune —</option>
                      {itemRarities.map((rarity) => <option key={rarity.id} value={rarity.id}>{rarity.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="comp-form-field">
                <label>Description</label>
                <SmartDescEditor value={itemForm.description} onChange={(v) => setItem('description', v)} />
              </div>
              <div className="comp-form-field">
                <label>Icône</label>
                <ItemIconPicker value={itemForm.icone} onChange={(next) => setItem('icone', next)} />
              </div>
              <div className="comp-form-row">
                <label className="index-value-toggle">
                  <input type="checkbox" checked={Boolean(itemForm.consumable)} onChange={(e) => setItem('consumable', e.target.checked)} />
                  <span>Consommable</span>
                </label>
                <label className="index-value-toggle">
                  <input type="checkbox" checked={Boolean(itemForm.equipable)} onChange={(e) => setItem('equipable', e.target.checked)} />
                  <span>Équipable</span>
                </label>
                <label className="index-value-toggle">
                  <input type="checkbox" checked={Boolean(itemForm.stackable)} onChange={(e) => setItem('stackable', e.target.checked)} />
                  <span>Stackable</span>
                </label>
              </div>
              {itemForm.consumable && (
                <div className="comp-form-field">
                  <label>Texte à l'utilisation</label>
                  <SmartDescEditor
                    value={itemForm.useText}
                    onChange={(v) => setItem('useText', v)}
                    placeholder="Ex: Vous buvez la potion et sentez vos forces revenir."
                  />
                </div>
              )}
              {itemForm.equipable && (
                <div className="comp-form-row">
                  <div className="comp-form-field comp-form-field--grow">
                    <label>Slot d'équipement</label>
                    <select value={itemForm.equipSlot || ''} onChange={(e) => setItem('equipSlot', e.target.value)}>
                      {ITEM_EQUIP_SLOTS.map((slot) => (
                        <option key={slot.key || 'none'} value={slot.key}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="comp-form-field comp-form-field--grow">
                    <label>Classe d'équipement</label>
                    <select value={itemForm.classeId ?? ''} onChange={(e) => setItem('classeId', Number(e.target.value) || null)} disabled={relevantItemClasses.length === 0}>
                      <option value="">— Aucune —</option>
                      {relevantItemClasses.map((cls) => <option key={cls.id} value={cls.id}>{cls.nom}</option>)}
                    </select>
                    {relevantItemClasses.length === 0 && (
                      <span style={{ fontSize: '0.8em', opacity: 0.6 }}>Aucune classe d'équipement pour cette catégorie (Économie → Classe).</span>
                    )}
                  </div>
                </div>
              )}
              <div className="comp-form-footer">
                <button className="admin-btn" onClick={cancelItemForm}>Annuler</button>
                <button className="race-form-save-btn" disabled={!itemForm.nom.trim()} onClick={handleItemSave}>
                  {editingItem ? 'Enregistrer' : "Créer l'entrée"}
                </button>
                <GameplayEffectsToggle open={effectsOpen} onToggle={setEffectsOpen} />
                {itemForm.equipable && (
                  <GameplayEffectsToggle open={conditionOpen} onToggle={setConditionOpen} label="Condition" />
                )}
              </div>
            </div>
          </div>
          {effectsMounted && (
            <div
              className={`admin-effects-side-panel${effectsShifted ? ' is-shifted' : ''}${effectsVisible ? ' is-visible' : ''}`}
              style={modalHeight ? { height: modalHeight, maxHeight: modalHeight } : undefined}
            >
              <div className="admin-effects-side-panel-header">
                <span>Effets gameplay</span>
              </div>
              <ItemEffectsPanel
                effects={itemForm.effects}
                onChange={setItemEffects}
                aptitudeOptions={aptitudeOptions}
                resistanceOptions={resistanceOptions}
              />
            </div>
          )}
          {conditionMounted && (
            <div
              className={`admin-effects-side-panel${conditionShifted ? ' is-shifted' : ''}${conditionVisible ? ' is-visible' : ''}`}
              style={modalHeight ? { height: modalHeight, maxHeight: modalHeight } : undefined}
            >
              <div className="admin-effects-side-panel-header">
                <span>Malus si classe non autorisée</span>
              </div>
              <ItemEffectsPanel
                effects={itemForm.conditionEffects}
                onChange={setConditionEffects}
                aptitudeOptions={aptitudeOptions}
                resistanceOptions={resistanceOptions}
              />
            </div>
          )}
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

      <AdminFilterPanel search={search} onSearch={setSearch} count={filtered.length} total={items.length} />

      {categories.length === 0 && items.length === 0 && (
        <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Aucune catégorie ni entrée. Commencez par créer une catégorie.</p>
      )}

      <CategoryAccordionList
        categories={rootCategories.map((cat) => ({ ...cat, key: cat.id }))}
        entriesForCategory={(cat) => filtered.filter((item) => getItemCategoryBranchIds(categories, cat.id).includes(normalizeItemCategoryId(item.categoryId)))}
        renderContent={(section, sectionItems) => {
          const children = getItemCategoryChildren(categories, section.id);
          const directItems = sectionItems.filter((item) => normalizeItemCategoryId(item.categoryId) === normalizeItemCategoryId(section.id));
          return (
            <div className="item-section-content">
              {directItems.length > 0 && (
                <div className="item-subcategory">
                  <div className="item-subcategory-head">
                    <span>Dans la section</span>
                    <button className="admin-btn" onClick={() => startItemCreate(section.id)}>+ Item</button>
                  </div>
                  <SectionGrid small>
                    {directItems.map((item) => (
                      <AdminCard
                        key={item.id}
                        title={item.nom}
                        icon={<ItemIcon item={item} />}
                        badge={[item.temporary && 'Brut', item.consumable && 'Consommable', item.equipable && 'Équipable', item.stackable && 'Stackable'].filter(Boolean).join(' · ') || undefined}
                        desc={item.description}
                        onEdit={item.temporary ? undefined : () => startItemEdit(item)}
                        onDelete={item.temporary ? undefined : () => setConfirmDelete({ title: "Supprimer l'entrée", message: `Supprimer "${item.nom}" ?`, dangerLabel: 'Supprimer', onConfirm: () => deleteItem(item.id) })}
                      >
                        <ItemEffectSummary item={item} aptitudeOptions={aptitudeOptions} resistanceOptions={resistanceOptions} />
                      </AdminCard>
                    ))}
                  </SectionGrid>
                </div>
              )}

              {children.map((child) => {
                const childItems = sectionItems.filter((item) => normalizeItemCategoryId(item.categoryId) === normalizeItemCategoryId(child.id));
                return (
                  <div className="item-subcategory" key={child.id} style={{ '--index-category-color': child.couleur || section.couleur || '#bcecff' }}>
                    <div className="item-subcategory-head">
                      <div>
                        <span className="index-card-color" />
                        <strong>{child.nom}</strong>
                        <small>{childItems.length} item{childItems.length > 1 ? 's' : ''}</small>
                      </div>
                      <button className="admin-btn" onClick={() => startItemCreate(child.id)}>+ Item</button>
                    </div>
                    {child.description && <p className="item-subcategory-desc">{child.description}</p>}
                    {childItems.length > 0 ? (
                      <SectionGrid small>
                        {childItems.map((item) => (
                          <AdminCard
                            key={item.id}
                            title={item.nom}
                            icon={<ItemIcon item={item} />}
                            badge={[item.temporary && 'Brut', item.consumable && 'Consommable', item.equipable && 'Équipable', item.stackable && 'Stackable'].filter(Boolean).join(' · ') || undefined}
                            desc={item.description}
                            onEdit={item.temporary ? undefined : () => startItemEdit(item)}
                            onDelete={item.temporary ? undefined : () => setConfirmDelete({ title: "Supprimer l'entrée", message: `Supprimer "${item.nom}" ?`, dangerLabel: 'Supprimer', onConfirm: () => deleteItem(item.id) })}
                          >
                            <ItemEffectSummary item={item} aptitudeOptions={aptitudeOptions} resistanceOptions={resistanceOptions} />
                          </AdminCard>
                        ))}
                      </SectionGrid>
                    ) : (
                      <div className="index-empty">Aucun item dans cette sous-catégorie.</div>
                    )}
                  </div>
                );
              })}

              {children.length === 0 && directItems.length === 0 && (
                <div className="item-subcategory">
                  <div className="item-subcategory-head">
                    <span>Aucune sous-catégorie</span>
                    <button className="admin-btn" onClick={() => startItemCreate(section.id)}>+ Item</button>
                  </div>
                  <div className="index-empty">Crée une sous-catégorie dans Catégorie d'objet, ou ajoute un item directement dans cette section.</div>
                </div>
              )}
            </div>
          );
        }}
        emptyLabel="Aucune entrée dans cette catégorie."
      />

      {filtered.filter((i) => !i.categoryId || !categories.find((c) => c.id === i.categoryId)).length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ opacity: 0.6, fontSize: '0.85em', marginBottom: '0.5rem' }}>Sans catégorie</p>
          <SectionGrid>
            {filtered.filter((i) => !i.categoryId || !categories.find((c) => c.id === i.categoryId)).map((item) => (
              <AdminCard
                key={item.id}
                title={item.nom}
                icon={<ItemIcon item={item} />}
                badge={[item.temporary && 'Brut', item.consumable && 'Consommable', item.equipable && 'Équipable', item.stackable && 'Stackable'].filter(Boolean).join(' · ') || undefined}
                desc={item.description}
                onEdit={item.temporary ? undefined : () => startItemEdit(item)}
                onDelete={item.temporary ? undefined : () => setConfirmDelete({ title: "Supprimer l'entrée", message: `Supprimer "${item.nom}" ?`, dangerLabel: 'Supprimer', onConfirm: () => deleteItem(item.id) })}
              >
                <ItemEffectSummary item={item} aptitudeOptions={aptitudeOptions} resistanceOptions={resistanceOptions} />
              </AdminCard>
            ))}
          </SectionGrid>
        </div>
      )}
    </div>
  );
}
