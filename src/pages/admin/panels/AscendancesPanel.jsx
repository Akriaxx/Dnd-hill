import { useState, Fragment } from 'react';
import { ASCENDANCE_DATA, APTITUDES, APT_CATEGORIES, RESISTANCES_DEF } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import {
  ConfirmModal, AdminFilterPanel, CategoryAccordionList,
  TagColorPicker, EffectsPanel, GameplayEffectsToggle, BonusChoicesEditor,
} from '../AdminShared';
import { useGameplayEffectsPanel, useMatchedHeight } from '../adminEffectsPanelHooks';
import {
  asArray, slugifyKey, uniqueOptions, mergeTemporaryRows,
  STAT_KEYS, BLANK_ASCENDANCE, RACE_RESOURCE_KEYS, hasAnyIdentityEffects,
} from '../adminUtils';
import { getCaracteristiqueCatalog, getAptitudeCatalog, getResistanceCatalog } from '../../../domain/bonusChoiceDomains';
import { TEMP_ITEM_CATEGORIES, getRootItemCategories, getItemCategoryChildren } from '../itemUtils';

function buildAptitudeOptions(customAptitudeCategories, customAptitudes, storedHiddenAptitudeKeys) {
  const aptitudeCategories = [
    ...APT_CATEGORIES.map((cat) => ({ key: cat.key, nom: cat.label, couleur: '#bcecff', isDefault: true })),
    ...asArray(customAptitudeCategories),
  ];
  const hiddenKeys = new Set(asArray(storedHiddenAptitudeKeys));
  const customKeys = new Set(asArray(customAptitudes).map((a) => a.key || slugifyKey(a.nom)));
  const defaults = APTITUDES
    .map((a) => ({
      ...a,
      id: `default-${slugifyKey(a.nom)}`,
      key: slugifyKey(a.nom),
      categoryKey: a.cat,
      couleur: aptitudeCategories.find((c) => c.key === a.cat)?.couleur || '#bcecff',
      description: a.description || '',
      isDefault: true,
    }))
    .filter((a) => !hiddenKeys.has(a.key) && !customKeys.has(a.key));
  const options = [
    ...defaults,
    ...asArray(customAptitudes).map((a) => ({
      ...a,
      cat: a.categoryKey || a.cat,
      categoryKey: a.categoryKey || a.cat,
      couleur: a.couleur || a.tagColor || '#bcecff',
    })),
  ];
  return { aptitudeCategories, options };
}

// RESISTANCES_DEF (gameData.js) est vide par conception — voir RacesPanel.jsx
// pour le même correctif (merge customResistanceEntries/Categories).
function buildResistanceOptions(customResistanceEntries = [], customResistanceCategories = []) {
  const staticOptions = Object.entries(RESISTANCES_DEF).flatMap(([groupKey, group]) =>
    (group.items || []).map((name) => ({ key: `${groupKey}:${slugifyKey(name)}`, group: group.label, name }))
  );
  const categoryLabel = (categoryKey) => customResistanceCategories.find((c) => c.key === categoryKey)?.label || categoryKey;
  const customOptions = asArray(customResistanceEntries).map((entry) => ({
    key: `${entry.categoryKey}:${entry.key || slugifyKey(entry.label)}`,
    group: categoryLabel(entry.categoryKey),
    name: entry.label,
  }));
  return [...staticOptions, ...customOptions];
}

