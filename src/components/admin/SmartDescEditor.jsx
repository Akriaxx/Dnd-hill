import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  APTITUDES,
  ASCENDANCE_DATA,
  CLASS_DATA,
  HISTORIQUE_DATA,
  KNOWLEDGE_DATA,
  MAITRISE_DATA,
  ORIGIN_DATA,
  RACE_DATA,
  SUBCLASS_DATA,
  WEAPON_DATA,
} from '../../data/gameData';
import { useAdminStore } from '../../store/adminStore';

const STAT_REFS = [
  { key: 'FOR', label: 'Force', description: 'Caractéristique principale liée à la puissance physique.' },
  { key: 'DEX', label: 'Dextérité', description: 'Caractéristique principale liée à l’adresse, la précision et la mobilité.' },
  { key: 'CON', label: 'Constitution', description: 'Caractéristique principale liée à la résistance du corps.' },
  { key: 'INT', label: 'Intelligence', description: 'Caractéristique principale liée à l’analyse, la mémoire et la technique.' },
  { key: 'SAG', label: 'Sagesse', description: 'Caractéristique principale liée à l’instinct, la perception et le recul.' },
  { key: 'CHA', label: 'Charisme', description: 'Caractéristique principale liée à la présence, l’influence et la maîtrise sociale.' },
  { key: 'Att.Phys', label: 'Att.Phys', description: 'Statistique de combat utilisée pour les attaques physiques.' },
  { key: 'Att.Mag', label: 'Att.Mag', description: 'Statistique de combat utilisée pour les attaques liées à la Maîtrise.' },
  { key: 'Att.Dist', label: 'Att.Dist', description: 'Statistique de combat utilisée pour les attaques à distance.' },
  { key: 'Initiative', label: 'Initiative', description: 'Détermine la capacité à agir tôt dans un tour ou une scène de combat.' },
  { key: 'Déplacement', label: 'Déplacement', description: 'Détermine la mobilité disponible pendant une action de mouvement.' },
  { key: 'Def.Physique', label: 'Def.Physique', description: 'Défense utilisée contre les menaces physiques.' },
  { key: 'Def.Magique', label: 'Def.Magique', description: 'Défense utilisée contre les menaces de Maîtrise.' },
  { key: 'Esquive', label: 'Esquive', description: 'Défense utilisée pour éviter une attaque ou un danger direct.' },
];

const MODE_REFS = [
  { key: 'actif', label: 'Actif', description: 'Compétence déclenchée volontairement par le personnage.' },
  { key: 'passif', label: 'Passif', description: 'Compétence toujours présente ou appliquée automatiquement.' },
  { key: 'classe', label: 'Classe', description: 'Source liée à la classe du personnage.' },
  { key: 'sous-classe', label: 'Sous-classe', description: 'Source liée à la spécialisation de classe du personnage.' },
  { key: 'race', label: 'Race', description: 'Source liée à la race du personnage.' },
];

const COST_REFS = [
  { key: 'mana', label: 'Mana', unit: 'Pts de Mana', description: 'Coût payé avec la réserve de Mana.' },
  { key: 'endurance', label: 'Endurance', unit: "Pts d'Endurance", description: "Coût payé avec la réserve d'Endurance." },
  { key: 'vie', label: 'Vie', unit: 'PV', description: 'Coût payé avec la vitalité du personnage.' },
  { key: 'action', label: 'Action', unit: 'Action', description: 'Coût payé avec une action.' },
  { key: 'action-simple', label: 'Action simple', unit: 'Action simple', description: 'Coût payé avec une action simple.' },
  { key: 'action-mouvement', label: 'Action de mouvement', unit: 'Action de mouvement', description: 'Coût payé avec une action de mouvement.' },
  { key: 'reaction', label: 'Réaction', unit: 'Réaction', description: 'Coût payé avec une réaction.' },
];

// Aucune référence d'index par défaut — uniquement celles créées depuis
// l'admin (Gestion du Donjon → Index).
const DEFAULT_INDEX_REFS = [];

const stripBrackets = (value = '') => String(value).replace(/^\s*\[\s*/, '').replace(/\s*\]\s*$/, '');

const normalizeKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const labelFromDescription = (text = '') => {
  const match = String(text).match(/\[\s*([^\]]+?)\s*\]/);
  return match ? match[1].trim() : null;
};

const compactDescription = (text = '', fallbackTitle = '') => {
  const source = String(text || '').trim();
  if (!source) return '';
  const escaped = fallbackTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source
    .replace(new RegExp(`^\\[\\s*${escaped}\\s*\\]\\s*[–-]\\s*`, 'i'), '')
    .replace(/^\[\s*[^\]]+?\s*\]\s*[–-]\s*/, '')
    .trim();
};

const optionFrom = (item, type, extras = {}) => ({
  key: item.nom,
  label: item.nom,
  title: item.nom,
  type,
  description: item.description,
  color: item.tagColor,
  ...extras,
});

