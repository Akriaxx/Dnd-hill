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
  effects: null,
};

export const BLANK_ITEM_CLASS = { nom: '', description: '' };

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

export const TEMP_ITEM_CATEGORIES = [
  { id: -101, nom: 'Consommables', description: 'Objets à usage unique ou limité : potions, fioles, rations, remèdes.', couleur: '#54d58a', icone: 'flask', temporary: true },
  { id: -102, nom: 'Armes', description: 'Tout ce qui sert à attaquer : lames, masses, arcs, armes improvisées.', couleur: '#d55f5f', icone: 'sword', temporary: true },
  { id: -103, nom: 'Armures', description: 'Protections portées : torse, casque, gants, bottes, boucliers.', couleur: '#7ba7ff', icone: 'shield', temporary: true },
  { id: -104, nom: 'Artefacts', description: 'Objets rares, instables ou chargés de magie, souvent uniques.', couleur: '#d77ee8', icone: 'gem', temporary: true },
  { id: -105, nom: 'Outils', description: 'Matériel utilitaire : kits, cordes, instruments, outils de métier.', couleur: '#c8a84a', icone: 'tool', temporary: true },
  { id: -201, parentId: -101, nom: 'Potions', description: 'Préparations buvables qui restaurent ou renforcent temporairement.', couleur: '#54d58a', icone: 'potion', temporary: true },
  { id: -202, parentId: -101, nom: 'Fioles', description: 'Petits contenants alchimiques à effet rapide.', couleur: '#7de0b1', icone: 'vial', temporary: true },
  { id: -203, parentId: -102, nom: 'Lames', description: 'Épées, dagues et armes tranchantes.', couleur: '#d55f5f', icone: 'sword', temporary: true },
  { id: -204, parentId: -102, nom: 'Contondantes', description: 'Masses, marteaux et armes faites pour briser.', couleur: '#c77a55', icone: 'hammer', temporary: true },
  { id: -205, parentId: -103, nom: 'Torse', description: 'Armures principales portées sur le buste.', couleur: '#7ba7ff', icone: 'armor', temporary: true },
  { id: -206, parentId: -103, nom: 'Gants', description: 'Protège les mains sans gêner les gestes fins.', couleur: '#9bbcff', icone: 'gloves', temporary: true },
];

export const TEMP_ITEMS = [
  { id: -1001, categoryId: -201, nom: 'Potion de vitalité mineure', description: "Restaure une petite quantité de vitalité lorsqu'elle est consommée.", stackable: true, icone: 'potion', temporary: true },
  { id: -1002, categoryId: -202, nom: "Fiole d'endurance claire", description: 'Une préparation amère qui aide à reprendre son souffle après un effort.', stackable: true, icone: 'vial', temporary: true },
  { id: -1003, categoryId: -203, nom: "Lame courte d'entraînement", description: 'Une arme simple, équilibrée, pensée pour les premiers combats.', equipable: true, icone: 'sword', temporary: true },
  { id: -1004, categoryId: -204, nom: 'Masse de fer brut', description: "Lourde, directe, rarement subtile. Elle fait exactement ce qu'on attend d'elle.", equipable: true, icone: 'hammer', temporary: true },
  { id: -1005, categoryId: -205, nom: 'Plastron renforcé', description: 'Protection de torse robuste, utile pour encaisser les coups frontaux.', equipable: true, icone: 'armor', temporary: true },
  { id: -1006, categoryId: -206, nom: 'Gants de cuir riveté', description: 'Protège les mains sans gêner les gestes fins.', equipable: true, icone: 'gloves', temporary: true },
  { id: -1007, categoryId: -104, nom: "Fragment d'écho ancien", description: "Un éclat froid qui semble répéter des souvenirs qui ne lui appartiennent pas.", icone: 'crystal', temporary: true },
  { id: -1008, categoryId: -105, nom: 'Kit de crochetage usé', description: "Un ensemble incomplet, mais encore fiable entre des mains patientes.", stackable: false, icone: 'lockpick', temporary: true },
];

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
