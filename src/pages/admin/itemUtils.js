import { asArray } from './adminUtils';

export const BLANK_ITEM_CATEGORY = { nom: '', description: '', couleur: '#c8a84a', icone: '', parentId: null };

export const BLANK_ITEM = {
  nom: '',
  description: '',
  consumable: false,
  usable: false,
  useText: '',
  equipable: false,
  equipSlot: '',
  stackable: false,
  icone: '',
  categoryId: null,
  classeId: null,
  rareteId: null,
  effects: null,
  // Malus optionnel appliqué quand la classe du porteur n'autorise pas la
  // classe d'équipement de cet objet (voir Class.allowedItemClasses).
  hasCondition: false,
  conditionEffects: null,
};

// Une "classe d'objet" est une classe d'équipement (Lourde, Intermédiaire,
// Finesse…), rattachée à une catégorie racine équipable (Armure, Arme…) —
// c'est elle, pas la sous-catégorie de rangement, que les classes de
// personnage autorisent ou non (voir ClassesPanel).
export const BLANK_ITEM_CLASS = { nom: '', description: '', rootCategoryId: null };

export const BLANK_ITEM_RARITY = { nom: '', couleur: '#c8a84a', niveau: 0, description: '' };

export const ITEM_EQUIP_SLOTS = [
  { key: '', label: 'Aucun slot' },
  { key: 'casque', label: 'Casque' },
  { key: 'torse', label: 'Torse' },
  { key: 'cape', label: 'Cape' },
  { key: 'gants', label: 'Gants' },
  { key: 'ceinture', label: 'Ceinture' },
  { key: 'bottes', label: 'Bottes' },
  { key: 'bijou', label: 'Bijou' },
  { key: 'arme', label: 'Arme' },
];

export const ITEM_SIMPLE_EFFECTS = [
  { key: 'vitalite', label: 'Vitalité' },
  { key: 'mana', label: 'Mana' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'attaquePhysique', label: 'Attaque phy.' },
  { key: 'attaqueMagique', label: 'Attaque mag.' },
  { key: 'attaqueDistance', label: 'Attaque dis.' },
  { key: 'resistanceMagique', label: 'Résistance mag.' },
  { key: 'resistancePhysique', label: 'Résistance phy.' },
  { key: 'esquive', label: 'Esquive' },
  { key: 'initiative', label: 'Initiative' },
];

// Regroupe ITEM_SIMPLE_EFFECTS par besoin plutôt que de tout afficher en
// vrac : Ressources d'abord (vitalité/mana/endurance), puis Attaque,
// Défense, et enfin Initiative seule — voir ItemPanel.jsx (ItemEffectBuilder)
// qui s'appuie sur ces groupes pour le rendu du panneau "Ressource".
export const ITEM_SIMPLE_EFFECT_GROUPS = [
  { label: 'Ressources', keys: ['vitalite', 'mana', 'endurance'] },
  { label: 'Attaque', keys: ['attaquePhysique', 'attaqueMagique', 'attaqueDistance'] },
  { label: 'Défense', keys: ['resistanceMagique', 'resistancePhysique', 'esquive'] },
  { label: 'Initiative', keys: ['initiative'] },
];

export const ITEM_EFFECT_STAT_KEYS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export const createBlankItemEffects = () => ({
  simple: Object.fromEntries(ITEM_SIMPLE_EFFECTS.map((effect) => [effect.key, 0])),
  stats: Object.fromEntries(ITEM_EFFECT_STAT_KEYS.map((stat) => [stat, 0])),
  aptitudes: [],
  resistances: [],
});

export const normalizeItemEffects = (effects) => {
  const blank = createBlankItemEffects();
  const source = effects && typeof effects === 'object' ? effects : {};
  return {
    simple: { ...blank.simple, ...(source.simple || {}) },
    stats: { ...blank.stats, ...(source.stats || {}) },
    aptitudes: Array.isArray(source.aptitudes) ? source.aptitudes : [],
    resistances: Array.isArray(source.resistances) ? source.resistances : [],
  };
};

export const itemEffectValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const hasAnyItemEffect = (rawEffects) => {
  const effects = normalizeItemEffects(rawEffects);
  return (
    Object.values(effects.simple).some((v) => Number(v) !== 0)
    || Object.values(effects.stats).some((v) => Number(v) !== 0)
    || effects.aptitudes.length > 0
    || effects.resistances.length > 0
  );
};

// Aucun objet/catégorie de démo — tous créés depuis l'admin.
export const TEMP_ITEM_CATEGORIES = [];
export const TEMP_ITEMS = [];

export const normalizeItemCategoryId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
};

export const getItemCategoryChildren = (categories, parentId) =>
  categories.filter((category) => normalizeItemCategoryId(category.parentId) === normalizeItemCategoryId(parentId));

export const getRootItemCategories = (categories) =>
  categories.filter((category) => !normalizeItemCategoryId(category.parentId));

export const getItemCategoryBranchIds = (categories, categoryId) => {
  const normalizedId = normalizeItemCategoryId(categoryId);
  const children = getItemCategoryChildren(categories, normalizedId);
  return [
    normalizedId,
    ...children.flatMap((child) => getItemCategoryBranchIds(categories, child.id)),
  ].filter((value) => value !== null && value !== undefined);
};

export const getRootItemCategoryId = (categories, categoryId) => {
  const normalizedId = normalizeItemCategoryId(categoryId);
  const category = categories.find((entry) => normalizeItemCategoryId(entry.id) === normalizedId);
  if (!category) return null;
  return category.parentId ? getRootItemCategoryId(categories, category.parentId) : category.id;
};

// Classes d'équipement (customItemClasses) rattachées à une catégorie
// racine donnée (Armure, Arme…) — voir BLANK_ITEM_CLASS.rootCategoryId.
export const getItemClassesForRoot = (itemClasses, rootCategoryId) => {
  const normalizedId = normalizeItemCategoryId(rootCategoryId);
  return itemClasses.filter((cls) => normalizeItemCategoryId(cls.rootCategoryId) === normalizedId);
};

// Regroupe toutes les classes d'équipement par leur catégorie racine, pour
// le sélecteur "Classes d'équipement autorisées" côté classe de personnage.
export const groupItemClassesByRoot = (itemClasses, rootCategories) =>
  rootCategories
    .map((root) => ({
      id: root.id,
      nom: root.nom,
      items: getItemClassesForRoot(itemClasses, root.id),
    }))
    .filter((group) => group.items.length > 0);