const SMART_REGISTRIES = {
  race: RACE_DATA.map((item) => optionFrom(item, 'Race', {
    lines: [
      ['Compétence raciale', item.competenceRaciale],
      ['Déplacement', item.deplacement],
    ],
  })),
  ascendance: ASCENDANCE_DATA.map((item) => optionFrom(item, 'Ascendance', {
    lines: [['Compétence', item.competenceAscendance]],
  })),
  class: CLASS_DATA.map((item) => optionFrom(item, 'Classe', {
    lines: [['Type', item.type]],
  })),
  subclass: SUBCLASS_DATA.map((item) => optionFrom(item, 'Sous-classe', {
    lines: [['Classe', item.classe]],
  })),
  competence: [],
  index: DEFAULT_INDEX_REFS,
  origin: ORIGIN_DATA.map((item) => optionFrom(item, 'Origine', {
    lines: [['Bonus', item.amelioration]],
  })),
  historique: HISTORIQUE_DATA.map((item) => optionFrom(item, 'Historique', {
    lines: [['Bonus', item.amelioration]],
  })),
  maitrise: MAITRISE_DATA.map((item) => optionFrom(item, 'Maîtrise')),
  aptitude: APTITUDES.map((item) => ({
    key: item.nom,
    label: item.nom,
    title: item.nom,
    type: 'Aptitude',
    description: `Aptitude liée à ${item.stat}.`,
    lines: [
      ['Stat', item.stat],
      ['Catégorie', item.cat],
    ],
  })),
  stat: STAT_REFS.map((item) => ({
    key: item.key,
    label: item.label,
    title: item.label,
    type: 'Statistique',
    description: item.description,
  })),
  weapon: WEAPON_DATA.map((item) => optionFrom(item, 'Arme', {
    lines: [
      ['Type', item.type],
      ['Port', item.port],
      ['Coût', item.cout],
      ['Maîtrise', item.maitrise],
    ],
  })),
  mode: MODE_REFS.map((item) => ({
    key: item.key,
    label: item.label,
    title: item.label,
    type: 'Balise',
    description: item.description,
  })),
  cost: COST_REFS.map((item) => ({
    key: item.key,
    label: item.label,
    title: item.label,
    type: 'Coût',
    description: item.description,
    unit: item.unit,
  })),
};

const TYPE_ALIASES = {
  classe: 'class',
  class: 'class',
  classes: 'class',
  sousclasse: 'subclass',
  subclass: 'subclass',
  sousclasses: 'subclass',
  race: 'race',
  races: 'race',
  ascendance: 'ascendance',
  origine: 'origin',
  origin: 'origin',
  historique: 'historique',
  history: 'historique',
  maitrise: 'maitrise',
  maîtrise: 'maitrise',
  aptitude: 'aptitude',
  apt: 'aptitude',
  competence: 'competence',
  competences: 'competence',
  skill: 'competence',
  skills: 'competence',
  index: 'index',
  gameplay: 'index',
  regle: 'index',
  règle: 'index',
  rules: 'index',
  knowledge: 'knowledge',
  connaissances: 'knowledge',
  connaissance: 'knowledge',
  savoir: 'knowledge',
  savoirs: 'knowledge',
  langue: 'language',
  langues: 'language',
  language: 'language',
  languages: 'language',
  stat: 'stat',
  stats: 'stat',
  combat: 'stat',
  arme: 'weapon',
  weapon: 'weapon',
  equipement: 'weapon',
  mode: 'mode',
  type: 'mode',
  tag: 'mode',
  cout: 'cost',
  coût: 'cost',
  cost: 'cost',
  couts: 'cost',
  coûts: 'cost',
  provenance: 'provenance',
  provenances: 'provenance',
  carac: 'caracteristique',
  caracteristique: 'caracteristique',
  caracteristiques: 'caracteristique',
  resistance: 'resistance',
  resistances: 'resistance',
};

const TAG_STYLE = {
  class: '#d77ee8',
  subclass: '#9aa8ff',
  competence: '#d77ee8',
  index: '#bcecff',
  race: '#e7d8a8',
  ascendance: '#e2bf62',
  origin: '#cdb587',
  historique: '#cdb587',
  maitrise: '#ff9d45',
  aptitude: '#42f1e6',
  stat: '#ffdb55',
  weapon: '#bdbdbd',
  mode: '#f4f0e7',
  knowledge: '#c8a84a',
  language: '#bcecff',
  range: '#bcecff',
  element: '#ff9d45',
  cost: '#ff7676',
  provenance: '#7ab8c8',
  caracteristique: '#7ec8e3',
  resistance: '#e87e6b',
  unknown: '#c8a84a',
};

const safeArray = (value) => Array.isArray(value) ? value : [];

