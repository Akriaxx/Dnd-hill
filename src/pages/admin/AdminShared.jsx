import { useEffect, useState } from 'react';
import { APT_CATEGORIES, APTITUDES } from '../../data/gameData';
import SmartDescEditor from '../../components/admin/SmartDescEditor';
import { useAdminStore } from '../../store/adminStore';
import { clamp, isHexColor, hexToHsv, hsvToHex, asArray, RESOURCE_DICE_KEYS, normalizeResourceDice, slugifyKey, includesText, BLANK_KNOWLEDGE_CATEGORY_FORM } from './adminUtils';
import { useGameplayEffectsPanel, useMatchedHeight } from './adminEffectsPanelHooks';

export function ConfirmModal({ title, message, dangerLabel = 'Supprimer', onCancel, onConfirm }) {
  return (
    <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="index-confirm-modal">
        <div className="index-modal-header">
          <h3>{title}</h3>
          <button className="admin-btn" onClick={onCancel}>✕ Fermer</button>
        </div>
        <div className="index-confirm-body">
          <p>{message}</p>
        </div>
        <div className="index-confirm-actions">
          <button className="admin-btn" onClick={onCancel}>Annuler</button>
          <button className="admin-btn admin-btn--danger" onClick={onConfirm}>{dangerLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function AdminFilterPanel({ search, onSearch, searchPlaceholder = 'Rechercher...', count, total, fields = [] }) {
  return (
    <div className="admin-filter-panel">
      <div className="admin-filter-search">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearch?.(event.target.value)}
          className="admin-search-input"
        />
        {typeof count === 'number' && typeof total === 'number' && (
          <span className="admin-search-count">{count} / {total}</span>
        )}
      </div>
      {fields.length > 0 && (
        <div className="admin-filter-fields">
          {fields.map((field) => (
            <label key={field.key} className="admin-filter-field">
              <span>{field.label}</span>
              <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionGrid({ children, small }) {
  return <div className={`admin-panel-grid${small ? ' admin-panel-grid--sm' : ''}`}>{children}</div>;
}

export function CategoryAccordionList({ categories, entriesForCategory, renderEntry, renderContent, emptyLabel = 'Aucune entrée dans cette catégorie.', small = false }) {
  const [openCategories, setOpenCategories] = useState(() => new Set(categories.map((c) => c.key)));

  useEffect(() => {
    setOpenCategories((current) => {
      const next = new Set(current);
      let changed = false;
      categories.forEach((c) => { if (!next.has(c.key)) { next.add(c.key); changed = true; } });
      return changed ? next : current;
    });
  }, [categories]);

  const toggle = (key) => setOpenCategories((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="index-category-list">
      {categories.map((category) => {
        const entries = entriesForCategory(category);
        const isOpen = openCategories.has(category.key);
        return (
          <section key={category.key} className={`index-category${isOpen ? ' is-open' : ''}`} style={{ '--index-category-color': category.couleur || '#bcecff' }}>
            <div className="index-category-head" onClick={() => toggle(category.key)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(category.key)}>
              <div className="index-category-title">
                <span className="index-category-chevron">{isOpen ? '▾' : '▸'}</span>
                <span className="index-card-color" />
                {category.nom || category.label}
                <span className="index-category-count">{entries.length}</span>
              </div>
              {category.actions}
            </div>
            <div className={`index-category-content${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
              {renderContent ? renderContent(category, entries) : (
                <SectionGrid small={small}>
                  {entries.map((entry, i) => renderEntry(entry, i, category))}
                  {entries.length === 0 && <div className="index-empty">{emptyLabel}</div>}
                </SectionGrid>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ResourceDiceFields({ value, onChange }) {
  return (
    <div className="race-form-stats-grid race-form-stats-grid--resources">
      {RESOURCE_DICE_KEYS.map(([key, label]) => (
        <div key={key} className="race-form-stat race-form-stat--dice">
          <label>{label}</label>
          <input
            value={value?.[key] || ''}
            onChange={(event) => {
              const next = normalizeResourceDice({ resourceDice: value });
              next[key] = event.target.value;
              onChange(next);
            }}
            placeholder="Ex: 1d8+2"
          />
        </div>
      ))}
    </div>
  );
}

export function RaceLockFields({ value = [], races = [], onChange }) {
  const selected = new Set(asArray(value));
  const toggle = (raceKey) => {
    const next = new Set(selected);
    if (next.has(raceKey)) next.delete(raceKey); else next.add(raceKey);
    onChange([...next]);
  };
  return (
    <div className="race-lock-panel">
      <div className="race-lock-head">
        <span>Races autorisées</span>
        <small>{selected.size === 0 ? 'Toutes les races' : `${selected.size} race(s)`}</small>
      </div>
      <div className="race-lock-grid">
        {races.map((race) => (
          <label key={race.key} className={`race-lock-choice${selected.has(race.key) ? ' active' : ''}`}>
            <input type="checkbox" checked={selected.has(race.key)} onChange={() => toggle(race.key)} />
            <span>{race.nom}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Sélecteur pour rattacher une entrée à ses sous-classes parentes (ex:
// une maîtrise, une catégorie d'état). Choisir une par une parmi des
// dizaines/centaines de sous-classes au clic serait trop lent — le vrai
// gain vient des actions groupées : "tout" par classe et "tout" sur les
// résultats filtrés. La liste reste visible en permanence pour qu'on
// voie d'un coup d'œil ce qui est déjà coché en parcourant/filtrant.
export function SubclassPicker({ subclasses, classes, selected, onToggle, onToggleMany, label = 'Sous-classe(s) parente(s)', hint = 'Laissez vide pour rendre disponible pour toutes les sous-classes.' }) {
  const [query, setQuery] = useState('');
  const selectedSet = new Set(selected);
  const keyOf = (item) => item.key || slugifyKey(item.nom);

  const filtered = query
    ? subclasses.filter((sc) => includesText(sc.nom, query) || includesText(sc.classe, query))
    : subclasses;
  const filteredKeys = filtered.map(keyOf);
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every((k) => selectedSet.has(k));

  const groups = classes
    .filter((cls) => filtered.some((sc) => sc.classe === keyOf(cls) || sc.classe === cls.nom))
    .map((cls) => {
      const items = filtered.filter((sc) => sc.classe === keyOf(cls) || sc.classe === cls.nom);
      const itemKeys = items.map(keyOf);
      return {
        key: keyOf(cls),
        nom: cls.nom,
        items,
        allSelected: itemKeys.length > 0 && itemKeys.every((k) => selectedSet.has(k)),
      };
    });

  return (
    <div className="race-lock-panel">
      <div className="race-lock-head">
        <span>{label}</span>
        <small>{selected.length === 0 ? 'Toutes les sous-classes' : `${selected.length} sélectionnée(s)`}</small>
      </div>
      <p className="race-form-hint">{hint}</p>

      <input
        className="subclass-picker-search"
        type="text"
        placeholder="Filtrer par nom de sous-classe ou de classe…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filteredKeys.length > 0 && (
        <button
          type="button"
          className="subclass-picker-bulk"
          onClick={() => onToggleMany(filteredKeys, !allFilteredSelected)}
        >
          {allFilteredSelected ? '✕ Tout retirer' : '✓ Tout ajouter'} ({filteredKeys.length} résultat{filteredKeys.length > 1 ? 's' : ''})
        </button>
      )}

      <div className="subclass-picker-list">
        {groups.length === 0 ? (
          <p className="subclass-picker-empty">Aucune sous-classe correspondante.</p>
        ) : groups.map((group) => (
          <div key={group.key} className="subclass-picker-group">
            <button
              type="button"
              className="subclass-picker-group-label"
              onClick={() => onToggleMany(group.items.map(keyOf), !group.allSelected)}
            >
              <span>{group.nom}</span>
              <em>{group.allSelected ? 'Tout retirer' : 'Tout ajouter'}</em>
            </button>
            <div className="subclass-picker-group-items">
              {group.items.map((sc) => {
                const scKey = keyOf(sc);
                const isSelected = selectedSet.has(scKey);
                return (
                  <button
                    type="button"
                    key={scKey}
                    className={`subclass-picker-option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => onToggle(scKey)}
                  >
                    {isSelected && <b>✓</b>}
                    <span>{sc.nom}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sélecteur plat pour rattacher une entrée à un ou plusieurs domaines de
// maîtrise (liste non hiérarchique, contrairement aux sous-classes).
export function MaitriseLockFields({ value = [], maitrises = [], onChange, label = 'Domaine(s) de maîtrise', hint = 'Laissez vide pour ne lier cet état à aucun domaine de maîtrise en particulier.' }) {
  const selected = new Set(asArray(value));
  const toggle = (maitriseKey) => {
    const next = new Set(selected);
    if (next.has(maitriseKey)) next.delete(maitriseKey); else next.add(maitriseKey);
    onChange([...next]);
  };
  return (
    <div className="race-lock-panel">
      <div className="race-lock-head">
        <span>{label}</span>
        <small>{selected.size === 0 ? 'Aucun domaine lié' : `${selected.size} domaine(s)`}</small>
      </div>
      <p className="race-form-hint">{hint}</p>
      <div className="race-lock-grid">
        {maitrises.map((maitrise) => (
          <label key={maitrise.key} className={`race-lock-choice${selected.has(maitrise.key) ? ' active' : ''}`} style={{ '--race-lock-color': maitrise.couleur || '#c8a84a' }}>
            <input type="checkbox" checked={selected.has(maitrise.key)} onChange={() => toggle(maitrise.key)} />
            <span>{maitrise.label || maitrise.nom}</span>
          </label>
        ))}
        {maitrises.length === 0 && <p className="subclass-picker-empty">Aucun domaine de maîtrise créé pour l'instant.</p>}
      </div>
    </div>
  );
}

// Sélecteur groupé pour autoriser une classe de personnage à utiliser
// certaines classes d'équipement (Lourde, Intermédiaire, Finesse…),
// groupées par catégorie racine équipable (Armure, Arme…) — `groups` est
// déjà pré-calculé (voir groupItemClassesByRoot dans itemUtils.js). Même
// logique de sélection en masse que SubclassPicker.
export function EquipClassLockFields({ groups = [], selected = [], onToggle, onToggleMany }) {
  const selectedSet = new Set(selected);

  return (
    <div className="race-lock-panel">
      <div className="race-lock-head">
        <span>Classes d'équipement autorisées</span>
        <small>{selected.length === 0 ? 'Toutes les classes' : `${selected.length} sélectionnée(s)`}</small>
      </div>
      <p className="race-form-hint">Laissez vide pour autoriser toutes les classes d'équipement (armures, armes…). Une fois une classe sélectionnée quelque part, tout objet de cette famille non coché devient interdit pour cette classe de personnage.</p>
      <div className="subclass-picker-list">
        {groups.length === 0 ? (
          <p className="subclass-picker-empty">Aucune classe d'équipement créée pour l'instant (Économie → Classe).</p>
        ) : groups.map((group) => {
          const itemIds = group.items.map((item) => item.id);
          const allSelected = itemIds.length > 0 && itemIds.every((id) => selectedSet.has(id));
          return (
            <div key={group.id} className="subclass-picker-group">
              <button type="button" className="subclass-picker-group-label" onClick={() => onToggleMany(itemIds, !allSelected)}>
                <span>{group.nom}</span>
                <em>{allSelected ? 'Tout retirer' : 'Tout ajouter'}</em>
              </button>
              <div className="subclass-picker-group-items">
                {group.items.map((item) => {
                  const isSelected = selectedSet.has(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`subclass-picker-option${isSelected ? ' is-selected' : ''}`}
                      onClick={() => onToggle(item.id)}
                    >
                      {isSelected && <b>✓</b>}
                      <span>{item.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GameplayEffectsToggle({ open, onToggle, label = 'Effets gameplay' }) {
  return (
    <button
      type="button"
      className={`admin-gameplay-toggle${open ? ' is-on' : ''}`}
      onClick={() => onToggle(!open)}
      aria-pressed={open}
    >
      <span>{label}</span>
      <span className="admin-gameplay-toggle-track">
        <span className="admin-gameplay-toggle-thumb" />
      </span>
    </button>
  );
}

export function EffectsPanel({ categories = [] }) {
  const [listingOpen, setListingOpen] = useState(false);
  return (
    <>
      <div className="admin-effects-panel-body">
        {listingOpen && (
          <div className="admin-effects-listing">
            {categories.map((category) => (
              <button key={category.key} type="button" className="admin-effects-listing-item" onClick={category.onOpen}>
                <span>{category.label}</span>
                {typeof category.count === 'number' && <b>{category.count}</b>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="admin-effects-panel-actions">
        <button type="button" className="admin-btn admin-btn--add" onClick={() => setListingOpen((v) => !v)}>
          {listingOpen ? '✕ Fermer' : '+ Ajouter un effet'}
        </button>
      </div>
    </>
  );
}

export function KnowledgeCategoryModal({ existingKeys, initial, title = 'Nouvelle catégorie', onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...BLANK_KNOWLEDGE_CATEGORY_FORM, ...(initial || {}) }));
  const [error, setError] = useState('');
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };
  const handleSave = () => {
    const nom = form.nom.trim();
    const key = form.key || slugifyKey(nom);
    if (!nom) { setError('Nom obligatoire.'); return; }
    if (key !== initial?.key && existingKeys?.has(key)) { setError('Cette catégorie existe déjà.'); return; }
    onSave({ ...form, nom, key });
  };
  return (
    <div className="index-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="index-modal">
        <div className="index-modal-header">
          <h3>{title}</h3>
          <button className="admin-btn" onClick={onClose}>✕ Fermer</button>
        </div>
        <div className="index-form">
          <div className="race-form-row">
            <div className="race-form-field race-form-field--grow">
              <label>Nom</label>
              <input value={form.nom} onChange={(event) => set('nom', event.target.value)} placeholder="Ex: Sciences militaires" />
            </div>
            <TagColorPicker value={form.couleur} onChange={(value) => set('couleur', value)} />
          </div>
          {error && <div className="player-field-error">{error}</div>}
          <div className="comp-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="admin-btn admin-btn--add" onClick={handleSave}>{initial ? 'Enregistrer' : 'Créer la catégorie'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminCard({ title, badge, badgeColor, meta, desc, custom, onEdit, onDelete, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`admin-card${open ? ' admin-card--open' : ''}${custom ? ' admin-card--custom' : ''}`}>
      <div className="admin-card-header">
        <div className="admin-card-title">
          {custom && <span className="admin-custom-badge">✦</span>}
          {title}
        </div>
        {badge && (
          <span className="admin-card-badge" style={badgeColor ? { background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '55' } : {}}>
            {badge}
          </span>
        )}
      </div>
      {meta && <div className="admin-card-meta">{meta}</div>}
      {desc && <p className={`admin-card-desc${open ? '' : ' admin-card-desc--clamped'}`}>{desc}</p>}
      {(desc || children) && (
        <button className="admin-card-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? '▲ Réduire' : '▼ Voir détails'}
        </button>
      )}
      {open && children && <div className="admin-card-detail">{children}</div>}
      <div className="admin-card-actions">
        <button className="admin-btn" onClick={onEdit} disabled={!onEdit}>Modifier</button>
        <button className="admin-btn admin-btn--danger" onClick={onDelete} disabled={!onDelete}>Supprimer</button>
      </div>
    </div>
  );
}

export function DetailLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="admin-detail-line">
      <span className="admin-detail-label">{label}</span>
      <span className="admin-detail-value">{value}</span>
    </div>
  );
}

export function IdentityRowCard({ title, type, meta, description, aptitudes, provenances, color = '#c8a84a', onEdit, onDelete }) {
  const aptitudeList = asArray(aptitudes);
  const provenanceList = asArray(provenances);

  return (
    <article className="ascendance-row-card identity-row-card" style={{ '--ascendance-color': color }}>
      <div className="ascendance-row-marker" />
      <div className="ascendance-row-main">
        <div className="ascendance-row-head">
          <div>
            <h3>{title}</h3>
            <span>{type}</span>
          </div>
        </div>
        {meta && <div className="ascendance-row-stats">{meta}</div>}
        {description && <p>{description}</p>}
        {(aptitudeList.length > 0 || provenanceList.length > 0) && (
          <div className="ascendance-row-details">
            {aptitudeList.length > 0 && (
              <span>
                Aptitudes : {aptitudeList.map((row) => {
                  const value = Number(row.value) || 0;
                  const signedValue = value ? ` ${value > 0 ? '+' : ''}${value}` : '';
                  return `${row.nom || row.key}${signedValue}`;
                }).join(' · ')}
              </span>
            )}
            {provenanceList.length > 0 && (
              <span>Provenances : {provenanceList.join(' · ')}</span>
            )}
          </div>
        )}
      </div>
      <div className="ascendance-row-actions">
        <button className="admin-btn" onClick={onEdit}>Modifier</button>
        <button className="admin-btn admin-btn--danger" onClick={onDelete}>Supprimer</button>
      </div>
    </article>
  );
}

export function IdentityEntryModal({ kindLabel, categories, initial, existingKeys, enableAptitudes = false, enableProvenances = false, provenanceOptions = [], onClose, onSave }) {
  const customAptitudeCategories = useAdminStore((state) => state.customAptitudeCategories);
  const customAptitudes_store = useAdminStore((state) => state.customAptitudes);
  const storedHiddenAptitudeKeys = useAdminStore((state) => state.hiddenAptitudeKeys);

  const aptitudeCategories = [
    ...APT_CATEGORIES.map((category) => ({
      key: category.key,
      nom: category.label,
      couleur: '#bcecff',
    })),
    ...asArray(customAptitudeCategories),
  ];
  const hiddenAptitudeKeys = new Set(asArray(storedHiddenAptitudeKeys));
  const customAptitudeKeys = new Set(asArray(customAptitudes_store).map((aptitude) => aptitude.key || slugifyKey(aptitude.nom)));
  const aptitudeOptions = [
    ...APTITUDES.map((aptitude) => ({
      ...aptitude,
      key: slugifyKey(aptitude.nom),
      categoryKey: aptitude.cat,
      couleur: aptitudeCategories.find((category) => category.key === aptitude.cat)?.couleur || '#bcecff',
    })).filter((aptitude) => !hiddenAptitudeKeys.has(aptitude.key) && !customAptitudeKeys.has(aptitude.key)),
    ...asArray(customAptitudes_store).map((aptitude) => ({
      ...aptitude,
      key: aptitude.key || slugifyKey(aptitude.nom),
      categoryKey: aptitude.categoryKey || aptitude.cat || 'general',
      couleur: aptitude.couleur || aptitude.tagColor || '#bcecff',
    })),
  ];
  const [form, setForm] = useState(() => ({
    nom: '',
    key: '',
    categoryKey: categories[0]?.key || 'base',
    tagColor: '#c8a84a',
    amelioration: '',
    description: '',
    aptitudes: [],
    ...(initial || {}),
    aptitudes: Array.isArray(initial?.aptitudes) ? initial.aptitudes : [],
  }));
  const [aptitudePanelOpen, setAptitudePanelOpen] = useState(false);
  const [provenancePanelOpen, setProvenancePanelOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedProvenanceKeys, setSelectedProvenanceKeys] = useState(
    () => Array.isArray(initial?.provenanceKeys) ? initial.provenanceKeys : []
  );
  const [effectsOpen, setEffectsOpen] = useState(() => (
    asArray(initial?.aptitudes).length > 0 || asArray(initial?.provenanceKeys).length > 0
  ));
  const { mounted: effectsMounted, shrink: effectsShrink, shifted: effectsShifted, visible: effectsVisible } = useGameplayEffectsPanel(effectsOpen);
  const [modalRef, modalHeight] = useMatchedHeight();
  const aptitudeByKey = new Map(aptitudeOptions.map((option) => [option.key || slugifyKey(option.nom), option]));
  const selectedAptitudeKeys = new Set(asArray(form.aptitudes).map((row) => row.key || slugifyKey(row.nom)));
  const toggleProvenance = (key) => setSelectedProvenanceKeys((current) =>
    current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
  );
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };
  const toggleAptitude = (aptitude) => setForm((current) => {
    const key = aptitude.key || slugifyKey(aptitude.nom);
    const exists = asArray(current.aptitudes).some((row) => (row.key || slugifyKey(row.nom)) === key);
    if (exists) {
      return { ...current, aptitudes: asArray(current.aptitudes).filter((row) => (row.key || slugifyKey(row.nom)) !== key) };
    }
    return {
      ...current,
      aptitudes: [
        ...asArray(current.aptitudes),
        {
          key,
          nom: aptitude.nom,
          categoryKey: aptitude.categoryKey || aptitude.cat || 'general',
          stat: aptitude.stat || '',
          value: 1,
        },
      ],
    };
  });
  const setAptitudeValue = (aptitudeKey, value) => setForm((current) => ({
    ...current,
    aptitudes: asArray(current.aptitudes).map((row) => (
      (row.key || slugifyKey(row.nom)) === aptitudeKey ? { ...row, value: Number(value) || 0 } : row
    )),
  }));
  const removeAptitude = (aptitudeKey) => setForm((current) => ({
    ...current,
    aptitudes: asArray(current.aptitudes).filter((row) => (row.key || slugifyKey(row.nom)) !== aptitudeKey),
  }));
  const save = () => {
    const nom = form.nom.trim();
    const key = form.key || slugifyKey(nom);
    if (!nom) {
      setError('Nom obligatoire.');
      return;
    }
    if (key !== initial?.key && existingKeys.has(key)) {
      setError('Cette entrée existe déjà.');
      return;
    }
    onSave({
      ...form,
      key,
      nom,
      amelioration: String(form.amelioration || '').trim(),
      description: String(form.description || '').trim(),
      provenanceKeys: selectedProvenanceKeys,
      aptitudes: asArray(form.aptitudes)
        .filter((row) => row.key || row.nom)
        .map((row) => {
          const aptitudeKey = row.key || slugifyKey(row.nom);
          const option = aptitudeByKey.get(aptitudeKey);
          return {
            key: aptitudeKey,
            nom: option?.nom || row.nom,
            categoryKey: option?.categoryKey || option?.cat || row.categoryKey || 'general',
            stat: option?.stat || row.stat || '',
            value: Number(row.value) || 0,
          };
        }),
    });
  };

  const effectCategories = [
    ...(enableAptitudes ? [{ key: 'aptitudes', label: 'Aptitudes', count: asArray(form.aptitudes).length, onOpen: () => setAptitudePanelOpen(true) }] : []),
    ...(enableProvenances ? [{ key: 'provenances', label: 'Provenances', count: selectedProvenanceKeys.length, onOpen: () => setProvenancePanelOpen(true) }] : []),
  ];

  return (
    <div className={`index-modal-backdrop${effectsShrink ? ' has-effects-panel' : ''}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="race-modal" ref={modalRef}>
        <div className="race-form">
          <div className="race-form-header">
            <h3>{initial ? `Modifier ${kindLabel}` : `Nouvelle ${kindLabel}`}</h3>
            <button className="admin-btn" onClick={onClose}>✕ Annuler</button>
          </div>
          <div className="race-form-body">
            <div className="race-form-section race-form-section--wide">
              <div className="race-form-section-title">Identité</div>
              <div className="race-form-row">
                <div className="race-form-field race-form-field--grow">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(event) => set('nom', event.target.value)} />
                </div>
                <div className="race-form-field race-form-field--grow">
                  <label>Catégorie</label>
                  <select value={form.categoryKey || categories[0]?.key || 'base'} onChange={(event) => set('categoryKey', event.target.value)}>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>{category.nom}</option>
                    ))}
                  </select>
                </div>
                <TagColorPicker value={form.tagColor || form.couleur || '#c8a84a'} onChange={(value) => set('tagColor', value)} />
              </div>
              <div className="race-form-field">
                <label>Amélioration</label>
                <SmartDescEditor value={form.amelioration || ''} onChange={(value) => set('amelioration', value)} />
              </div>
              <div className="race-form-field">
                <label>Description</label>
                <SmartDescEditor value={form.description || ''} onChange={(value) => set('description', value)} />
              </div>
              {error && <div className="player-field-error">{error}</div>}
            </div>
          </div>
          <div className="race-form-footer">
            <button className="admin-btn" onClick={onClose}>Annuler</button>
            <button className="race-form-save-btn" onClick={save}>
              {initial ? 'Enregistrer' : 'Créer'}
            </button>
            {(enableAptitudes || enableProvenances) && (
              <GameplayEffectsToggle open={effectsOpen} onToggle={setEffectsOpen} />
            )}
          </div>
          {enableProvenances && provenancePanelOpen && (
            <div className="race-resistance-panel-backdrop" onClick={(event) => event.target === event.currentTarget && setProvenancePanelOpen(false)}>
              <div className="race-resistance-panel">
                <div className="race-resistance-panel-head">
                  <div>
                    <h4>Provenances de {kindLabel}</h4>
                    <p>Sélectionne les provenances pour lesquelles cette {kindLabel} est disponible.</p>
                  </div>
                  <button className="admin-btn" onClick={() => setProvenancePanelOpen(false)}>✕ Fermer</button>
                </div>
                <div className="race-resistance-panel-body">
                  <div className="race-resistance-picker race-aptitude-picker">
                    <div className="race-resistance-group" style={{ '--aptitude-color': '#7ab8c8' }}>
                      <div className="race-resistance-group-title">Provenances</div>
                      <div className="race-resistance-chip-grid">
                        {provenanceOptions.length === 0 ? (
                          <div className="race-form-empty">Aucune provenance disponible.</div>
                        ) : provenanceOptions.map((provenance) => {
                          const selected = selectedProvenanceKeys.includes(provenance.key);
                          return (
                            <button
                              type="button"
                              key={provenance.key}
                              className={`race-resistance-chip race-aptitude-chip${selected ? ' is-selected' : ''}`}
                              style={{ '--aptitude-color': provenance.tagColor || '#7ab8c8' }}
                              onClick={() => toggleProvenance(provenance.key)}
                            >
                              <span>{provenance.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="race-resistance-summary">
                    <div className="race-resistance-summary-title">
                      Provenances sélectionnées
                      <span>{selectedProvenanceKeys.length}</span>
                    </div>
                    {selectedProvenanceKeys.length === 0 ? (
                      <div className="race-form-empty">Aucune provenance sélectionnée.</div>
                    ) : selectedProvenanceKeys.map((key) => {
                      const provenance = provenanceOptions.find((p) => p.key === key);
                      return (
                        <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                          <div className="race-resistance-summary-name">
                            <strong>{provenance?.nom || key}</strong>
                            <span>Provenance</span>
                          </div>
                          <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => toggleProvenance(key)}>Retirer</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {enableAptitudes && aptitudePanelOpen && (
            <div className="race-resistance-panel-backdrop" onClick={(event) => event.target === event.currentTarget && setAptitudePanelOpen(false)}>
              <div className="race-resistance-panel">
                <div className="race-resistance-panel-head">
                  <div>
                    <h4>Aptitudes de {kindLabel}</h4>
                    <p>Sélectionne les aptitudes, puis règle le bonus ou malus appliqué.</p>
                  </div>
                  <button className="admin-btn" onClick={() => setAptitudePanelOpen(false)}>✕ Fermer</button>
                </div>
                <div className="race-resistance-panel-body">
                  <div className="race-resistance-picker race-aptitude-picker">
                    {aptitudeCategories.map((category) => {
                      const categoryEntries = aptitudeOptions.filter((aptitude) => (aptitude.categoryKey || aptitude.cat) === category.key);
                      if (categoryEntries.length === 0) return null;
                      return (
                        <div className="race-resistance-group" key={category.key} style={{ '--aptitude-color': category.couleur || '#bcecff' }}>
                          <div className="race-resistance-group-title">{category.nom}</div>
                          <div className="race-resistance-chip-grid">
                            {categoryEntries.map((aptitude) => {
                              const key = aptitude.key || slugifyKey(aptitude.nom);
                              const selected = selectedAptitudeKeys.has(key);
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  className={`race-resistance-chip race-aptitude-chip${selected ? ' is-selected' : ''}`}
                                  style={{ '--aptitude-color': aptitude.couleur || category.couleur || '#bcecff' }}
                                  onClick={() => toggleAptitude(aptitude)}
                                >
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
                    <div className="race-resistance-summary-title">
                      Aptitudes sélectionnées
                      <span>{asArray(form.aptitudes).length}</span>
                    </div>
                    {asArray(form.aptitudes).length === 0 ? (
                      <div className="race-form-empty">Aucune aptitude sélectionnée.</div>
                    ) : asArray(form.aptitudes).map((row) => {
                      const key = row.key || slugifyKey(row.nom);
                      const aptitude = aptitudeByKey.get(key);
                      const category = aptitudeCategories.find((item) => item.key === (aptitude?.categoryKey || aptitude?.cat || row.categoryKey));
                      return (
                        <div className="race-resistance-summary-row race-aptitude-summary-row" key={key}>
                          <div className="race-resistance-summary-name">
                            <strong>{aptitude?.nom || row.nom || key}</strong>
                            <span>{category?.nom || 'Aptitude'}{(aptitude?.stat || row.stat) ? ` · ${aptitude?.stat || row.stat}` : ''}</span>
                          </div>
                          <input
                            className="race-resistance-value"
                            type="number"
                            min={-20}
                            max={20}
                            value={Number(row.value) || 0}
                            onChange={(event) => setAptitudeValue(key, event.target.value)}
                          />
                          <button className="admin-btn admin-btn--danger race-builder-remove" onClick={() => removeAptitude(key)}>Retirer</button>
                        </div>
                      );
                    })}
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
          <EffectsPanel categories={effectCategories} />
        </div>
      )}
    </div>
  );
}

// Bouton + modale de la procédure de vérification (code à 18 chiffres
// envoyé par email), partagés entre tous les panneaux qui gardent des
// actions sensibles derrière `verified` — voir useAdminVerification.
export function VerificationGate({ verification }) {
  const { verified, verifyOpen, verifyCode, verifyError, verifySending, setVerifyCode, setVerifyOpen, startVerification, submitVerification } = verification;
  return (
    <>
      <button className="admin-btn" onClick={startVerification}>
        {verified ? '✓ Vérifié' : 'Procédure de vérification'}
      </button>

      {verifyOpen && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setVerifyOpen(false)}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>Procédure de vérification</h3>
              <button className="admin-btn" onClick={() => setVerifyOpen(false)}>✕ Fermer</button>
            </div>
            <div className="index-form">
              {verifySending ? (
                <p className="verify-sending-msg">Envoi du code en cours…</p>
              ) : (
                <p className="verify-sending-msg">
                  Un code à 18 chiffres a été envoyé à l'adresse associée à votre compte. Saisissez-le ci-dessous.
                </p>
              )}
              <div className="comp-form-field">
                <label>Code de vérification</label>
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 18))}
                  placeholder="18 chiffres"
                  className="verify-code-input"
                  disabled={verifySending}
                />
                {verifyError && <span className="player-field-error">{verifyError}</span>}
              </div>
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={() => setVerifyOpen(false)}>Annuler</button>
              <button
                className="race-form-save-btn"
                onClick={submitVerification}
                disabled={verifyCode.length < 18 || verifySending}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TagColorPicker({ value = '#ffffff', onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value.toUpperCase());
  const color = isHexColor(value) ? value : '#ffffff';
  const hsv = hexToHsv(color);
  const hueHex = hsvToHex(hsv.h, 1, 1);

  useEffect(() => {
    setDraft(color.toUpperCase());
  }, [color]);

  const setFromArea = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    onChange(hsvToHex(hsv.h, x, 1 - y));
  };

  const handleAreaPointer = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setFromArea(event);
  };

  return (
    <div className="race-color-field">
      <label>Couleur du tag</label>
      <button
        type="button"
        className="race-color-chip"
        style={{ '--race-tag-color': color }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span />
        <b>{color.toUpperCase()}</b>
      </button>
      {open && (
        <div className="race-color-popover">
          <div
            className="race-color-plane"
            style={{ '--race-hue': hueHex }}
            onPointerDown={handleAreaPointer}
            onPointerMove={(event) => event.buttons === 1 && setFromArea(event)}
          >
            <span
              className="race-color-plane-cursor"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>
          <input
            className="race-color-hue"
            type="range"
            min="0"
            max="359"
            value={hsv.h}
            onChange={(event) => onChange(hsvToHex(Number(event.target.value), hsv.s, hsv.v))}
          />
          <div className="race-color-bottom">
            <input
              className="race-color-hex"
              value={draft}
              onChange={(event) => {
                const raw = event.target.value.toUpperCase();
                const next = raw.startsWith('#') ? raw : `#${raw}`;
                setDraft(next);
                if (isHexColor(next)) onChange(next);
              }}
              onBlur={() => !isHexColor(draft) && setDraft(color.toUpperCase())}
              maxLength={7}
            />
            <button type="button" className="admin-btn" onClick={() => setOpen(false)}>Valider</button>
          </div>
        </div>
      )}
    </div>
  );
}
