import { useState } from 'react';
import { RACE_DATA, APTITUDES, APT_CATEGORIES, RESISTANCES_DEF } from '../../../data/gameData';
import { useAdminStore } from '../../../store/adminStore';
import SmartDescEditor from '../../../components/admin/SmartDescEditor';
import {
  ConfirmModal, AdminFilterPanel, CategoryAccordionList,
  TagColorPicker, EffectsPanel, KnowledgeCategoryModal, GameplayEffectsToggle,
} from '../AdminShared';
import { useGameplayEffectsPanel, useMatchedHeight } from '../adminEffectsPanelHooks';
import {
  asArray, slugifyKey,
  STAT_KEYS, BLANK_RACE, RACE_RESOURCE_KEYS, hasAnyIdentityEffects,
} from '../adminUtils';

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

function buildResistanceOptions() {
  return Object.entries(RESISTANCES_DEF).flatMap(([groupKey, group]) =>
    (group.items || []).map((name) => ({ key: `${groupKey}:${slugifyKey(name)}`, group: group.label, name }))
  );
}

function ResistancePanel({ title, desc, resistanceBonuses, onClose, onToggle, onSet, onRemove }) {
  const resistanceOptions = buildResistanceOptions();
  const resistanceByKey = new Map(resistanceOptions.map((o) => [o.key, o]));
  const selectedKeys = new Set(resistanceBonuses.map((r) => r.resistanceKey));
  return (
    <div className="race-resistance-panel-backdrop">
      <div className="race-resistance-panel">
        <div className="race-resistance-panel-head">
          <div><h4>{title}</h4><p>{desc}</p></div>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="race-resistance-panel-body">
          <div className="race-resistance-picker">
            {Object.entries(RESISTANCES_DEF).map(([groupKey, group]) => (
              <div className="race-resistance-group" key={groupKey}>
                <div className="race-resistance-group-title">{group.label}</div>
                <div className="race-resistance-chip-grid">
                  {(group.items || []).map((name) => {
                    const option = { key: `${groupKey}:${slugifyKey(name)}`, group: group.label, name };
                    return (
                      <button type="button" key={option.key} className={`race-resistance-chip${selectedKeys.has(option.key) ? ' is-selected' : ''}`} onClick={() => onToggle(option)}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="race-resistance-summary">
            <div className="race-resistance-summary-title">Résistances sélectionnées <span>{resistanceBonuses.length}</span></div>
            {resistanceBonuses.length === 0 ? (
              <div className="race-form-empty">Aucun bonus ou malus.</div>
            ) : resistanceBonuses.map((row) => {
              const opt = resistanceByKey.get(row.resistanceKey);
              return (
                <div className="race-resistance-summary-row" key={row.resistanceKey}>
                  <div className="race-resistance-summary-name">
                    <strong>{opt?.name || row.resistance || row.resistanceKey}</strong>
                    <span>{opt?.group || row.group}</span>
                  </div>
                  <div className="race-resistance-toggle">
                    <button type="button" className={row.type !== 'malus' ? 'active' : ''} onClick={() => onSet(row.resistanceKey, 'type', 'bonus')}>Bonus</button>
                    <button type="button" className={row.type === 'malus' ? 'active is-malus' : ''} onClick={() => onSet(row.resistanceKey, 'type', 'malus')}>Malus</button>
                  </div>
                  <input className="race-resistance-value" type="number" min={-100} max={100} value={row.value} onChange={(e) => onSet(row.resistanceKey, 'value', Number(e.target.value))} />
                  <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => onRemove(row.resistanceKey)}>Retirer</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AptitudePanel({ title, desc, selected, aptitudeCategories, aptitudeOptions, onClose, onToggle, onRemove }) {
  const aptitudeByKey = new Map(aptitudeOptions.map((a) => [a.key || slugifyKey(a.nom), a]));
  const selectedKeys = new Set(selected.map((r) => r.key || slugifyKey(r.nom)));
  return (
    <div className="race-resistance-panel-backdrop">
      <div className="race-resistance-panel">
        <div className="race-resistance-panel-head">
          <div><h4>{title}</h4><p>{desc}</p></div>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
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
                        <button type="button" key={key} className={`race-resistance-chip race-aptitude-chip${selectedKeys.has(key) ? ' is-selected' : ''}`} style={{ '--aptitude-color': aptitude.couleur || category.couleur || '#bcecff' }} onClick={() => onToggle(aptitude)}>
                          <span>{aptitude.nom}</span>
                          {aptitude.stat && <b>{aptitude.stat}</b>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="race-resistance-summary">
            <div className="race-resistance-summary-title">Aptitudes sélectionnées <span>{selected.length}</span></div>
            {selected.length === 0 ? (
              <div className="race-form-empty">Aucune aptitude sélectionnée.</div>
            ) : selected.map((row) => {
              const key = row.key || slugifyKey(row.nom);
              const apt = aptitudeByKey.get(key);
              const cat = aptitudeCategories.find((c) => c.key === (apt?.categoryKey || apt?.cat || row.categoryKey));
              return (
                <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                  <div className="race-resistance-summary-name">
                    <strong>{apt?.nom || row.nom || key}</strong>
                    <span>{cat?.nom || 'Aptitude'}{(apt?.stat || row.stat) ? ` · ${apt?.stat || row.stat}` : ''}</span>
                  </div>
                  <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => onRemove(key)}>Retirer</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguagePanel({ title, desc, selected, languageOptions, languageCategories, onClose, onToggle, onRemove }) {
  const languageByKey = new Map(languageOptions.map((l) => [l.key || slugifyKey(l.nom), l]));
  const selectedKeys = new Set(selected.map((r) => r.key || slugifyKey(r.nom)));
  const groups = languageCategories.length > 0
    ? [
        ...languageCategories,
        ...(languageOptions.some((l) => !languageCategories.some((c) => c.key === l.categoryKey))
          ? [{ key: '__uncategorized', nom: 'Sans catégorie', couleur: '#bcecff' }]
          : []),
      ]
    : [{ key: 'langues', nom: 'Langues', couleur: '#bcecff' }];
  return (
    <div className="race-resistance-panel-backdrop">
      <div className="race-resistance-panel">
        <div className="race-resistance-panel-head">
          <div><h4>{title}</h4><p>{desc}</p></div>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="race-resistance-panel-body">
          <div className="race-resistance-picker race-aptitude-picker">
            {groups.map((category) => {
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
                        <button type="button" key={key} className={`race-resistance-chip race-aptitude-chip${selectedKeys.has(key) ? ' is-selected' : ''}`} style={{ '--aptitude-color': language.couleur || category.couleur || '#bcecff' }} onClick={() => onToggle(language)}>
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
            <div className="race-resistance-summary-title">Langues sélectionnées <span>{selected.length}</span></div>
            {selected.length === 0 ? (
              <div className="race-form-empty">Aucune langue sélectionnée.</div>
            ) : selected.map((row) => {
              const key = row.key || slugifyKey(row.nom);
              const lang = languageByKey.get(key);
              const cat = languageCategories.find((c) => c.key === (lang?.categoryKey || row.categoryKey));
              return (
                <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                  <div className="race-resistance-summary-name">
                    <strong>{lang?.nom || row.nom || key}</strong>
                    <span>{cat?.nom || 'Langue'}</span>
                  </div>
                  <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => onRemove(key)}>Retirer</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RaceForm({ initial, onSave, onCancel }) {
  const customRaceCategories = useAdminStore((state) => state.customRaceCategories);
  const customLanguageCategories = useAdminStore((state) => state.customLanguageCategories);
  const customLanguages = useAdminStore((state) => state.customLanguages);
  const customAptitudeCategories = useAdminStore((state) => state.customAptitudeCategories);
  const customAptitudes = useAdminStore((state) => state.customAptitudes);
  const storedHiddenAptitudeKeys = useAdminStore((state) => state.hiddenAptitudeKeys);
  const customProvenances = useAdminStore((state) => state.customProvenances);
  const updateProvenance = useAdminStore((state) => state.updateProvenance);

  const languageOptions = asArray(customLanguages);
  const languageCategories = asArray(customLanguageCategories);
  const raceCategories = [
    { key: 'base', nom: 'Races de base', couleur: '#c8a84a' },
    ...asArray(customRaceCategories),
  ];

  const { aptitudeCategories, options: aptitudeOptions } = buildAptitudeOptions(customAptitudeCategories, customAptitudes, storedHiddenAptitudeKeys);
  const aptitudeByKey = new Map(aptitudeOptions.map((a) => [a.key || slugifyKey(a.nom), a]));
  const languageByKey = new Map(languageOptions.map((l) => [l.key || slugifyKey(l.nom), l]));

  const normalizeInitial = (race) => ({
    ...BLANK_RACE,
    ...(race || {}),
    categoryKey: race?.categoryKey || (race?.custom ? 'custom' : 'base'),
    tagColor: race?.tagColor || race?.couleur || BLANK_RACE.tagColor,
    bonusStats: { ...BLANK_RACE.bonusStats, ...(race?.bonusStats || {}) },
    baseResources: { ...BLANK_RACE.baseResources, ...(race?.baseResources || {}) },
    resistanceBonuses: Array.isArray(race?.resistanceBonuses) ? race.resistanceBonuses : [],
    aptitudes: Array.isArray(race?.aptitudes) ? race.aptitudes : [],
    langues: Array.isArray(race?.langues) ? race.langues : [],
  });

  const [form, setForm] = useState(() => normalizeInitial(initial));
  const [effectsOpen, setEffectsOpen] = useState(() => hasAnyIdentityEffects(initial));
  const { mounted: effectsMounted, shrink: effectsShrink, shifted: effectsShifted, visible: effectsVisible } = useGameplayEffectsPanel(effectsOpen);
  const [modalRef, modalHeight] = useMatchedHeight();
  const [resistancePanelOpen, setResistancePanelOpen] = useState(false);
  const [aptitudePanelOpen, setAptitudePanelOpen] = useState(false);
  const [languagePanelOpen, setLanguagePanelOpen] = useState(false);
  const [provenancePanelOpen, setProvenancePanelOpen] = useState(false);
  // Stats/Ressources sont de simples grilles de nombres (pas besoin d'un
  // gros panneau plein écran comme résistances/aptitudes/langues) : elles
  // se déplient directement dans le panneau "Effets gameplay" lui-même,
  // avec un bouton retour — même principe que ItemEffectsPanel côté items.
  const [selectedEffectCategory, setSelectedEffectCategory] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setStat = (stat, val) => setForm((f) => ({ ...f, bonusStats: { ...f.bonusStats, [stat]: Number(val) || 0 } }));
  const setResource = (resource, val) => setForm((f) => ({
    ...f, baseResources: { ...BLANK_RACE.baseResources, ...(f.baseResources || {}), [resource]: Number(val) || 0 },
  }));

  const selectedResistanceKeys = new Set(form.resistanceBonuses.map((r) => r.resistanceKey));
  const resistanceByKey = new Map(buildResistanceOptions().map((o) => [o.key, o]));

  const raceName = initial?.nom || form.nom;
  const linkedProvenanceIds = new Set(
    asArray(customProvenances).filter((p) => (p.races || []).includes(raceName)).map((p) => p.id)
  );
  const toggleRaceProvenance = (provenance) => {
    const hasRace = (provenance.races || []).includes(raceName);
    updateProvenance(provenance.id, {
      races: hasRace
        ? (provenance.races || []).filter((r) => r !== raceName)
        : [...(provenance.races || []), raceName],
    });
  };

  const toggleResistance = (option) => setForm((current) => {
    const exists = current.resistanceBonuses.some((r) => r.resistanceKey === option.key);
    if (exists) return { ...current, resistanceBonuses: current.resistanceBonuses.filter((r) => r.resistanceKey !== option.key) };
    return { ...current, resistanceBonuses: [...current.resistanceBonuses, { type: 'bonus', resistanceKey: option.key, resistance: option.name, group: option.group, value: 1 }] };
  });
  const setResistance = (resistanceKey, key, value) => setForm((current) => ({
    ...current,
    resistanceBonuses: current.resistanceBonuses.map((r) => r.resistanceKey === resistanceKey ? { ...r, [key]: value } : r),
  }));
  const removeResistance = (resistanceKey) => setForm((current) => ({
    ...current, resistanceBonuses: current.resistanceBonuses.filter((r) => r.resistanceKey !== resistanceKey),
  }));

  const toggleAptitude = (aptitude) => setForm((current) => {
    const key = aptitude.key || slugifyKey(aptitude.nom);
    const exists = current.aptitudes.some((r) => (r.key || slugifyKey(r.nom)) === key);
    if (exists) return { ...current, aptitudes: current.aptitudes.filter((r) => (r.key || slugifyKey(r.nom)) !== key) };
    return { ...current, aptitudes: [...current.aptitudes, { key, nom: aptitude.nom, categoryKey: aptitude.categoryKey || aptitude.cat || 'general', stat: aptitude.stat || '' }] };
  });
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

  const canSave = form.nom.trim().length > 0;
  const saveForm = () => {
    const cleanResistanceBonuses = form.resistanceBonuses.filter((r) => r.resistanceKey).map((r) => {
      const opt = resistanceByKey.get(r.resistanceKey);
      return { type: r.type === 'malus' ? 'malus' : 'bonus', resistanceKey: r.resistanceKey, resistance: opt?.name || r.resistance || '', group: opt?.group || r.group || '', value: Number(r.value) || 0 };
    });
    const cleanAptitudes = form.aptitudes.filter((r) => r.key || r.nom).map((r) => {
      const key = r.key || slugifyKey(r.nom);
      const opt = aptitudeByKey.get(key);
      return { key, nom: opt?.nom || r.nom, categoryKey: opt?.categoryKey || opt?.cat || r.categoryKey || 'general', stat: opt?.stat || r.stat || '' };
    });
    const cleanLanguages = form.langues.filter((r) => r.key || r.nom).map((r) => {
      const key = r.key || slugifyKey(r.nom);
      const opt = languageByKey.get(key);
      return { key, nom: opt?.nom || r.nom, categoryKey: opt?.categoryKey || r.categoryKey || '' };
    });
    onSave({
      ...form,
      key: form.key || slugifyKey(`${form.race}-${form.nom}`),
      nom: form.nom.trim(),
      description: form.description.trim(),
      competenceRaciale: (form.competenceRaciale || '').trim(),
      baseResources: { ...BLANK_RACE.baseResources, ...(form.baseResources || {}) },
      resistanceBonuses: cleanResistanceBonuses,
      aptitudes: cleanAptitudes,
      langues: cleanLanguages,
    });
  };

  const bonusStatsCount = STAT_KEYS.filter((stat) => Number(form.bonusStats[stat] || 0) !== 0).length;
  const baseResourcesCount = RACE_RESOURCE_KEYS.filter((r) => Number(form.baseResources?.[r.key] || 0) !== 0).length;

  const effectCategories = [
    { key: 'stats', label: 'Bonus de caractéristiques', count: bonusStatsCount, onOpen: () => setSelectedEffectCategory('stats') },
    { key: 'resources', label: 'Ressources de base', count: baseResourcesCount, onOpen: () => setSelectedEffectCategory('resources') },
    { key: 'resistances', label: 'Résistances', count: form.resistanceBonuses.length, onOpen: () => setResistancePanelOpen(true) },
    { key: 'aptitudes', label: 'Aptitudes', count: form.aptitudes.length, onOpen: () => setAptitudePanelOpen(true) },
    { key: 'langues', label: 'Langues', count: form.langues.length, onOpen: () => setLanguagePanelOpen(true) },
    { key: 'provenances', label: 'Provenances', count: linkedProvenanceIds.size, onOpen: () => setProvenancePanelOpen(true) },
  ];

  return (
    <div className={`index-modal-backdrop${effectsShrink ? ' has-effects-panel' : ''}`}>
      <div className="race-modal" ref={modalRef}>
      <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? 'Modifier la race' : 'Nouvelle race'}</h3>
            <button className="admin-btn" onClick={onCancel}>✕ Annuler</button>
          </div>
          <div className="race-form-body">
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Identité</div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Humain" />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Catégorie</label>
                  <select value={form.categoryKey || 'base'} onChange={(e) => set('categoryKey', e.target.value)}>
                    {raceCategories.map((cat) => <option key={cat.key} value={cat.key}>{cat.nom}</option>)}
                  </select>
                </div>
                <div className="race-form-field race-form-field--sm">
                  <label>Déplacement</label>
                  <input type="number" min={1} max={20} value={form.deplacement} onChange={(e) => set('deplacement', Number(e.target.value))} />
                </div>
                <TagColorPicker value={form.tagColor} onChange={(v) => set('tagColor', v)} />
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description} onChange={(v) => set('description', v)} placeholder="Description lore de la race..." />
              </div>
              <div className="race-form-field">
                <label>Compétence raciale innée</label>
                <SmartDescEditor value={form.competenceRaciale || ''} onChange={(v) => set('competenceRaciale', v)} placeholder="Ex: [ Résilience ] - Une fois par combat..." />
              </div>
            </div>

            {(form.bonusResistances || form.malusResistances) && (
              <div className="race-form-section">
                <div className="race-form-section-title">Anciennes données texte</div>
                <div className="race-form-info-box">
                  <span>!</span>
                  <p>Cette race contient d'anciennes résistances texte. Recrée-les avec les lignes structurées ci-dessus avant d'enregistrer définitivement.</p>
                </div>
              </div>
            )}

            <div className="race-form-section">
              <div className="race-form-section-title">Ascendances</div>
              <div className="race-form-info-box">
                <span>💡</span>
                <p>Les ascendances se créent depuis l'onglet <strong>Ascendances</strong> en sélectionnant leur race parente. Elles apparaîtront automatiquement liées à cette race.</p>
              </div>
            </div>
          </div>

          <div className="race-form-footer">
            <button className="admin-btn" onClick={onCancel}>Annuler</button>
            <button className="race-form-save-btn" onClick={() => canSave && saveForm()} disabled={!canSave}>
              {initial ? 'Enregistrer' : 'Créer la race'}
            </button>
            <GameplayEffectsToggle open={effectsOpen} onToggle={setEffectsOpen} />
          </div>
          {resistancePanelOpen && (
        <ResistancePanel
          title="Gestion des résistances"
          desc="Sélectionne les résistances, puis règle bonus ou malus."
          resistanceBonuses={form.resistanceBonuses}
          onClose={() => setResistancePanelOpen(false)}
          onToggle={toggleResistance}
          onSet={setResistance}
          onRemove={removeResistance}
        />
      )}
      {aptitudePanelOpen && (
        <AptitudePanel
          title="Gestion des aptitudes"
          desc="Sélectionne les aptitudes liées à cette race."
          selected={form.aptitudes}
          aptitudeCategories={aptitudeCategories}
          aptitudeOptions={aptitudeOptions}
          onClose={() => setAptitudePanelOpen(false)}
          onToggle={toggleAptitude}
          onRemove={removeAptitude}
        />
      )}
      {languagePanelOpen && (
        <LanguagePanel
          title="Gestion des langues"
          desc="Sélectionne les langues parlées par cette race."
          selected={form.langues}
          languageOptions={languageOptions}
          languageCategories={languageCategories}
          onClose={() => setLanguagePanelOpen(false)}
          onToggle={toggleLanguage}
          onRemove={removeLanguage}
        />
      )}
      {provenancePanelOpen && (
        <div className="race-resistance-panel-backdrop">
          <div className="race-resistance-panel">
            <div className="race-resistance-panel-head">
              <div><h4>Provenances de la race</h4><p>Sélectionne les provenances accessibles à cette race.</p></div>
              <button className="admin-btn" onClick={() => setProvenancePanelOpen(false)}>✕ Fermer</button>
            </div>
            <div className="race-resistance-panel-body">
              <div className="race-resistance-picker race-aptitude-picker">
                <div className="race-resistance-group" style={{ '--aptitude-color': '#7ab8c8' }}>
                  <div className="race-resistance-group-title">Provenances</div>
                  <div className="race-resistance-chip-grid">
                    {asArray(customProvenances).length === 0 ? (
                      <div className="race-form-empty">Aucune provenance disponible. Crée-en dans la section Provenances.</div>
                    ) : asArray(customProvenances).map((provenance) => (
                      <button type="button" key={provenance.id} className={`race-resistance-chip race-aptitude-chip${linkedProvenanceIds.has(provenance.id) ? ' is-selected' : ''}`} style={{ '--aptitude-color': provenance.tagColor || '#7ab8c8' }} onClick={() => toggleRaceProvenance(provenance)}>
                        <span>{provenance.nom}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="race-resistance-summary">
                <div className="race-resistance-summary-title">Provenances sélectionnées <span>{linkedProvenanceIds.size}</span></div>
                {linkedProvenanceIds.size === 0 ? (
                  <div className="race-form-empty">Aucune provenance sélectionnée.</div>
                ) : asArray(customProvenances).filter((p) => linkedProvenanceIds.has(p.id)).map((provenance) => (
                  <div className="race-resistance-summary-row race-aptitude-summary-row" key={provenance.id}>
                    <div className="race-resistance-summary-name"><strong>{provenance.nom}</strong><span>Provenance</span></div>
                    <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => toggleRaceProvenance(provenance)}>Retirer</button>
                  </div>
                ))}
              </div>
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
                    <div className="race-form-section-title">Bonus de caractéristiques</div>
                    <p className="race-form-hint">Ces valeurs s'appliquent automatiquement dans la colonne RACIAUX de la fiche personnage.</p>
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
                    <div className="race-form-section-title">Ressources de base</div>
                    <p className="race-form-hint">Ces valeurs posent les ressources raciales de base. Les ascendances peuvent les additionner ou les remplacer.</p>
                    <div className="race-form-stats-grid race-form-stats-grid--resources">
                      {RACE_RESOURCE_KEYS.map((resource) => (
                        <div key={resource.key} className="race-form-stat">
                          <label>{resource.label}</label>
                          <input type="number" min={-50} max={100} value={form.baseResources?.[resource.key] || 0} onChange={(e) => setResource(resource.key, e.target.value)} />
                        </div>
                      ))}
                    </div>
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

export default function RacesPanel() {
  const {
    customRaceCategories, customRaces,
    hiddenRaceKeys: storedHiddenRaceKeys,
    addRaceCategory, addRace, updateRace, deleteRace, hideDefaultRace,
  } = useAdminStore();

  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingRace, setEditingRace] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const raceCategories = [
    ...asArray(customRaceCategories),
    { key: 'custom', nom: 'Races personnalisées', couleur: '#bcecff' },
    { key: 'base', nom: 'Races de base', couleur: '#c8a84a' },
  ];
  const hiddenRaceKeys = new Set(asArray(storedHiddenRaceKeys));
  const customRaceKeys = new Set(asArray(customRaces).map((r) => r.key || slugifyKey(r.nom)));
  const defaultRaces = RACE_DATA.map((r) => ({ ...r, key: slugifyKey(r.nom), isDefault: true }))
    .filter((r) => !hiddenRaceKeys.has(r.key) && !customRaceKeys.has(r.key));

  const handleSave = (form) => {
    if (editingRace?.custom) updateRace(editingRace.id, form);
    else if (editingRace) addRace({ ...form, key: editingRace.key || slugifyKey(editingRace.nom), custom: true });
    else addRace(form);
    setShowForm(false);
    setEditingRace(null);
  };

  const handleDelete = (race) => {
    setConfirmDelete({
      title: 'Supprimer la race',
      message: `Supprimer "${race.nom}" ?`,
      onConfirm: () => {
        if (race.custom) deleteRace(race.id);
        else hideDefaultRace(race.key || slugifyKey(race.nom));
      },
    });
  };

  const renderRaceCard = (race, entryIndex, category) => {
    const color = race.tagColor || race.couleur || (category.key === 'custom' ? '#bcecff' : '#c8a84a');
    const statsDisplay = race.bonusStats
      ? Object.entries(race.bonusStats).filter(([, v]) => v !== 0).map(([s, v]) => `${s} ${v > 0 ? '+' : ''}${v}`).join(' · ')
      : null;
    const resourceDisplay = RACE_RESOURCE_KEYS
      .map((res) => [res.label, Number(race.baseResources?.[res.key]) || 0])
      .filter(([, v]) => v !== 0)
      .map(([label, v]) => `${label} ${v > 0 ? '+' : ''}${v}`).join(' · ') || null;
    const resistances = asArray(race.resistanceBonuses)
      .map((r) => `${r.type === 'malus' ? 'Malus' : 'Bonus'} ${r.resistance || r.resistanceKey} ${r.value > 0 ? '+' : ''}${r.value}`)
      .join(' · ') || null;
    const languages = asArray(race.langues).map((l) => l.nom).join(' · ') || null;
    return (
      <div key={race.id || `${race.nom}-${entryIndex}`} className="entry-card" style={{ '--entry-color': color }}>
        <div className="entry-card-top">
          <div className="entry-card-badge">{race.nom.trim().charAt(0).toUpperCase()}</div>
          <div className="entry-card-body">
            <span className="entry-card-kicker">
              {race.custom ? 'Race personnalisée' : 'Race de base'} — Déplacement {race.deplacement ?? '-'}
            </span>
            <h3 className="entry-card-title">{race.nom}</h3>
          </div>
        </div>
        {(statsDisplay || race.bonusRaciaux || resourceDisplay) && (
          <div className="entry-card-meta">
            {(statsDisplay || race.bonusRaciaux) && <span>{statsDisplay || race.bonusRaciaux}</span>}
            {resourceDisplay && <span>{resourceDisplay}</span>}
          </div>
        )}
        {race.description && <div className="entry-card-desc">{race.description}</div>}
        {(race.competenceRaciale || resistances || languages) && (
          <div className="entry-card-detail">
            {race.competenceRaciale && <span>Compétence raciale : <b>{race.competenceRaciale}</b></span>}
            {resistances && <span>Résistances : <b>{resistances}</b></span>}
            {languages && <span>Langues : <b>{languages}</b></span>}
          </div>
        )}
        <div className="entry-card-actions">
          <button className="admin-btn" onClick={() => { setEditingRace(race); setShowForm(true); }}>Modifier</button>
          <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(race)}>Supprimer</button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={() => setShowCategoryForm(true)}>+ Catégorie</button>
        <button className="admin-btn admin-btn--add" onClick={() => { setEditingRace(null); setShowForm(true); }}>+ Nouvelle race</button>
      </div>

      {showCategoryForm && (
        <KnowledgeCategoryModal
          existingKeys={new Set(raceCategories.map((c) => c.key))}
          title="Nouvelle catégorie de race"
          onClose={() => setShowCategoryForm(false)}
          onSave={(payload) => { addRaceCategory(payload); setShowCategoryForm(false); }}
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
      {showForm && (
        <RaceForm
          initial={editingRace}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRace(null); }}
        />
      )}

      <div className="admin-panel-content">
        <CategoryAccordionList
          categories={raceCategories.filter((cat) => (
            cat.key === 'base'
            || customRaces.some((r) => (r.categoryKey || 'custom') === cat.key)
          ))}
          entriesForCategory={(category) => (
            category.key === 'base'
              ? [...defaultRaces, ...customRaces.filter((r) => r.categoryKey === 'base')]
              : customRaces.filter((r) => (r.categoryKey || 'custom') === category.key)
          )}
          renderContent={(category, categoryEntries) => (
            <div className="entry-card-grid entry-card-grid--wide">
              {categoryEntries.length > 0 ? categoryEntries.map((race, i) => renderRaceCard(race, i, category)) : (
                <div className="index-empty">Aucune race dans cette catégorie.</div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