const parseTagValue = (raw = '') => {
  const parts = String(raw || '').trim().split(/\s+/).filter(Boolean);
  const keyParts = [];
  const params = {};

  parts.forEach((part) => {
    const match = part.match(/^([a-zA-Z0-9_-]+)=(.+)$/);
    if (match) {
      params[normalizeKey(match[1])] = match[2].replace(/^["']|["']$/g, '');
    } else {
      keyParts.push(part);
    }
  });

  return {
    key: keyParts.join(' ').trim(),
    params,
  };
};

const getParamValue = (params = {}) => params.v || params.value || params.valeur || '';

const formatConfiguredValue = (label, value, config = {}) => {
  if (!value) return label;
  const joiner = config.joiner ?? ' ';
  return config.position === 'after'
    ? `${label}${joiner}${value}`
    : `${value}${joiner}${label}`;
};

const getIndexReferenceList = (gameplayIndex = [], hiddenGameplayIndexKeys = []) => {
  const hiddenKeys = new Set(safeArray(hiddenGameplayIndexKeys).map((key) => normalizeKey(key)));
  const seenKeys = new Set();
  const seenLabels = new Set();
  const refs = [];

  const addRef = (entry, isDefault = false) => {
    const key = entry.key || entry.titre || entry.label || entry.title;
    const label = entry.titre || entry.label || entry.title || entry.key;
    if (!key || !label) return;

    const normalizedKey = normalizeKey(key);
    const normalizedLabel = normalizeKey(label);
    if (isDefault && hiddenKeys.has(normalizedKey)) return;
    if (seenKeys.has(normalizedKey) || seenLabels.has(normalizedLabel)) return;

    seenKeys.add(normalizedKey);
    seenLabels.add(normalizedLabel);
    refs.push({
      key,
      label,
      title: entry.titre || entry.title || label,
      type: 'Index',
      description: entry.description,
      color: entry.couleur || entry.color,
      valueConfig: entry.valueConfig,
    });
  };

  safeArray(gameplayIndex).forEach((entry) => addRef(entry));
  DEFAULT_INDEX_REFS.forEach((entry) => addRef(entry, true));
  return refs;
};

const getKnowledgeReferenceList = (customKnowledge = []) => {
  const seenKeys = new Set();
  const addRef = (entry) => {
    const key = entry.key || entry.nom || entry.label || entry.title;
    const label = entry.nom || entry.label || entry.title || entry.key;
    if (!key || !label) return null;
    const normalizedKey = normalizeKey(key);
    if (seenKeys.has(normalizedKey)) return null;
    seenKeys.add(normalizedKey);
    return {
      key,
      label,
      title: label,
      type: 'Connaissance',
      description: entry.description || '',
      color: entry.couleur || entry.color || TAG_STYLE.knowledge,
      lines: entry.categoryName ? [['Catégorie', entry.categoryName]] : [],
    };
  };

  return [
    ...safeArray(customKnowledge).map(addRef).filter(Boolean),
    ...KNOWLEDGE_DATA.map((knowledge) => addRef({
      key: normalizeKey(knowledge),
      nom: stripBrackets(knowledge),
      description: '',
      couleur: TAG_STYLE.knowledge,
    })).filter(Boolean),
  ];
};

const getLanguageReferenceList = (customLanguages = []) => {
  const seenKeys = new Set();
  return safeArray(customLanguages).map((entry) => {
    const key = entry.key || entry.nom || entry.label || entry.title;
    const label = entry.nom || entry.label || entry.title || entry.key;
    if (!key || !label) return null;
    const normalizedKey = normalizeKey(key);
    if (seenKeys.has(normalizedKey)) return null;
    seenKeys.add(normalizedKey);
    return {
      key,
      label,
      title: label,
      type: 'Langue',
      description: entry.description || '',
      color: entry.couleur || entry.color || TAG_STYLE.language,
      lines: entry.categoryName ? [['Catégorie', entry.categoryName]] : [],
    };
  }).filter(Boolean);
};

const getOriginReferenceList = (customOrigins = []) => {
  const seenKeys = new Set();
  return [
    ...safeArray(customOrigins).map((item) => {
      const key = item.key || item.nom;
      const label = item.nom;
      if (!key || !label) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label, title: label, type: 'Origine', description: item.description || '', color: item.tagColor || item.couleur || TAG_STYLE.origin, lines: item.amelioration ? [['Bonus', item.amelioration]] : [] };
    }).filter(Boolean),
    ...ORIGIN_DATA.map((item) => {
      const key = item.nom;
      if (!key) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label: key, title: key, type: 'Origine', description: item.description || '', color: TAG_STYLE.origin, lines: item.amelioration ? [['Bonus', item.amelioration]] : [] };
    }).filter(Boolean),
  ];
};

const getAscendanceReferenceList = (customAscendances = []) => {
  const seenKeys = new Set();
  return [
    ...safeArray(customAscendances).map((item) => {
      const key = item.nom;
      const label = item.nom;
      if (!key || !label) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label, title: label, type: 'Ascendance', description: item.description || '', color: item.tagColor || item.couleur || TAG_STYLE.ascendance, lines: item.competenceAscendance ? [['Compétence', item.competenceAscendance]] : [] };
    }).filter(Boolean),
    ...ASCENDANCE_DATA.map((item) => {
      const key = item.nom;
      if (!key) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label: key, title: key, type: 'Ascendance', description: item.description || '', color: item.tagColor || TAG_STYLE.ascendance, lines: item.competenceAscendance ? [['Compétence', item.competenceAscendance]] : [] };
    }).filter(Boolean),
  ];
};

const getProvenanceReferenceList = (customProvenances = []) => {
  const seenKeys = new Set();
  return safeArray(customProvenances).map((item) => {
    const key = item.key || item.nom;
    const label = item.nom;
    if (!key || !label) return null;
    const nk = normalizeKey(key);
    if (seenKeys.has(nk)) return null;
    seenKeys.add(nk);
    return { key, label, title: label, type: 'Provenance', description: item.description || '', color: item.tagColor || item.couleur || TAG_STYLE.provenance };
  }).filter(Boolean);
};

const getHistoriqueReferenceList = (customHistoriques = []) => {
  const seenKeys = new Set();
  return [
    ...safeArray(customHistoriques).map((item) => {
      const key = item.key || item.nom;
      const label = item.nom;
      if (!key || !label) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label, title: label, type: 'Historique', description: item.description || '', color: item.tagColor || item.couleur || TAG_STYLE.historique, lines: item.amelioration ? [['Bonus', item.amelioration]] : [] };
    }).filter(Boolean),
    ...HISTORIQUE_DATA.map((item) => {
      const key = item.nom;
      if (!key) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label: key, title: key, type: 'Historique', description: item.description || '', color: TAG_STYLE.historique, lines: item.amelioration ? [['Bonus', item.amelioration]] : [] };
    }).filter(Boolean),
  ];
};

const getCaracteritiqueReferenceList = (customCaracteristiques = []) => {
  const seenKeys = new Set();
  return safeArray(customCaracteristiques)
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
    .map((carac) => {
      const key = carac.cle;
      const label = carac.nom || carac.cle;
      if (!key || !label) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label, title: label, type: 'Caractéristique', description: carac.description || '', color: TAG_STYLE.caracteristique };
    }).filter(Boolean);
};

const getResistanceReferenceList = (customResistanceEntries = []) => {
  const seenKeys = new Set();
  return safeArray(customResistanceEntries).map((item) => {
    const key = item.key || item.label;
    const label = item.label;
    if (!key || !label) return null;
    const nk = normalizeKey(key);
    if (seenKeys.has(nk)) return null;
    seenKeys.add(nk);
    return { key, label, title: label, type: 'Résistance', description: item.description || '', color: item.couleur || TAG_STYLE.resistance };
  }).filter(Boolean);
};

