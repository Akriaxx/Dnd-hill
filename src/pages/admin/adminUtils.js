// Shared utilities for admin panels

export const asArray = (value) => Array.isArray(value) ? value : [];

export const slugifyKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const includesText = (value, search) =>
  String(value || '').toLowerCase().includes(search.trim().toLowerCase());

export const uniqueOptions = (values, allLabel = 'Tous') => [
  { value: 'all', label: allLabel },
  ...[...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr')).map((value) => ({ value, label: value })),
];

export const mergeTemporaryRows = (temporaryRows, customRows) => [
  ...temporaryRows,
  ...asArray(customRows),
];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(value);

export function hexToRgb(hex) {
  const clean = isHexColor(hex) ? hex.slice(1) : 'ffffff';
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// ── SpellRank utilities ────────────────────────────────────────

// 6 paliers officiels : Mineur, Moyen, Fort, Majeur, Éminent, Prodigieux.
export const MAX_SPELL_RANK = 6;

export const normalizeSpellRanks = (ranks = []) =>
  asArray(ranks)
    .map((rank) => ({
      ...rank,
      value: Math.min(MAX_SPELL_RANK, Math.max(1, Number(rank.value) || 1)),
      label: rank.label || rank.nom || `Rang ${Number(rank.value) || 1}`,
    }))
    .sort((a, b) => a.value - b.value);

// Returns ranks accessible at a given character level (by restrictLevel)
export const getRanksAtLevel = (ranks, level) => {
  const normalized = normalizeSpellRanks(ranks);
  return normalized.filter(
    (rank) => !rank.restrictLevel || Number(rank.restrictLevel) <= Number(level)
  );
};

// ── Classes ────────────────────────────────────────────────────

export const BLANK_CLASS_FORM = {
  nom: '', type: '', description: '', allowedRaces: [],
  // Rôle(s) joué(s) par la classe en jeu (voir ArchetypesPanel) — un
  // archétype principal et, éventuellement, des archétypes secondaires.
  archetypeId: null,
  archetypeSecondaryIds: [],
  // Classes d'équipement (customItemClasses) autorisées pour cette classe
  // de personnage — vide = toutes autorisées. Voir ClassesPanel.jsx.
  allowedItemClasses: [],
  physique: '', magique: '',
  resourceDice: { vie: '', mana: '', endu: '' },
  nombreSortsMagiques: 0, nombreSortsPhysiques: 0, nombreCompetences: 0,
};

export const BLANK_SUBCLASS_FORM = {
  nom: '', classe: '', description: '', allowedRaces: [],
  // Rôle(s) joué(s) par la sous-classe — voir BLANK_CLASS_FORM. Laisser
  // archetypeId à null hérite du principal ET des secondaires de la classe.
  archetypeId: null,
  archetypeSecondaryIds: [],
  resourceDice: { vie: '', mana: '', endu: '' },
  replaceClassResourceDice: false,
  replaceClassSpellCounts: false,
  nombreSortsMagiques: 0, nombreSortsPhysiques: 0, nombreCompetences: 0,
};

export const RESOURCE_DICE_KEYS = [['vie', 'Vie'], ['mana', 'Mana'], ['endu', 'Endurance']];

export const normalizeDieFormula = (value = '') => {
  const clean = String(value || '').trim().replace(/\s+/g, '').toLowerCase();
  if (!clean) return '';
  if (/^\d+([+-]\d+)?$/.test(clean)) return `1d${clean}`;
  if (/^d\d+([+-]\d+)?$/.test(clean)) return `1${clean}`;
  return clean.replace(/^1D/, '1d');
};

export const normalizeResourceDice = (source = {}) => {
  const dice = source.resourceDice || {};
  return Object.fromEntries(RESOURCE_DICE_KEYS.map(([key]) => {
    const value = Array.isArray(dice[key]) ? dice[key].find(Boolean) : dice[key];
    return [key, normalizeDieFormula(value || (source[key] ? `1d${source[key]}` : ''))];
  }));
};

export const resourceDiceSummary = (entry = {}) => {
  const dice = normalizeResourceDice(entry);
  const parts = RESOURCE_DICE_KEYS.map(([key, label]) => {
    if (dice[key]) return `${label} : ${dice[key]}`;
    const legacy = entry[key];
    return legacy ? `${label} +${legacy}` : null;
  }).filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Dés non définis';
};

export const getRaceOptionsForLocks = (customRaces = []) =>
  Array.from(new Map(
    asArray(customRaces)
      .filter((race) => race.nom)
      .map((race) => [race.key || slugifyKey(race.nom), { key: race.key || slugifyKey(race.nom), nom: race.nom }])
  ).values());

export const linesToText = (value) => asArray(value).join('\n');
export const textToLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);

// ── Race / Ascendance ──────────────────────────────────────────

export const RACE_RESOURCE_KEYS = [
  { key: 'vie', label: 'Vie' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'mana', label: 'Mana' },
];

export const BLANK_RACE = {
  nom: '', description: '', deplacement: 8,
  tagColor: '#c8a84a',
  competenceRaciale: '',
  bonusStats: { FOR: 0, DEX: 0, CON: 0, INT: 0, SAG: 0, CHA: 0 },
  baseResources: { vie: 0, endurance: 0, mana: 0 },
  resistanceBonuses: [],
  aptitudes: [],
  langues: [],
};

export const BLANK_ASCENDANCE = {
  nom: '',
  race: '',
  description: '',
  tagColor: '#bcecff',
  competenceAscendance: '',
  bonusStats: { FOR: 0, DEX: 0, CON: 0, INT: 0, SAG: 0, CHA: 0 },
  baseResources: { vie: 0, endurance: 0, mana: 0 },
  replaceRaceStats: false,
  replaceRaceResources: false,
  replaceRaceResistances: false,
  replaceRaceAptitudes: false,
  replaceRaceLanguages: false,
  replaceRaceProvenances: false,
  aptitudeChoices: { plusOne: 1, plusTwo: 1 },
  resistanceBonuses: [],
  aptitudes: [],
  langues: [],
};

export const hasAnyIdentityEffects = (entry) => (
  Object.values(entry?.bonusStats || {}).some((v) => Number(v) !== 0)
  || Object.values(entry?.baseResources || {}).some((v) => Number(v) !== 0)
  || (entry?.resistanceBonuses || []).length > 0
  || (entry?.aptitudes || []).length > 0
  || (entry?.langues || []).length > 0
);

export const BLANK_KNOWLEDGE_CATEGORY_FORM = { nom: '', couleur: '#c8a84a' };

// ── Constants ──────────────────────────────────────────────────

export const STAT_KEYS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

// Aucune catégorie par défaut — toutes créées depuis l'admin.
export const DEFAULT_COMPETENCE_CATEGORIES = [];

// ── Blank forms ────────────────────────────────────────────────

// restrictLevel: null = aucune restriction
export const BLANK_COMP = {
  nom: '',
  categoryKey: 'general',
  classe: '',
  sousClasse: '',
  type: 'actif',
  tagColor: '#d77ee8',
  description: '',
  restrictLevel: null,
};

// Un état n'a pas de catégorie par défaut — elles sont toutes créées
// depuis l'admin (aucune catégorie pré-remplie, contrairement aux
// compétences qui ont un "Général" verrouillé).
export const BLANK_ETAT_CATEGORY = {
  key: '',
  nom: '',
  couleur: '#d77ee8',
  // Classe(s)/sous-classe(s) pouvant appliquer un état de cette
  // catégorie — clés de sous-classe, vide = tout le monde peut l'appliquer.
  sousClasses: [],
};

// Une condition de fin peut être combinée avec d'autres (ex: un jet de
// sauvegarde répété ET un sort de type précis qui dissipe instantanément).
export const REMOVAL_CONDITION_TYPES = [
  { key: 'save', label: 'Jet de sauvegarde périodique' },
  { key: 'spell_type', label: 'Sort d\'un type précis' },
  { key: 'action', label: 'Action dédiée' },
  { key: 'positional', label: 'Condition positionnelle' },
];

export const SAVE_TIMING_OPTIONS = [
  { key: 'start_of_turn', label: 'Début de tour' },
  { key: 'end_of_turn', label: 'Fin de tour' },
];

export const blankRemovalCondition = (type = 'save') => {
  if (type === 'save') return { type, stat: 'Sagesse', timing: 'end_of_turn', difficulty: 'niveau du sort', durationTurns: null };
  if (type === 'spell_type') return { type, spellTypes: [] };
  if (type === 'action') return { type, actionType: 'Action Simple', by: 'self', description: '' };
  return { type: 'positional', description: '' };
};

export const BLANK_ETAT = {
  nom: '',
  // Un état peut appartenir à plusieurs catégories (ex: "Aveuglement"
  // accessible aux profanateurs via Malédiction ET aux paladins via une
  // autre catégorie, même effet mais deux façons d'y accéder). Au moins
  // une catégorie est requise.
  categoryKeys: [],
  tagColor: '#d77ee8',
  description: '',
  effects: '',
  // Domaine(s) de maîtrise auxquels cet état est réservé — clés de
  // maîtrise, vide = non lié à un domaine en particulier.
  maitriseKeys: [],
  removalConditions: [],
};

// spellRankMax retiré : la source de vérité est SpellRank.restrictLevel
export const BLANK_LEVEL_RULE = {
  level: 0,
  baseClass: 'Explorateur',
  title: '',
  summary: '',
  characterPoints: 0,
  unlockClass: false,
  unlockSubclass: false,
  unlockMaitrise: false,
};

export function normalizeLevelRule(rule = {}) {
  return {
    ...BLANK_LEVEL_RULE,
    ...rule,
    level: Number(rule.level) || 0,
    baseClass: rule.baseClass || 'Explorateur',
    characterPoints: Number(rule.characterPoints) || 0,
  };
}