// Défini hors du composant (pas une closure recréée à chaque rendu) :
// checked/onChange explicites plutôt que fieldKey+form/set fermés dessus.
function ReplaceToggle({ checked, onChange, label }) {
  return (
    <label className="race-replace-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function AscendanceForm({ initial, raceOptions, onSave, onCancel, onClose }) {
  const customLanguageCategories = useAdminStore((state) => state.customLanguageCategories);
  const customLanguages = useAdminStore((state) => state.customLanguages);
  const customAptitudeCategories = useAdminStore((state) => state.customAptitudeCategories);
  const customAptitudes = useAdminStore((state) => state.customAptitudes);
  const storedHiddenAptitudeKeys = useAdminStore((state) => state.hiddenAptitudeKeys);
  const customProvenances = useAdminStore((state) => state.customProvenances);
  const customResistanceEntries = useAdminStore((state) => state.customResistanceEntries);
  const customResistanceCategories = useAdminStore((state) => state.customResistanceCategories);
  const customCaracteristiques = useAdminStore((state) => state.customCaracteristiques);
  const customItemCategories = useAdminStore((state) => state.customItemCategories) || [];
  const itemCategories = mergeTemporaryRows(TEMP_ITEM_CATEGORIES, customItemCategories);
  const itemCategoryRoots = getRootItemCategories(itemCategories);

  const provenanceOptions = asArray(customProvenances).map((p) => ({ key: p.key || slugifyKey(p.nom), nom: p.nom, tagColor: p.tagColor }));
  const languageOptions = asArray(customLanguages);
  const languageCategories = asArray(customLanguageCategories);
  const { aptitudeCategories, options: aptitudeOptions } = buildAptitudeOptions(customAptitudeCategories, customAptitudes, storedHiddenAptitudeKeys);
  const resistanceOptions = buildResistanceOptions(customResistanceEntries, customResistanceCategories);
  const resistanceByKey = new Map(resistanceOptions.map((o) => [o.key, o]));
  const aptitudeByKey = new Map(aptitudeOptions.map((a) => [a.key || slugifyKey(a.nom), a]));
  const languageByKey = new Map(languageOptions.map((l) => [l.key || slugifyKey(l.nom), l]));

  const normalizeInitial = (asc) => ({
    ...BLANK_ASCENDANCE,
    ...(asc || {}),
    race: asc?.race || raceOptions[0] || '',
    tagColor: asc?.tagColor || asc?.couleur || BLANK_ASCENDANCE.tagColor,
    bonusStats: { ...BLANK_ASCENDANCE.bonusStats, ...(asc?.bonusStats || {}) },
    baseResources: { ...BLANK_ASCENDANCE.baseResources, ...(asc?.baseResources || {}) },
    replaceRaceStats: Boolean(asc?.replaceRaceStats),
    replaceRaceResources: Boolean(asc?.replaceRaceResources),
    replaceRaceResistances: Boolean(asc?.replaceRaceResistances),
    replaceRaceAptitudes: Boolean(asc?.replaceRaceAptitudes),
    replaceRaceLanguages: Boolean(asc?.replaceRaceLanguages),
    replaceRaceProvenances: Boolean(asc?.replaceRaceProvenances),
    aptitudeChoices: { ...BLANK_ASCENDANCE.aptitudeChoices, ...(asc?.aptitudeChoices || {}) },
    resistanceBonuses: Array.isArray(asc?.resistanceBonuses) ? asc.resistanceBonuses : [],
    aptitudes: Array.isArray(asc?.aptitudes) ? asc.aptitudes : [],
    langues: Array.isArray(asc?.langues) ? asc.langues : [],
    bonusChoices: Array.isArray(asc?.bonusChoices) ? asc.bonusChoices : [],
  });

  const [form, setForm] = useState(() => normalizeInitial(initial));
  const [selectedProvenanceKeys, setSelectedProvenanceKeys] = useState(
    () => Array.isArray(initial?.provenanceKeys) ? initial.provenanceKeys : []
  );
  const [effectsOpen, setEffectsOpen] = useState(() => hasAnyIdentityEffects(initial));
  const { mounted: effectsMounted, shrink: effectsShrink, shifted: effectsShifted, visible: effectsVisible } = useGameplayEffectsPanel(effectsOpen);
  const [modalRef, modalHeight] = useMatchedHeight();
  const [resistancePanelOpen, setResistancePanelOpen] = useState(false);
  const [aptitudePanelOpen, setAptitudePanelOpen] = useState(false);
  const [languagePanelOpen, setLanguagePanelOpen] = useState(false);
  const [provenancePanelOpen, setProvenancePanelOpen] = useState(false);
  const [bonusChoicesPanelOpen, setBonusChoicesPanelOpen] = useState(false);
  // Stats/Ressources sont de simples grilles de nombres (pas besoin d'un
  // gros panneau plein écran comme résistances/aptitudes/langues) : elles
  // se déplient directement dans le panneau "Effets gameplay" lui-même,
  // avec un bouton retour — même principe que RacesPanel/ItemPanel.
  const [selectedEffectCategory, setSelectedEffectCategory] = useState(null);

  const selectedResistanceKeys = new Set(form.resistanceBonuses.map((r) => r.resistanceKey));
  const selectedAptitudeKeys = new Set(form.aptitudes.map((r) => r.key || slugifyKey(r.nom)));
  const selectedLanguageKeys = new Set(form.langues.map((r) => r.key || slugifyKey(r.nom)));

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setStat = (stat, value) => setForm((current) => ({ ...current, bonusStats: { ...current.bonusStats, [stat]: Number(value) || 0 } }));
  const setResource = (resource, value) => setForm((current) => ({
    ...current, baseResources: { ...BLANK_ASCENDANCE.baseResources, ...(current.baseResources || {}), [resource]: Number(value) || 0 },
  }));
  const setAptitudeChoice = (key, value) => setForm((current) => ({
    ...current,
    aptitudeChoices: { ...BLANK_ASCENDANCE.aptitudeChoices, ...(current.aptitudeChoices || {}), [key]: Math.max(0, Number(value) || 0) },
  }));

  const toggleResistance = (option) => setForm((current) => {
    const exists = current.resistanceBonuses.some((r) => r.resistanceKey === option.key);
    if (exists) return { ...current, resistanceBonuses: current.resistanceBonuses.filter((r) => r.resistanceKey !== option.key) };
    return { ...current, resistanceBonuses: [...current.resistanceBonuses, { type: 'bonus', resistanceKey: option.key, resistance: option.name, group: option.group, value: 1 }] };
  });
  const setResistance = (resistanceKey, key, value) => setForm((current) => ({
    ...current, resistanceBonuses: current.resistanceBonuses.map((r) => r.resistanceKey === resistanceKey ? { ...r, [key]: value } : r),
  }));
  const removeResistance = (resistanceKey) => setForm((current) => ({
    ...current, resistanceBonuses: current.resistanceBonuses.filter((r) => r.resistanceKey !== resistanceKey),
  }));

  const toggleAptitude = (aptitude) => setForm((current) => {
    const key = aptitude.key || slugifyKey(aptitude.nom);
    const exists = current.aptitudes.some((r) => (r.key || slugifyKey(r.nom)) === key);
    if (exists) return { ...current, aptitudes: current.aptitudes.filter((r) => (r.key || slugifyKey(r.nom)) !== key) };
    return { ...current, aptitudes: [...current.aptitudes, { key, nom: aptitude.nom, categoryKey: aptitude.categoryKey || aptitude.cat || 'general', stat: aptitude.stat || '', value: 1 }] };
  });
  const setAptitudeValue = (aptitudeKey, value) => setForm((current) => ({
    ...current, aptitudes: current.aptitudes.map((r) => (r.key || slugifyKey(r.nom)) === aptitudeKey ? { ...r, value } : r),
  }));
  const removeAptitude = (aptitudeKey) => setForm((current) => ({
    ...current, aptitudes: current.aptitudes.filter((r) => (r.key || slugifyKey(r.nom)) !== aptitudeKey),
  }));

  const toggleLanguage = (language) => setForm((current) => {
    const key = language.key || slugifyKey(language.nom);
    const exists = current.langues.some((r) => (r.key || slugifyKey(r.nom)) === key);
    if (exists) return { ...current, langues: current.langues.filter((r) => (r.key || slugifyKey(r.nom)) !== key) };
    return { ...current, langues: [...current.langues, { key, nom: language.nom, categoryKey: language.categoryKey || '' }] };
  });
  const removeLanguage = (languageKey) => setForm((current) => ({
    ...current, langues: current.langues.filter((r) => (r.key || slugifyKey(r.nom)) !== languageKey),
  }));
  const toggleProvenance = (key) => setSelectedProvenanceKeys((current) =>
    current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
  );

  const canSave = form.nom.trim().length > 0 && form.race;
  const saveForm = () => {
    const cleanResistanceBonuses = form.resistanceBonuses.filter((r) => r.resistanceKey).map((r) => {
      const opt = resistanceByKey.get(r.resistanceKey);
      return { type: r.type === 'malus' ? 'malus' : 'bonus', resistanceKey: r.resistanceKey, resistance: opt?.name || r.resistance || '', group: opt?.group || r.group || '', value: Number(r.value) || 0 };
    });
    const cleanAptitudes = form.aptitudes.filter((r) => r.key || r.nom).map((r) => {
      const key = r.key || slugifyKey(r.nom);
      const opt = aptitudeByKey.get(key);
      return { key, nom: opt?.nom || r.nom, categoryKey: opt?.categoryKey || opt?.cat || r.categoryKey || 'general', stat: opt?.stat || r.stat || '', value: Number(r.value) || 1 };
    });
    onSave({
      ...form,
      nom: form.nom.trim(),
      description: form.description.trim(),
      competenceAscendance: (form.competenceAscendance || '').trim(),
      langue: (form.langue || '').trim(),
      baseResources: { ...BLANK_ASCENDANCE.baseResources, ...(form.baseResources || {}) },
      resistanceBonuses: cleanResistanceBonuses,
      aptitudes: cleanAptitudes,
      provenanceKeys: selectedProvenanceKeys,
      aptitudeChoices: { ...BLANK_ASCENDANCE.aptitudeChoices, ...(form.aptitudeChoices || {}) },
      langues: form.langues.filter((r) => r.key || r.nom).map((r) => {
        const key = r.key || slugifyKey(r.nom);
        const opt = languageByKey.get(key);
        return { key, nom: opt?.nom || r.nom, categoryKey: opt?.categoryKey || r.categoryKey || '' };
      }),
    });
  };

  const bonusStatsCount = STAT_KEYS.filter((stat) => Number(form.bonusStats[stat] || 0) !== 0).length;
  const baseResourcesCount = RACE_RESOURCE_KEYS.filter((r) => Number(form.baseResources?.[r.key] || 0) !== 0).length;

  // Les 6 catégories se déplient toutes dans le panneau "Effets gameplay"
  // (pas d'ouverture directe d'un panneau externe au clic sur la catégorie)
  // car chacune porte son propre "Remplacer race" — un contrôle qui ne peut
  // pas vivre dans le libellé cliquable de la liste de catégories sans que
  // le clic dessus ouvre aussi le panneau externe par erreur. Résistances/
  // Aptitudes/Langues/Provenances gardent un bouton "Gérer" dans leur vue
  // dépliée pour ouvrir le picker complet (inchangé).
  const effectCategories = [
    { key: 'stats', label: 'Points de caractéristiques', count: bonusStatsCount, onOpen: () => setSelectedEffectCategory('stats') },
    { key: 'resources', label: 'Ressources de base', count: baseResourcesCount, onOpen: () => setSelectedEffectCategory('resources') },
    { key: 'resistances', label: 'Résistances', count: form.resistanceBonuses.length, onOpen: () => setSelectedEffectCategory('resistances') },
    { key: 'aptitudes', label: 'Aptitudes', count: form.aptitudes.length, onOpen: () => setSelectedEffectCategory('aptitudes') },
    { key: 'langues', label: 'Langues', count: form.langues.length, onOpen: () => setSelectedEffectCategory('langues') },
    { key: 'provenances', label: 'Provenances', count: selectedProvenanceKeys.length, onOpen: () => setSelectedEffectCategory('provenances') },
    { key: 'bonusChoices', label: 'Choix du joueur', count: form.bonusChoices.length, onOpen: () => setBonusChoicesPanelOpen(true) },
  ];

  const languageGroups = languageCategories.length > 0
    ? [
        ...languageCategories,
        ...(languageOptions.some((l) => !languageCategories.some((c) => c.key === l.categoryKey))
          ? [{ key: '__uncategorized', nom: 'Sans catégorie', couleur: '#bcecff' }]
          : []),
      ]
    : [{ key: 'langues', nom: 'Langues', couleur: '#bcecff' }];

  const handleClose = onClose || onCancel;

  return (
    <div className={`index-modal-backdrop${effectsShrink ? ' has-effects-panel' : ''}`}>
      <div className="race-modal" ref={modalRef}>
      <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? "Modifier l'ascendance" : 'Nouvelle ascendance'}</h3>
            <button className="admin-btn" onClick={handleClose}>✕ Annuler</button>
          </div>
          <div className="race-form-body">
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Identité</div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Mécanisation à 40%" />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Race parente *</label>
                  <select value={form.race} onChange={(e) => set('race', e.target.value)}>
                    {raceOptions.map((race) => <option key={race} value={race}>{race}</option>)}
                  </select>
                </div>
                <TagColorPicker value={form.tagColor} onChange={(v) => set('tagColor', v)} />
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => set('description', v)} placeholder="Description lore de l'ascendance..." />
              </div>
              <div className="race-form-field">
                <label>Compétence d'ascendance</label>
                <SmartDescEditor value={form.competenceAscendance || ''} onChange={(v) => set('competenceAscendance', v)} placeholder="Ex: [ Sang ancien ] - ..." />
              </div>
              <div className="race-form-field">
                <label>Objets raciaux</label>
                <div className="race-form-row">
                  <div className="race-form-field race-form-field--sm">
                    <label>Emplacements</label>
                    <input type="number" min={0} max={20} value={form.gadgetSlots ?? 0} onChange={(e) => set('gadgetSlots', Number(e.target.value) || 0)} />
                  </div>
                  <div className="race-form-field race-form-field--grow">
                    <label>Nom (ex: Mutation, Gadget, Greffe...)</label>
                    <input
                      value={form.gadgetSlotsLabel || ''}
                      onChange={(e) => set('gadgetSlotsLabel', e.target.value)}
                      placeholder="Reprend celui de la race si vide"
                    />
                  </div>
                </div>
                <div className="race-form-field">
                  <label>Catégorie d'item liée</label>
                  <select value={form.gadgetItemCategoryId ?? ''} onChange={(e) => set('gadgetItemCategoryId', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Reprend celle de la race —</option>
                    {itemCategoryRoots.map((root) => (
                      <Fragment key={root.id}>
                        <option value={root.id}>{root.nom}</option>
                        {getItemCategoryChildren(itemCategories, root.id).map((child) => (
                          <option key={child.id} value={child.id}>— {child.nom}</option>
                        ))}
                      </Fragment>
                    ))}
                  </select>
                </div>
              </div>
              <div className="race-form-field">
                <label>Langue accordée</label>
                <p className="race-form-hint">Langue obtenue automatiquement par un personnage de cette ascendance (visible dans "Mes Langues" sur la fiche).</p>
                <div className="race-form-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <select
                    value={form.langueAccordee?.key || ''}
                    onChange={(e) => {
                      const found = languageOptions.find((l) => (l.key || slugifyKey(l.nom)) === e.target.value);
                      set('langueAccordee', found ? {
                        key: found.key || slugifyKey(found.nom),
                        nom: found.nom,
                        complet: form.langueAccordee?.complet ?? true,
                        bonus: form.langueAccordee?.bonus ?? 4,
                      } : null);
                    }}
                  >
                    <option value="">— Aucune —</option>
                    {languageOptions.map((l) => (
                      <option key={l.key || slugifyKey(l.nom)} value={l.key || slugifyKey(l.nom)}>{l.nom}</option>
                    ))}
                  </select>
                  {form.langueAccordee && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="checkbox"
                          checked={form.langueAccordee.complet}
                          onChange={(e) => set('langueAccordee', { ...form.langueAccordee, complet: e.target.checked })}
                        />
                        Don complet
                      </label>
                      {!form.langueAccordee.complet && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          Bonus
                          <input
                            type="number"
                            min={1}
                            value={form.langueAccordee.bonus}
                            onChange={(e) => set('langueAccordee', { ...form.langueAccordee, bonus: Number(e.target.value) || 0 })}
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>
                {languageOptions.length === 0 && (
                  <p className="race-form-hint" style={{ opacity: 0.6 }}>Aucune langue créée pour l'instant (section Langues).</p>
                )}
              </div>
            </div>

          </div>
          <div className="race-form-footer">
            <button className="admin-btn" onClick={handleClose}>Annuler</button>
            <button className="race-form-save-btn" onClick={() => canSave && saveForm()} disabled={!canSave}>
              {initial ? 'Enregistrer' : "Créer l'ascendance"}
            </button>
            <GameplayEffectsToggle open={effectsOpen} onToggle={setEffectsOpen} />
          </div>
          {resistancePanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Résistances d'ascendance</h4><p>Sélectionne les résistances, puis règle bonus ou malus.</p></div>
              <button className="admin-btn" onClick={() => setResistancePanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <div className="race-resistance-picker">
                {Object.entries(resistanceOptions.reduce((groups, option) => {
                  (groups[option.group] ??= []).push(option);
                  return groups;
                }, {})).map(([groupLabel, options]) => (
                  <div className="race-resistance-group" key={groupLabel}>
                    <div className="race-resistance-group-title">{groupLabel}</div>
                    <div className="race-resistance-chip-grid">
                      {options.map((option) => (
                        <button type="button" key={option.key} className={`race-resistance-chip${selectedResistanceKeys.has(option.key) ? ' is-selected' : ''}`} onClick={() => toggleResistance(option)}>{option.name}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="race-resistance-summary">
                <div className="race-resistance-summary-title">Résistances sélectionnées <span>{form.resistanceBonuses.length}</span></div>
                {form.resistanceBonuses.length === 0 ? (
                  <div className="race-form-empty">Aucun bonus ou malus de résistance.</div>
                ) : form.resistanceBonuses.map((row) => {
                  const opt = resistanceByKey.get(row.resistanceKey);
                  return (
                    <div className="race-resistance-summary-row" key={row.resistanceKey}>
                      <div className="race-resistance-summary-name">
                        <strong>{opt?.name || row.resistance || row.resistanceKey}</strong>
                        <span>{opt?.group || row.group}</span>
                      </div>
                      <div className="race-resistance-toggle">
                        <button type="button" className={row.type !== 'malus' ? 'active' : ''} onClick={() => setResistance(row.resistanceKey, 'type', 'bonus')}>Bonus</button>
                        <button type="button" className={row.type === 'malus' ? 'active is-malus' : ''} onClick={() => setResistance(row.resistanceKey, 'type', 'malus')}>Malus</button>
                      </div>
                      <input className="race-resistance-value" type="number" min={-100} max={100} value={row.value} onChange={(e) => setResistance(row.resistanceKey, 'value', Number(e.target.value))} />
                      <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => removeResistance(row.resistanceKey)}>Retirer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {aptitudePanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Aptitudes d'ascendance</h4><p>Sélectionne les aptitudes propres à cette ascendance.</p></div>
              <button className="admin-btn" onClick={() => setAptitudePanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <div className="race-resistance-picker race-aptitude-picker">
                {aptitudeCategories.map((category) => {
                  const entries = aptitudeOptions.filter((a) => (a.categoryKey || a.cat) === category.key);
                  if (entries.length === 0) return null;
                  return (
                    <div className="race-resistance-group" key={category.key} style={{ '--aptitude-color': category.couleur || '#bcecff' }}>
                      <div className="race-resistance-group-title">{category.nom}</div>
                      <div className="race-resistance-chip-grid">
                        {entries.map((aptitude) => {
                          const key = aptitude.key || slugifyKey(aptitude.nom);
                          return (
                            <button type="button" key={key} className={`race-resistance-chip race-aptitude-chip${selectedAptitudeKeys.has(key) ? ' is-selected' : ''}`} style={{ '--aptitude-color': aptitude.couleur || category.couleur || '#bcecff' }} onClick={() => toggleAptitude(aptitude)}>
                              <span>{aptitude.nom}</span>{aptitude.stat && <b>{aptitude.stat}</b>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="race-resistance-summary">
                <div className="race-resistance-summary-title">Aptitudes sélectionnées <span>{form.aptitudes.length}</span></div>
                {form.aptitudes.length === 0 ? (
                  <div className="race-form-empty">Aucune aptitude sélectionnée.</div>
                ) : form.aptitudes.map((row) => {
                  const key = row.key || slugifyKey(row.nom);
                  const apt = aptitudeByKey.get(key);
                  const cat = aptitudeCategories.find((c) => c.key === (apt?.categoryKey || apt?.cat || row.categoryKey));
                  return (
                    <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                      <div className="race-resistance-summary-name">
                        <strong>{apt?.nom || row.nom || key}</strong>
                        <span>{cat?.nom || 'Aptitude'}{(apt?.stat || row.stat) ? ` · ${apt?.stat || row.stat}` : ''}</span>
                      </div>
                      <input className="race-resistance-value" type="number" value={row.value ?? 1} onChange={(e) => setAptitudeValue(key, Number(e.target.value) || 0)} />
                      <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => removeAptitude(key)}>Retirer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {languagePanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Langues d'ascendance</h4><p>Sélectionne les langues propres à cette ascendance.</p></div>
              <button className="admin-btn" onClick={() => setLanguagePanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <div className="race-resistance-picker race-aptitude-picker">
                {languageGroups.map((category) => {
                  const entries = languageOptions.filter((l) =>
                    languageCategories.length === 0 || (l.categoryKey || '__uncategorized') === category.key
                  );
                  if (entries.length === 0) return null;
                  return (
                    <div className="race-resistance-group" key={category.key} style={{ '--aptitude-color': category.couleur || '#bcecff' }}>
                      <div className="race-resistance-group-title">{category.nom}</div>
                      <div className="race-resistance-chip-grid">
                        {entries.map((language) => {
                          const key = language.key || slugifyKey(language.nom);
                          return (
                            <button type="button" key={key} className={`race-resistance-chip race-aptitude-chip${selectedLanguageKeys.has(key) ? ' is-selected' : ''}`} style={{ '--aptitude-color': language.couleur || category.couleur || '#bcecff' }} onClick={() => toggleLanguage(language)}>
                              <span>{language.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="race-resistance-summary">
                <div className="race-resistance-summary-title">Langues sélectionnées <span>{form.langues.length}</span></div>
                {form.langues.length === 0 ? (
                  <div className="race-form-empty">Aucune langue sélectionnée.</div>
                ) : form.langues.map((row) => {
                  const key = row.key || slugifyKey(row.nom);
                  const lang = languageByKey.get(key);
                  const cat = languageCategories.find((c) => c.key === (lang?.categoryKey || row.categoryKey));
                  return (
                    <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                      <div className="race-resistance-summary-name"><strong>{lang?.nom || row.nom || key}</strong><span>{cat?.nom || 'Langue'}</span></div>
                      <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => removeLanguage(key)}>Retirer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {provenancePanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Provenances d'ascendance</h4><p>Sélectionne les provenances liées à cette ascendance.</p></div>
              <button className="admin-btn" onClick={() => setProvenancePanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <div className="race-resistance-picker race-aptitude-picker">
                <div className="race-resistance-group" style={{ '--aptitude-color': '#7ab8c8' }}>
                  <div className="race-resistance-group-title">Provenances</div>
                  <div className="race-resistance-chip-grid">
                    {provenanceOptions.length === 0 ? (
                      <div className="race-form-empty">Aucune provenance disponible. Crée-en dans la section Provenances.</div>
                    ) : provenanceOptions.map((p) => (
                      <button type="button" key={p.key} className={`race-resistance-chip race-aptitude-chip${selectedProvenanceKeys.includes(p.key) ? ' is-selected' : ''}`} style={{ '--aptitude-color': p.tagColor || '#7ab8c8' }} onClick={() => toggleProvenance(p.key)}>
                        <span>{p.nom}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="race-resistance-summary">
                <div className="race-resistance-summary-title">Provenances sélectionnées <span>{selectedProvenanceKeys.length}</span></div>
                {selectedProvenanceKeys.length === 0 ? (
                  <div className="race-form-empty">Aucune provenance sélectionnée.</div>
                ) : selectedProvenanceKeys.map((key) => {
                  const p = provenanceOptions.find((p) => p.key === key);
                  return (
                    <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                      <div className="race-resistance-summary-name"><strong>{p?.nom || key}</strong><span>Provenance</span></div>
                      <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => toggleProvenance(key)}>Retirer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {bonusChoicesPanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Choix du joueur</h4><p>Ex: Demi-Ein "Résistance +20% Chaos OU Lumière au choix".</p></div>
              <button className="admin-btn" onClick={() => setBonusChoicesPanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <BonusChoicesEditor
                value={form.bonusChoices}
                onChange={(v) => set('bonusChoices', v)}
                domainCatalogs={{
                  caracteristique: getCaracteristiqueCatalog(customCaracteristiques),
                  aptitude: getAptitudeCatalog({ customAptitudes, customAptitudeCategories }),
                  resistance: getResistanceCatalog({ customResistanceEntries, customResistanceCategories }),
                }}
              />
            </div>
          </div>
        </div>
      )}
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
          {selectedEffectCategory ? (
            <>
              <div className="admin-effects-panel-body">
                {selectedEffectCategory === 'stats' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Points de caractéristiques</span>
                      <ReplaceToggle checked={form.replaceRaceStats} onChange={(v) => set('replaceRaceStats', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Ces valeurs peuvent s'ajouter aux bonus de race ou les remplacer selon l'option cochée.</p>
                    <div className="race-form-stats-grid">
                      {STAT_KEYS.map((stat) => (
                        <div key={stat} className="race-form-stat">
                          <label>{stat}</label>
                          <input type="number" min={-5} max={10} value={form.bonusStats[stat] || 0} onChange={(e) => setStat(stat, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEffectCategory === 'resources' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Ressources de base</span>
                      <ReplaceToggle checked={form.replaceRaceResources} onChange={(v) => set('replaceRaceResources', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Si "Remplacer race" est décoché, ces valeurs s'ajoutent aux ressources de la race.</p>
                    <div className="race-form-stats-grid race-form-stats-grid--resources">
                      {RACE_RESOURCE_KEYS.map((res) => (
                        <div key={res.key} className="race-form-stat">
                          <label>{res.label}</label>
                          <input type="number" min={-50} max={100} value={form.baseResources?.[res.key] || 0} onChange={(e) => setResource(res.key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEffectCategory === 'resistances' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Résistances</span>
                      <ReplaceToggle checked={form.replaceRaceResistances} onChange={(v) => set('replaceRaceResistances', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Ouvre le panneau pour choisir les bonus ou malus de résistances de cette ascendance.</p>
                    <div className="race-resistance-card">
                      <div className="race-resistance-summary-title">Résistances configurées <span>{form.resistanceBonuses.length}</span></div>
                      {form.resistanceBonuses.length === 0 ? (
                        <div className="race-form-empty">Aucun bonus ou malus de résistance.</div>
                      ) : (
                        <div className="race-resistance-pill-list">
                          {form.resistanceBonuses.map((row) => {
                            const opt = resistanceByKey.get(row.resistanceKey);
                            return (
                              <span className={`race-resistance-pill is-${row.type === 'malus' ? 'malus' : 'bonus'}`} key={row.resistanceKey}>
                                {opt?.name || row.resistance || row.resistanceKey}
                                <b>{row.type === 'malus' ? '-' : '+'}{Math.abs(Number(row.value) || 0)}</b>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button type="button" className="admin-btn admin-btn--add" onClick={() => setResistancePanelOpen(true)}>Gérer les résistances</button>
                  </div>
                )}

                {selectedEffectCategory === 'aptitudes' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Aptitudes</span>
                      <ReplaceToggle checked={form.replaceRaceAptitudes} onChange={(v) => set('replaceRaceAptitudes', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Ouvre le panneau pour choisir les aptitudes propres à cette ascendance.</p>
                    <div className="race-resistance-card race-aptitude-card">
                      <div className="race-resistance-summary-title">Aptitudes configurées <span>{form.aptitudes.length}</span></div>
                      {form.aptitudes.length === 0 ? (
                        <div className="race-form-empty">Aucune aptitude associée à cette ascendance.</div>
                      ) : (
                        <div className="race-resistance-pill-list">
                          {form.aptitudes.map((row) => {
                            const key = row.key || slugifyKey(row.nom);
                            const apt = aptitudeByKey.get(key);
                            return (
                              <span className="race-resistance-pill race-aptitude-pill" style={{ '--aptitude-color': apt?.couleur || '#bcecff' }} key={key}>
                                {apt?.nom || row.nom || key}
                                {(apt?.stat || row.stat) && <b>{apt?.stat || row.stat}</b>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="race-form-row race-form-row--compact">
                      <div className="race-form-field race-form-field--grow">
                        <label>Choix autorisés à +1</label>
                        <input type="number" min={0} value={form.aptitudeChoices?.plusOne ?? 1} onChange={(e) => setAptitudeChoice('plusOne', e.target.value)} />
                      </div>
                      <div className="race-form-field race-form-field--grow">
                        <label>Choix autorisés à +2</label>
                        <input type="number" min={0} value={form.aptitudeChoices?.plusTwo ?? 1} onChange={(e) => setAptitudeChoice('plusTwo', e.target.value)} />
                      </div>
                    </div>
                    <button type="button" className="admin-btn admin-btn--add" onClick={() => setAptitudePanelOpen(true)}>Gérer les aptitudes</button>
                  </div>
                )}

                {selectedEffectCategory === 'langues' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Langues</span>
                      <ReplaceToggle checked={form.replaceRaceLanguages} onChange={(v) => set('replaceRaceLanguages', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Ouvre le panneau pour choisir les langues propres à cette ascendance.</p>
                    <div className="race-resistance-card race-language-card">
                      <div className="race-resistance-summary-title">Langues configurées <span>{form.langues.length}</span></div>
                      {form.langues.length === 0 ? (
                        <div className="race-form-empty">{languageOptions.length === 0 ? 'Aucune langue créée pour le moment.' : 'Aucune langue associée à cette ascendance.'}</div>
                      ) : (
                        <div className="race-resistance-pill-list">
                          {form.langues.map((row) => {
                            const key = row.key || slugifyKey(row.nom);
                            const lang = languageByKey.get(key);
                            const cat = languageCategories.find((c) => c.key === (lang?.categoryKey || row.categoryKey));
                            return (
                              <span className="race-resistance-pill race-language-pill" style={{ '--aptitude-color': lang?.couleur || cat?.couleur || '#bcecff' }} key={key}>
                                {lang?.nom || row.nom || key}
                                {cat?.nom && <b>{cat.nom}</b>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button type="button" className="admin-btn admin-btn--add" onClick={() => setLanguagePanelOpen(true)}>Gérer les langues</button>
                  </div>
                )}

                {selectedEffectCategory === 'provenances' && (
                  <div className="race-form-section">
                    <div className="race-form-section-title race-form-section-title--with-action">
                      <span>Provenances configurées</span>
                      <ReplaceToggle checked={form.replaceRaceProvenances} onChange={(v) => set('replaceRaceProvenances', v)} label="Remplacer race" />
                    </div>
                    <p className="race-form-hint">Ouvre le panneau pour sélectionner les provenances liées à cette ascendance.</p>
                    <div className="race-resistance-card race-origin-card">
                      <div className="race-resistance-summary-title">Provenances sélectionnées <span>{selectedProvenanceKeys.length}</span></div>
                      {selectedProvenanceKeys.length === 0 ? (
                        <div className="race-form-empty">Aucune provenance associée à cette ascendance.</div>
                      ) : (
                        <div className="race-resistance-pill-list">
                          {selectedProvenanceKeys.map((key) => {
                            const p = provenanceOptions.find((p) => p.key === key);
                            return (
                              <span className="race-resistance-pill race-language-pill" style={{ '--aptitude-color': p?.tagColor || '#7ab8c8' }} key={key}>
                                {p?.nom || key}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button type="button" className="admin-btn admin-btn--add" onClick={() => setProvenancePanelOpen(true)}>Gérer les provenances</button>
                  </div>
                )}
              </div>
              <div className="admin-effects-panel-actions">
                <button type="button" className="admin-btn" onClick={() => setSelectedEffectCategory(null)}>‹ Retour à la liste</button>
              </div>
            </>
          ) : (
            <EffectsPanel categories={effectCategories} />
          )}
        </div>
      )}
    </div>
  );
}

export default function AscendancesPanel() {
  const {
    customRaces, customAscendances, customProvenances,
    hiddenAscendanceKeys: storedHiddenAscendanceKeys,
    addAscendance, updateAscendance, deleteAscendance, hideDefaultAscendance,
  } = useAdminStore();

  const provenanceOptions = asArray(customProvenances).map((p) => ({ key: p.key || slugifyKey(p.nom), nom: p.nom, tagColor: p.tagColor }));
  const baseRaces = [...new Set(ASCENDANCE_DATA.map((a) => a.race))];
  const races = [...new Set([...baseRaces, ...asArray(customRaces).map((r) => r.nom).filter(Boolean)])].sort();
  const hiddenAscendanceKeys = new Set(asArray(storedHiddenAscendanceKeys));
  const customAscendanceKeys = new Set(asArray(customAscendances).map((a) => a.key || slugifyKey(`${a.race}-${a.nom}`)));
  const entries = [
    ...ASCENDANCE_DATA
      .map((a) => ({ ...a, key: slugifyKey(`${a.race}-${a.nom}`), isDefault: true }))
      .filter((a) => !hiddenAscendanceKeys.has(a.key) && !customAscendanceKeys.has(a.key)),
    ...asArray(customAscendances),
  ];

  const [search, setSearch] = useState('');
  const [sel, setSel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAscendance, setEditingAscendance] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = entries.filter((a) => (
    (sel === 'all' || a.race === sel)
    && (
      String(a.nom || '').toLowerCase().includes(search.toLowerCase())
      || String(a.race || '').toLowerCase().includes(search.toLowerCase())
      || String(a.description || '').toLowerCase().includes(search.toLowerCase())
    )
  ));

  const statsDisplay = (asc) => {
    if (!asc.bonusStats) return null;
    const nonZero = Object.entries(asc.bonusStats).filter(([, v]) => v !== 0);
    if (nonZero.length === 0) return null;
    return (asc.replaceRaceStats ? 'Remplace race : ' : '') + nonZero.map(([s, v]) => `${s} ${v > 0 ? '+' : ''}${v}`).join(' · ');
  };
  const resourceDisplay = (asc) => {
    const nonZero = RACE_RESOURCE_KEYS.map((res) => [res.label, Number(asc.baseResources?.[res.key]) || 0]).filter(([, v]) => v !== 0);
    if (nonZero.length === 0) return null;
    return (asc.replaceRaceResources ? 'Remplace race : ' : '') + nonZero.map(([label, v]) => `${label} ${v > 0 ? '+' : ''}${v}`).join(' · ');
  };
  const replacePrefix = (enabled) => enabled ? 'Remplace race : ' : '';

  const renderAscendanceCard = (asc) => (
    <div key={asc.id || `${asc.race}-${asc.nom}`} className="entry-card" style={{ '--entry-color': asc.tagColor || '#bcecff' }}>
      <div className="entry-card-top">
        <div className="entry-card-badge">{(asc.nom || '?').trim().charAt(0).toUpperCase()}</div>
        <div className="entry-card-body">
          <span className="entry-card-kicker">{asc.custom ? 'Ascendance personnalisée' : asc.race}</span>
          <h3 className="entry-card-title">{asc.nom}</h3>
        </div>
      </div>
      {(statsDisplay(asc) || resourceDisplay(asc)) && (
        <div className="entry-card-meta">
          {statsDisplay(asc) && <span>{statsDisplay(asc)}</span>}
          {resourceDisplay(asc) && <span>{resourceDisplay(asc)}</span>}
        </div>
      )}
      {asc.description && <div className="entry-card-desc">{asc.description}</div>}
      <div className="entry-card-detail">
        {asc.competenceAscendance && <span>Compétence : <b>{asc.competenceAscendance}</b></span>}
        {asArray(asc.resistanceBonuses).length > 0 && (
          <span>Résistances : <b>{replacePrefix(asc.replaceRaceResistances)}{asArray(asc.resistanceBonuses).map((r) => `${r.type === 'malus' ? 'Malus' : 'Bonus'} ${r.resistance || r.resistanceKey} ${r.value > 0 ? '+' : ''}${r.value}`).join(', ')}</b></span>
        )}
        {asArray(asc.aptitudes).length > 0 && (
          <span>Aptitudes : <b>{replacePrefix(asc.replaceRaceAptitudes)}{asArray(asc.aptitudes).map((a) => a.nom).join(', ')}</b></span>
        )}
        {asc.aptitudeChoices && <span>Choix aptitudes : <b>+1 x{asc.aptitudeChoices.plusOne ?? 1} · +2 x{asc.aptitudeChoices.plusTwo ?? 1}</b></span>}
        {asArray(asc.langues).length > 0 && (
          <span>Langues : <b>{replacePrefix(asc.replaceRaceLanguages)}{asArray(asc.langues).map((l) => l.nom).join(', ')}</b></span>
        )}
        {asArray(asc.provenanceKeys).length > 0 && (
          <span>Provenances : <b>{asArray(asc.provenanceKeys).map((k) => provenanceOptions.find((p) => p.key === k)?.nom || k).join(', ')}</b></span>
        )}
      </div>
      <div className="entry-card-actions">
        <button className="admin-btn" onClick={() => { setEditingAscendance(asc); setShowForm(true); }}>Modifier</button>
        <button className="admin-btn admin-btn--danger" onClick={() => setConfirmDelete({
          title: "Supprimer l'ascendance",
          message: `Supprimer "${asc.nom}" ?`,
          onConfirm: () => asc.custom ? deleteAscendance(asc.id) : hideDefaultAscendance(asc.key),
        })}>Supprimer</button>
      </div>
    </div>
  );

  const handleSave = (form) => {
    const payload = { ...form, key: form.key || slugifyKey(`${form.race}-${form.nom}`) };
    if (editingAscendance?.custom) updateAscendance(editingAscendance.id, payload);
    else if (editingAscendance?.isDefault) addAscendance({ ...payload, custom: true });
    else addAscendance(payload);
    setShowForm(false);
    setEditingAscendance(null);
  };

  return (
    <div className="admin-panel">
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingAscendance(null); setShowForm(true); }}>+ Nouvelle ascendance</button>
      </div>
      {showForm && (
        <AscendanceForm
          initial={editingAscendance}
          raceOptions={races}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingAscendance(null); }}
          onCancel={() => { setShowForm(false); setEditingAscendance(null); }}
        />
      )}
      <AdminFilterPanel
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        total={entries.length}
        fields={[{ key: 'race', label: 'Race', value: sel, onChange: setSel, options: uniqueOptions(races) }]}
      />
      <CategoryAccordionList
        small
        categories={races
          .filter((race) => sel === 'all' || race === sel)
          .map((race) => ({ key: race, nom: race, couleur: '#bcecff' }))
          .filter((race) => filtered.some((a) => a.race === race.key))}
        entriesForCategory={(category) => filtered.filter((a) => a.race === category.key)}
        renderContent={(category, categoryEntries) => (
          <div className="entry-card-grid entry-card-grid--wide">
            {categoryEntries.length > 0 ? categoryEntries.map(renderAscendanceCard) : (
              <div className="index-empty">Aucune ascendance dans cette race.</div>
            )}
          </div>
        )}
      />
    </div>
  );
}