const getMaitriseReferenceList = (customMaitriseEntries = []) => {
  const seenKeys = new Set();
  return [
    ...safeArray(customMaitriseEntries).map((item) => {
      const key = item.key || item.label;
      const label = item.label;
      if (!key || !label) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return { key, label, title: label, type: 'Maîtrise', description: item.description || '', color: item.couleur || TAG_STYLE.maitrise };
    }).filter(Boolean),
    ...MAITRISE_DATA.map((item) => {
      const key = item.nom;
      if (!key) return null;
      const nk = normalizeKey(key);
      if (seenKeys.has(nk)) return null;
      seenKeys.add(nk);
      return optionFrom(item, 'Maîtrise');
    }).filter(Boolean),
  ];
};

const buildTagTypes = (
  customRaces = [], customCompetences = [], customClasses = [], customSubclasses = [],
  gameplayIndex = [], hiddenGameplayIndexKeys = [], customKnowledge = [], customAptitudes = [],
  customLanguages = [], customOrigins = [], customAscendances = [], customProvenances = [],
  customHistoriques = [], customCaracteristiques = [], customResistanceEntries = [], customMaitriseEntries = [],
) => [
  // ── Références & Savoirs ─────────────────────────────────────
  {
    key: 'knowledge',
    label: 'Connaissance',
    color: TAG_STYLE.knowledge,
    icon: '☷',
    options: getKnowledgeReferenceList(customKnowledge).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'aptitude',
    label: 'Aptitude',
    color: TAG_STYLE.aptitude,
    icon: '◆',
    options: [
      ...APTITUDES.map((a) => ({ key: a.nom, label: `${a.nom} (${a.stat})` })),
      ...safeArray(customAptitudes).map((a) => ({ key: a.nom, label: `${a.nom} (${a.stat || 'custom'})` })),
    ],
  },
  {
    key: 'language',
    label: 'Langue',
    color: TAG_STYLE.language,
    icon: '◫',
    options: getLanguageReferenceList(customLanguages).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  // ── Origines & Identités ─────────────────────────────────────
  {
    key: 'origin',
    label: 'Origine',
    color: TAG_STYLE.origin,
    icon: '⊙',
    options: getOriginReferenceList(customOrigins).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'historique',
    label: 'Historique',
    color: TAG_STYLE.historique,
    icon: '⊕',
    options: getHistoriqueReferenceList(customHistoriques).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'provenance',
    label: 'Provenance',
    color: TAG_STYLE.provenance,
    icon: '◉',
    options: getProvenanceReferenceList(customProvenances).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'race',
    label: 'Race',
    color: TAG_STYLE.race,
    icon: '◇',
    options: [
      ...RACE_DATA.map((r) => ({ key: r.nom, label: r.nom })),
      ...safeArray(customRaces).map((r) => ({ key: r.nom, label: r.nom })),
    ],
  },
  {
    key: 'ascendance',
    label: 'Ascendance',
    color: TAG_STYLE.ascendance,
    icon: '◈',
    options: getAscendanceReferenceList(customAscendances).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  // ── Gameplay ─────────────────────────────────────────────────
  {
    key: 'caracteristique',
    label: 'Caractéristique',
    color: TAG_STYLE.caracteristique,
    icon: '⊞',
    options: getCaracteritiqueReferenceList(customCaracteristiques).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'index',
    label: 'Index',
    color: TAG_STYLE.index,
    icon: '☰',
    options: getIndexReferenceList(gameplayIndex, hiddenGameplayIndexKeys).map((entry) => ({
      key: entry.key,
      label: entry.label,
      needsValue: Boolean(entry.valueConfig?.enabled),
    })),
  },
  {
    key: 'class',
    label: 'Classe',
    color: TAG_STYLE.class,
    icon: '⚔',
    options: [
      ...CLASS_DATA.map((c) => ({ key: c.nom, label: c.nom })),
      ...safeArray(customClasses).map((c) => ({ key: c.nom, label: c.nom })),
    ],
  },
  {
    key: 'subclass',
    label: 'Sous-classe',
    color: TAG_STYLE.subclass,
    icon: '✦',
    options: [
      ...SUBCLASS_DATA.map((s) => ({ key: s.nom, label: `${s.nom} (${s.classe})` })),
      ...safeArray(customSubclasses).map((s) => ({ key: s.nom, label: `${s.nom} (${s.classe || ''})` })),
    ],
  },
  {
    key: 'competence',
    label: 'Compétence',
    color: TAG_STYLE.competence,
    icon: '✧',
    options: safeArray(customCompetences).map((c) => ({ key: c.nom, label: c.nom })),
  },
  {
    key: 'resistance',
    label: 'Résistance',
    color: TAG_STYLE.resistance,
    icon: '⊗',
    options: getResistanceReferenceList(customResistanceEntries).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  {
    key: 'maitrise',
    label: 'Maîtrise',
    color: TAG_STYLE.maitrise,
    icon: '⊛',
    options: getMaitriseReferenceList(customMaitriseEntries).map((entry) => ({ key: entry.key, label: entry.label })),
  },
  // ── Économie & Équipement ────────────────────────────────────
  {
    key: 'weapon',
    label: 'Arme',
    color: TAG_STYLE.weapon,
    icon: '⚒',
    options: WEAPON_DATA.map((item) => ({ key: item.nom, label: item.nom })),
  },
];

const TAG_TYPES = buildTagTypes();
const TAG_COLOR_MAP = Object.fromEntries(TAG_TYPES.map((t) => [t.key, t.color]));

const TAG_NAV_GROUPS = [
  { key: 'references', label: 'Références & Savoirs', icon: '☷', color: TAG_STYLE.knowledge, types: ['knowledge', 'aptitude', 'language'] },
  { key: 'identites', label: 'Origines & Identités', icon: '◈', color: TAG_STYLE.origin, types: ['origin', 'historique', 'provenance', 'race', 'ascendance'] },
  { key: 'gameplay', label: 'Gameplay', icon: '⚔', color: TAG_STYLE.index, types: ['caracteristique', 'index', 'class', 'subclass', 'competence', 'resistance', 'maitrise'] },
  { key: 'items', label: 'Équipement', icon: '⚒', color: TAG_STYLE.weapon, types: ['weapon'] },
];

function findReference(typeKey, key) {
  const normalizedType = TYPE_ALIASES[normalizeKey(typeKey)] || normalizeKey(typeKey);
  const { key: cleanKey, params } = parseTagValue(key);
  const normalizedKey = normalizeKey(cleanKey);
  const customRaces = safeArray(useAdminStore.getState?.().customRaces);
  const customCompetences = safeArray(useAdminStore.getState?.().customCompetences);
  const customClasses = safeArray(useAdminStore.getState?.().customClasses);
  const customSubclasses = safeArray(useAdminStore.getState?.().customSubclasses);
  const customAptitudes = safeArray(useAdminStore.getState?.().customAptitudes);
  const customLanguages = safeArray(useAdminStore.getState?.().customLanguages);
  const gameplayIndex = safeArray(useAdminStore.getState?.().gameplayIndex);
  const hiddenGameplayIndexKeys = safeArray(useAdminStore.getState?.().hiddenGameplayIndexKeys);
  const customKnowledge = safeArray(useAdminStore.getState?.().customKnowledge);
  const customOrigins = safeArray(useAdminStore.getState?.().customOrigins);
  const customAscendances = safeArray(useAdminStore.getState?.().customAscendances);
  const customProvenances = safeArray(useAdminStore.getState?.().customProvenances);
  const customHistoriques = safeArray(useAdminStore.getState?.().customHistoriques);
  const customCaracteristiques = safeArray(useAdminStore.getState?.().customCaracteristiques);
  const customResistanceEntries = safeArray(useAdminStore.getState?.().customResistanceEntries);
  const customMaitriseEntries = safeArray(useAdminStore.getState?.().customMaitriseEntries);
  const indexRefs = getIndexReferenceList(gameplayIndex, hiddenGameplayIndexKeys);
  const knowledgeRefs = getKnowledgeReferenceList(customKnowledge);
  const languageRefs = getLanguageReferenceList(customLanguages);
  const runtimeRegistries = {
    ...SMART_REGISTRIES,
    class: [
      ...customClasses.map((item) => optionFrom(item, 'Classe', {
        lines: [['Type', item.type]],
      })),
      ...SMART_REGISTRIES.class,
    ],
    subclass: [
      ...customSubclasses.map((item) => optionFrom(item, 'Sous-classe', {
        lines: [['Classe', item.classe]],
      })),
      ...SMART_REGISTRIES.subclass,
    ],
    race: [
      ...customRaces.map((item) => optionFrom(item, 'Race', {
        lines: [
          ['Compétence raciale', item.competenceRaciale],
          ['Déplacement', item.deplacement],
        ],
      })),
      ...SMART_REGISTRIES.race,
    ],
    competence: customCompetences.map((item) => optionFrom(item, 'Compétence', {
      lines: [
        ['Mode', item.type],
        ['Classe', item.classe],
        ['Sous-classe', item.sousClasse],
      ],
    })),
    aptitude: [
      ...customAptitudes.map((item) => ({
        key: item.nom,
        label: item.nom,
        title: item.nom,
        type: 'Aptitude',
        description: item.description || '',
        color: item.couleur || item.tagColor || TAG_STYLE.aptitude,
        lines: [
          ['Stat', item.stat],
          ['Catégorie', item.categoryKey || item.cat],
        ],
      })),
      ...SMART_REGISTRIES.aptitude,
    ],
    index: indexRefs,
    knowledge: knowledgeRefs,
    language: languageRefs,
    origin: [
      ...customOrigins.map((item) => ({
        key: item.key || item.nom,
        label: item.nom,
        title: item.nom,
        type: 'Origine',
        description: item.description || '',
        color: item.tagColor || item.couleur || TAG_STYLE.origin,
        lines: item.amelioration ? [['Bonus', item.amelioration]] : [],
      })),
      ...SMART_REGISTRIES.origin,
    ],
    ascendance: [
      ...customAscendances.map((item) => ({
        key: item.nom,
        label: item.nom,
        title: item.nom,
        type: 'Ascendance',
        description: item.description || '',
        color: item.tagColor || item.couleur || TAG_STYLE.ascendance,
        lines: item.competenceAscendance ? [['Compétence', item.competenceAscendance]] : [],
      })),
      ...SMART_REGISTRIES.ascendance,
    ],
    historique: [
      ...customHistoriques.map((item) => ({
        key: item.key || item.nom,
        label: item.nom,
        title: item.nom,
        type: 'Historique',
        description: item.description || '',
        color: item.tagColor || item.couleur || TAG_STYLE.historique,
        lines: item.amelioration ? [['Bonus', item.amelioration]] : [],
      })),
      ...SMART_REGISTRIES.historique,
    ],
    provenance: customProvenances.map((item) => ({
      key: item.key || item.nom,
      label: item.nom,
      title: item.nom,
      type: 'Provenance',
      description: item.description || '',
      color: item.tagColor || item.couleur || TAG_STYLE.provenance,
    })),
    caracteristique: customCaracteristiques
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      .map((carac) => ({
        key: carac.cle,
        label: carac.nom || carac.cle,
        title: carac.nom || carac.cle,
        type: 'Caractéristique',
        description: carac.description || '',
        color: TAG_STYLE.caracteristique,
      })),
    resistance: customResistanceEntries.map((item) => ({
      key: item.key || item.label,
      label: item.label,
      title: item.label,
      type: 'Résistance',
      description: item.description || '',
      color: item.couleur || TAG_STYLE.resistance,
    })),
    maitrise: [
      ...customMaitriseEntries.map((item) => ({
        key: item.key || item.label,
        label: item.label,
        title: item.label,
        type: 'Maîtrise',
        description: item.description || '',
        color: item.couleur || TAG_STYLE.maitrise,
      })),
      ...SMART_REGISTRIES.maitrise,
    ],
  };
  const registries = runtimeRegistries[normalizedType]
    ? [[normalizedType, runtimeRegistries[normalizedType]]]
    : Object.entries(runtimeRegistries);

  for (const [registryKey, list] of registries) {
    const found = list.find((item) =>
      normalizeKey(item.key) === normalizedKey ||
      normalizeKey(item.label) === normalizedKey ||
      normalizeKey(labelFromDescription(item.description)) === normalizedKey
    );
    if (found) {
      if (registryKey === 'cost') {
        const value = getParamValue(params);
        const unit = found.unit || found.label;
        return {
          ...found,
          params,
          value,
          label: value ? `${value} ${unit}` : found.label,
          title: value ? `${found.title} : ${value} ${unit}` : found.title,
          lines: [
            ['Ressource', found.label],
            value ? ['Valeur', `${value} ${unit}`] : null,
          ].filter(Boolean),
          tagType: registryKey,
          color: found.color || TAG_STYLE[registryKey] || TAG_STYLE.unknown,
        };
      }
      if (registryKey === 'index' && found.valueConfig?.enabled) {
        const value = getParamValue(params);
        const label = formatConfiguredValue(found.label, value, found.valueConfig);
        return {
          ...found,
          params,
          value,
          label,
          title: found.title,
          lines: [
            value ? ['Valeur', label] : ['Valeur', 'Libre'],
          ],
          tagType: registryKey,
          color: found.color || TAG_STYLE[registryKey] || TAG_STYLE.unknown,
        };
      }
      return { ...found, params, tagType: registryKey, color: found.color || TAG_STYLE[registryKey] || TAG_STYLE.unknown };
    }
  }

  return {
    key: cleanKey || key,
    label: cleanKey || key,
    title: cleanKey || key,
    type: normalizedType || 'Référence',
    description: `Aucune donnée liée trouvée pour “${cleanKey || key}”.`,
    params,
    tagType: normalizedType || 'unknown',
    color: TAG_STYLE[normalizedType] || TAG_STYLE.unknown,
  };
}

export function resolveSmartReference(rawTag) {
  const clean = String(rawTag || '').trim();
  const dotIndex = clean.indexOf('.');
  const hasType = dotIndex > 0;
  const type = hasType ? clean.slice(0, dotIndex) : '';
  const key = hasType ? clean.slice(dotIndex + 1) : clean;
  return findReference(type, key);
}

export function parseSmartText(text) {
  const source = String(text || '');
  const tokens = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    tokens.push({ type: 'tag', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) tokens.push({ type: 'text', value: source.slice(lastIndex) });
  return tokens;
}

function FormattedText({ text }) {
  const source = String(text || '');
  const parts = [];
  let index = 0;

  while (index < source.length) {
    const markers = [
      { token: '**', type: 'bold' },
      { token: '__', type: 'underline' },
      { token: '*', type: 'italic' },
    ];
    const next = markers
      .map((marker) => ({ ...marker, start: source.indexOf(marker.token, index) }))
      .filter((marker) => marker.start !== -1)
      .sort((a, b) => a.start - b.start || b.token.length - a.token.length)[0];

    if (!next) {
      parts.push({ type: 'text', value: source.slice(index) });
      break;
    }

    if (next.start > index) {
      parts.push({ type: 'text', value: source.slice(index, next.start) });
    }

    const contentStart = next.start + next.token.length;
    const end = source.indexOf(next.token, contentStart);
    if (end === -1) {
      parts.push({ type: 'text', value: source.slice(next.start) });
      break;
    }

    parts.push({ type: next.type, value: source.slice(contentStart, end) });
    index = end + next.token.length;
  }

  return (
    <>
      {parts.map((part, partIndex) => {
        if (part.type === 'bold') return <strong key={partIndex}>{part.value}</strong>;
        if (part.type === 'italic') return <em key={partIndex}>{part.value}</em>;
        if (part.type === 'underline') return <u key={partIndex}>{part.value}</u>;
        return <span key={partIndex}>{part.value}</span>;
      })}
    </>
  );
}

// ── Rendu d'un texte taggé ────────────────────────────────────
export function renderSmartText(text) {
  if (!text) return '';
  return text.replace(/\{([\w-]+)\.([^}]+)\}/g, (match) => {
    const ref = resolveSmartReference(match);
    const color = ref.color || TAG_COLOR_MAP[ref.tagType] || '#c8a84a';
    return `<span class="smart-tag smart-tag--${ref.tagType}" style="color:${color};border-color:${color}44;background:${color}18">${ref.label}</span>`;
  });
}

function SmartTag({ raw, index, plain = false }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const buttonRef = useRef(null);
  const ref = resolveSmartReference(raw);
  const description = compactDescription(ref.description, ref.title);
  const allLines = (ref.lines || []).filter(([, value]) => value !== undefined && value !== null && value !== '');
  const typeLine = allLines.find(([label]) => normalizeKey(label) === 'type');
  const lines = allLines.filter(([label]) => normalizeKey(label) !== 'type');
  const popoverId = `smart-tip-${index}`;

  const placePopover = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(390, window.innerWidth - margin * 2);
    const expectedHeight = 260;
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - width - margin)
    );
    const belowTop = rect.bottom + 8;
    const top = belowTop + expectedHeight > window.innerHeight - margin
      ? Math.max(margin, rect.top - expectedHeight - 8)
      : belowTop;

    setPopoverStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      '--smart-tag-color': ref.color,
    });
  }, [ref.color]);

  const togglePopover = useCallback((event) => {
    event.stopPropagation();
    if (!open) placePopover();
    setOpen((value) => !value);
  }, [open, placePopover]);

  const popover = open && popoverStyle ? createPortal(
    <span
      className="smart-popover"
      id={popoverId}
      role="dialog"
      style={popoverStyle}
    >
      <span className="smart-popover-head">
        <span className="smart-popover-kicker">{ref.type}</span>
        <strong className="smart-popover-title">{ref.title}</strong>
      </span>
      {typeLine && (
        <span className="smart-popover-type">
          <span>{typeLine[0]}</span>
          <b>{String(typeLine[1])}</b>
        </span>
      )}
      {typeLine && description && <span className="smart-popover-separator" />}
      {description && (
        <span className="smart-popover-desc">
          <SmartText text={description} />
        </span>
      )}
      {lines.length > 0 && (
        <span className="smart-popover-lines">
          {lines.map(([label, value]) => (
            <span className="smart-popover-line" key={`${label}-${String(value).slice(0, 24)}`}>
              <span>{label}</span>
              <b>{String(value).replace(/^\[\s*|\s*\]$/g, '')}</b>
            </span>
          ))}
        </span>
      )}
    </span>,
    document.body
  ) : null;

  return (
    <span className="smart-tag-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`smart-tag smart-tag--${ref.tagType}${plain ? ' smart-tag--plain' : ''}`}
        style={{ '--smart-tag-color': ref.color }}
        onClick={togglePopover}
        aria-expanded={open}
        aria-controls={popoverId}
      >
        {plain ? ref.label : `[ ${ref.label} ]`}
      </button>
      {popover}
    </span>
  );
}

