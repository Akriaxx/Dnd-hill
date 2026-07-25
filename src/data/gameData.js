// Référentiel Eindhill
// Le catalogue de game design est désormais alimenté par le gestionnaire MJ.
// Les tableaux ci-dessous restent vides volontairement pour éviter de réinjecter
// l'ancienne fausse base locale dans l'interface.

export const RACE_DATA = [];
export const ASCENDANCE_DATA = [];
export const CLASS_DATA = [];
export const SUBCLASS_DATA = [];
export const ORIGIN_DATA = [];
export const HISTORIQUE_DATA = [];
export const PROVENANCE_DATA = [];
export const MAITRISE_DATA = [];
export const WEAPON_DATA = [];
export const KNOWLEDGE_DATA = [];
export const GADGET_DATA = [];

export const RACES = RACE_DATA.map((race) => race.nom);
export const ASCENDANCES = {};
export const CLASSES = CLASS_DATA;
export const CLASS_NAMES = CLASSES.map((classe) => classe.nom);
export const SOUS_CLASSES = {};

export const SEXES = ['Homme', 'Femme', 'Autre'];
export const APTITUDES = [];
export const APT_CATEGORIES = [];
export const RESISTANCE_COLS = ['raciaux', 'classes', 'malus', 'bonus', 'mtemp', 'btemp'];
export const RESISTANCES_DEF = {};
export const STAT_KEYS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