export function SmartText({ text, className = '', plainTags = false }) {
  const tokens = parseSmartText(text);
  return (
    <span className={`smart-text ${className}`}>
      {tokens.map((token, index) => (
        token.type === 'tag'
          ? <SmartTag key={`${token.value}-${index}`} raw={token.value} index={index} plain={plainTags} />
          : <FormattedText key={`text-${index}`} text={token.value} />
      ))}
    </span>
  );
}

// ── Composant éditeur ─────────────────────────────────────────
export default function SmartDescEditor({ value = '', onChange, placeholder }) {
  const textareaRef = useRef(null);
  const rawCustomRaces = useAdminStore((s) => s.customRaces);
  const rawCustomCompetences = useAdminStore((s) => s.customCompetences);
  const rawCustomClasses = useAdminStore((s) => s.customClasses);
  const rawCustomSubclasses = useAdminStore((s) => s.customSubclasses);
  const rawCustomAptitudes = useAdminStore((s) => s.customAptitudes);
  const rawCustomLanguages = useAdminStore((s) => s.customLanguages);
  const rawGameplayIndex = useAdminStore((s) => s.gameplayIndex);
  const rawHiddenGameplayIndexKeys = useAdminStore((s) => s.hiddenGameplayIndexKeys);
  const rawCustomKnowledge = useAdminStore((s) => s.customKnowledge);
  const rawCustomOrigins = useAdminStore((s) => s.customOrigins);
  const rawCustomAscendances = useAdminStore((s) => s.customAscendances);
  const rawCustomProvenances = useAdminStore((s) => s.customProvenances);
  const rawCustomHistoriques = useAdminStore((s) => s.customHistoriques);
  const rawCustomCaracteristiques = useAdminStore((s) => s.customCaracteristiques);
  const rawCustomResistanceEntries = useAdminStore((s) => s.customResistanceEntries);
  const rawCustomMaitriseEntries = useAdminStore((s) => s.customMaitriseEntries);
  const customRaces = safeArray(rawCustomRaces);
  const customCompetences = safeArray(rawCustomCompetences);
  const customClasses = safeArray(rawCustomClasses);
  const customSubclasses = safeArray(rawCustomSubclasses);
  const customAptitudes = safeArray(rawCustomAptitudes);
  const customLanguages = safeArray(rawCustomLanguages);
  const gameplayIndex = safeArray(rawGameplayIndex);
  const hiddenGameplayIndexKeys = safeArray(rawHiddenGameplayIndexKeys);
  const customKnowledge = safeArray(rawCustomKnowledge);
  const customOrigins = safeArray(rawCustomOrigins);
  const customAscendances = safeArray(rawCustomAscendances);
  const customProvenances = safeArray(rawCustomProvenances);
  const customHistoriques = safeArray(rawCustomHistoriques);
  const customCaracteristiques = safeArray(rawCustomCaracteristiques);
  const customResistanceEntries = safeArray(rawCustomResistanceEntries);
  const customMaitriseEntries = safeArray(rawCustomMaitriseEntries);
  const tagTypes = buildTagTypes(
    customRaces, customCompetences, customClasses, customSubclasses,
    gameplayIndex, hiddenGameplayIndexKeys, customKnowledge, customAptitudes,
    customLanguages, customOrigins, customAscendances, customProvenances,
    customHistoriques, customCaracteristiques, customResistanceEntries, customMaitriseEntries,
  );
  const [picker, setPicker]     = useState(null); // null | 'group' | 'type' | 'value' | 'params'
  const [pickerGroup, setPickerGroup] = useState(null);
  const [pickerType, setPickerType] = useState(null);
  const [pendingOption, setPendingOption] = useState(null);
  const [paramValue, setParamValue] = useState('');
  const [search, setSearch]     = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  const openPicker = useCallback((pos) => {
    setCursorPos(pos);
    setSearch('');
    setPicker('group');
    setPickerGroup(null);
    setPickerType(null);
    setPendingOption(null);
    setParamValue('');
  }, []);

  const pickGroup = (group) => {
    setPickerGroup(group);
    setSearch('');
    setPicker('type');
  };

  const handleKeyDown = (e) => {
    if (e.key === '{') {
      e.preventDefault();
      openPicker(e.target.selectionStart);
    }
  };

  const pickType = (type) => {
    setPickerType(type);
    setSearch('');
    setPendingOption(null);
    setParamValue('');
    setPicker('value');
  };

  const insertTag = (tag) => {
    const before = value.slice(0, cursorPos);
    const after  = value.slice(cursorPos);
    onChange(before + tag + after);
    setPicker(null);
    setPendingOption(null);
    setParamValue('');
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = cursorPos + tag.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 30);
  };

  const pickValue = (opt) => {
    if (opt.needsValue) {
      setPendingOption(opt);
      setParamValue('');
      setPicker('params');
      return;
    }
    insertTag(`{${pickerType.key}.${opt.key}}`);
  };

  const confirmParamTag = () => {
    if (!pendingOption) return;
    const valuePart = paramValue.trim() ? ` v=${paramValue.trim()}` : '';
    insertTag(`{${pickerType.key}.${pendingOption.key}${valuePart}}`);
  };

  const wrapSelection = (before, after = before) => {
    const target = textareaRef.current;
    const start = target?.selectionStart ?? value.length;
    const end = target?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || 'texte';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      if (!textareaRef.current) return;
      const nextStart = start + before.length;
      const nextEnd = nextStart + selected.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextStart, nextEnd);
    }, 30);
  };

  const filteredOptions = pickerType
    ? pickerType.options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const pickerPortal = picker ? createPortal(
    <div className="sde-picker-backdrop" onClick={() => setPicker(null)}>
      <div className="sde-picker" onClick={(e) => e.stopPropagation()}>

        {picker === 'group' && (
          <>
            <div className="sde-picker-title">Quel domaine ?</div>
            <div className="sde-picker-grid">
              {TAG_NAV_GROUPS.map((group) => (
                <button
                  key={group.key}
                  className="sde-picker-type-btn"
                  style={{ '--tag-color': group.color }}
                  onClick={() => pickGroup(group)}
                >
                  <span className="sde-picker-type-icon">{group.icon}</span>
                  <span className="sde-picker-type-label">{group.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {picker === 'type' && pickerGroup && (
          <>
            <button className="sde-picker-back" onClick={() => setPicker('group')}>
              ← Retour
            </button>
            <div className="sde-picker-title" style={{ color: pickerGroup.color }}>
              {pickerGroup.icon} {pickerGroup.label}
            </div>
            <div className="sde-picker-grid">
              {tagTypes.filter((t) => pickerGroup.types.includes(t.key)).map((t) => (
                <button
                  key={t.key}
                  className="sde-picker-type-btn"
                  style={{ '--tag-color': t.color }}
                  onClick={() => pickType(t)}
                >
                  <span className="sde-picker-type-icon">{t.icon}</span>
                  <span className="sde-picker-type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {picker === 'value' && pickerType && (
          <>
            <button className="sde-picker-back" onClick={() => setPicker('type')}>
              ← Retour
            </button>
            <div className="sde-picker-title" style={{ color: pickerType.color }}>
              {pickerType.icon} {pickerType.label}
            </div>
            <input
              className="sde-picker-search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="sde-picker-options">
              {filteredOptions.map((opt, optionIndex) => (
                <button
                  key={`${pickerType.key}-${opt.key}-${optionIndex}`}
                  className="sde-picker-opt"
                  style={{ '--tag-color': pickerType.color }}
                  onClick={() => pickValue(opt)}
                >
                  {opt.label}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <p className="sde-picker-empty">Aucun résultat</p>
              )}
            </div>
          </>
        )}

        {picker === 'params' && pickerType && pendingOption && (
          <>
            <button className="sde-picker-back" onClick={() => setPicker('value')}>
              ← Retour
            </button>
            <div className="sde-picker-title" style={{ color: pickerType.color }}>
              {pickerType.icon} {pendingOption.label}
            </div>
            <label className="sde-param-field">
              <span>Valeur</span>
              <input
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmParamTag();
                  }
                }}
                placeholder="Ex: 6"
                autoFocus
              />
            </label>
            <button
              className="sde-picker-opt"
              style={{ '--tag-color': pickerType.color }}
              onClick={confirmParamTag}
            >
              Insérer {paramValue.trim() ? `{${pickerType.key}.${pendingOption.key} v=${paramValue.trim()}}` : `{${pickerType.key}.${pendingOption.key}}`}
            </button>
          </>
        )}

      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="sde-wrap">
      {/* Zone de saisie */}
      <div className="sde-editor-area">
        <div className="sde-toolbar">
          <button type="button" onClick={() => wrapSelection('**')} title="Gras">B</button>
          <button type="button" onClick={() => wrapSelection('*')} title="Italique"><i>I</i></button>
          <button type="button" onClick={() => wrapSelection('__')} title="Souligné"><u>U</u></button>
        </div>
        <textarea
          ref={textareaRef}
          className="sde-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Décrivez… Tapez { pour insérer un tag dynamique.'}
          rows={5}
        />
        <div className="sde-hint">
          Tapez <kbd>{'{'}</kbd> pour insérer un tag coloré (classe, stat, portée…)
        </div>
      </div>

      {/* Aperçu rendu */}
      {value && (
        <div className="sde-preview">
          <div className="sde-preview-label">Aperçu</div>
          <div className="sde-preview-text">
            <SmartText text={value} />
          </div>
        </div>
      )}

      {pickerPortal}
    </div>
  );
}
