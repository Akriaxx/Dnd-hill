import {
  APTITUDES,
  ASCENDANCE_DATA,
  CLASSES,
  HISTORIQUE_DATA,
  ORIGIN_DATA,
  PROVENANCE_DATA,
  RACE_DATA,
  RESISTANCES_DEF,
  SUBCLASS_DATA,
} from '../data/gameData';
// Les tableaux ci-dessus sont volontairement vides (voir gameData.js) — les
// vraies données de jeu vivent dans l'admin store (customRaces, customClasses,
// customAptitudes, etc.). getState() (API vanille Zustand, sans abonnement)
// permet aux getters ci-dessous de lire le store depuis ce module "domaine"
// sans le transformer en hook ni le coupler à React.
import { useAdminStore } from '../store/adminStore';
import { getAptitudeCatalog, getResistanceCatalog, resolveBonusChoiceContributions, findCatalogEntry, getDomainMeta } from './bonusChoiceDomains';

export const STAT_KEYS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export const STAT_LABELS = {
  FOR: 'Force',
  DEX: 'Dextérité',
  CON: 'Constitution',
  INT: 'Intelligence',
  SAG: 'Sagesse',
  CHA: 'Charisme',
  VAR: 'Variable',
};

const STAT_ALIASES = {
  FOR: 'FOR',
  FORCE: 'FOR',
  DEX: 'DEX',
  DEXTÉRITÉ: 'DEX',
  DEXTERITE: 'DEX',
  CON: 'CON',
  CONSTITUTION: 'CON',
  INT: 'INT',
  INTELLIGENCE: 'INT',
  SAG: 'SAG',
  SAGESSE: 'SAG',
  CHA: 'CHA',
  CHARISME: 'CHA',
};

const STAT_NAME_PATTERN = '(FOR|Force|DEX|Dextérité|Dexterite|CON|Constitution|INT|Intelligence|SAG|Sagesse|CHA|Charisme)';

// Copie locale de slugifyKey (src/pages/admin/adminUtils.js) — le domaine ne
// doit pas dépendre des pages admin, mais doit reproduire exactement le même
// format de clé pour retrouver les bonus d'aptitude/résistance posés sur un
// objet (ItemPanel.jsx génère ses clés avec ce même algorithme).
function slugifyLocal(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTextKey(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/[^A-Z0-9.+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .trim();
}

const APTITUDE_ALIASES = {
  'ATLHETISME': 'Athlétisme',
  'ATHLETISME': 'Athlétisme',
  'MÉDECINE': 'Médecine',
  'MEDECINE': 'Médecine',
  'PERCE.VIS': 'Perce.Vis',
  'PERCE VIS': 'Perce.Vis',
  'PERCE.VISU': 'Perce.Vis',
  'PERCE VISU': 'Perce.Vis',
  'PERC.VIS': 'Perce.Vis',
  'PERC VIS': 'Perce.Vis',
  'PERC.VISU': 'Perce.Vis',
  'PERC VISU': 'Perce.Vis',
  'PERCEPTION VISUELLE': 'Perce.Vis',
  'PERCE.MAG': 'Perce.Mag',
  'PERCE MAG': 'Perce.Mag',
  'PERC.MAG': 'Perce.Mag',
  'PERC MAG': 'Perce.Mag',
  'PERCEPTION MAGIQUE': 'Perce.Mag',
  'PERC.MAI': 'Perce.Mag',
  'PERC MAI': 'Perce.Mag',
};

// APTITUDES (gameData.js) est vide par conception — les vraies aptitudes
// sont dans l'admin store (customAptitudes). BASE_APTITUDE_LOOKUP ne couvre
// donc que les alias/synonymes ; getAptitudeLookup() y ajoute les aptitudes
// personnalisées à chaque appel, sinon aucun nom d'aptitude réel (Alchimie,
// Forgeage…) n'était jamais reconnu et parseAptitudeBonuses ignorait
// silencieusement tout bonus de texte ("+2 en Alchimie").
const BASE_APTITUDE_LOOKUP = APTITUDES.reduce((lookup, aptitude) => {
  lookup[normalizeTextKey(aptitude.nom)] = aptitude.nom;
  return lookup;
}, Object.fromEntries(
  Object.entries(APTITUDE_ALIASES).map(([alias, aptitude]) => [normalizeTextKey(alias), aptitude]),
));

function getAptitudeLookup() {
  const customAptitudes = useAdminStore.getState().customAptitudes;
  if (!customAptitudes || customAptitudes.length === 0) return BASE_APTITUDE_LOOKUP;
  const lookup = { ...BASE_APTITUDE_LOOKUP };
  customAptitudes.forEach((aptitude) => {
    if (aptitude?.nom) lookup[normalizeTextKey(aptitude.nom)] = aptitude.nom;
  });
  return lookup;
}

const RESISTANCE_ALIASES = {
  ELECTRIQUES: ['etatsElementaires', 'Électrocuté'],
  ELECTRIQUE: ['etatsElementaires', 'Électrocuté'],
  FOUDRE: ['etatsElementaires', 'Électrocuté'],
  POISON: ['etatsElementaires', 'Empoisonné'],
  EMPOISONNE: ['etatsElementaires', 'Empoisonné'],
  GEL: ['etatsElementaires', 'Gelé'],
  GELE: ['etatsElementaires', 'Gelé'],
  GIVRE: ['etatsElementaires', 'Gelé'],
  FROID: ['etatsElementaires', 'Gelé'],
  BRULURE: ['etatsElementaires', 'Brûlé'],
  BRULE: ['etatsElementaires', 'Brûlé'],
  SAIGNEMENT: ['etatsPhysiques', 'Saigné'],
  SAIGNE: ['etatsPhysiques', 'Saigné'],
  CONTROLE: ['etatsPsychiques', 'Contrôlé'],
  CHARME: ['etatsPsychiques', 'Contrôlé'],
  PSYCHIQUE: ['etatsPsychiques', 'Perturbé'],
  MALEDICTION: ['etatsMalediction', 'Corrompu'],
  CORRUPTION: ['etatsMalediction', 'Corrompu'],
  CONTONDANT: ['armes', 'Contondant'],
  PERFORANT: ['armes', 'Perforant'],
  TRANCHANT: ['armes', 'Tranchant'],
  PHYSIQUECONTONDANT: ['armes', 'Contondant'],
  PHYSIQUEPERFORANT: ['armes', 'Perforant'],
  PHYSIQUETRANCHANT: ['armes', 'Tranchant'],
  PHYSIQUE: ['armes', 'Contondant'],
  ARCANE: ['elementaires', 'Arcane'],
  AIR: ['elementaires', 'Air'],
  CHAOS: ['elementaires', 'Chaos'],
  EAU: ['elementaires', 'Eau'],
  FEU: ['elementaires', 'Feu'],
  LUMIERE: ['elementaires', 'Lumière'],
  OMBRE: ['elementaires', 'Ombre'],
  TERRE: ['elementaires', 'Terre'],
  CONCENTRATION: ['concentration', 'Concentration'],
};

// Même situation que APTITUDES : RESISTANCES_DEF (gameData.js) est vide,
// les vraies résistances viennent de customResistanceEntries (admin store).
const BASE_RESISTANCE_LOOKUP = Object.entries(RESISTANCES_DEF).reduce((lookup, [groupKey, group]) => {
  group.items.forEach((item) => {
    lookup[normalizeTextKey(item)] = [groupKey, item];
  });
  return lookup;
}, Object.fromEntries(
  Object.entries(RESISTANCE_ALIASES).map(([alias, target]) => [normalizeTextKey(alias), target]),
));

function getResistanceLookup() {
  const customResistanceEntries = useAdminStore.getState().customResistanceEntries;
  if (!customResistanceEntries || customResistanceEntries.length === 0) return BASE_RESISTANCE_LOOKUP;
  const lookup = { ...BASE_RESISTANCE_LOOKUP };
  customResistanceEntries.forEach((entry) => {
    if (entry?.label && entry?.categoryKey) lookup[normalizeTextKey(entry.label)] = [entry.categoryKey, entry.label];
  });
  return lookup;
}

// CLASSES/RACE_DATA/etc. (gameData.js) sont vides par conception : ces
// getters ne trouvaient donc jamais rien tant que le personnage n'utilisait
// que des entrées custom (le cas normal) — ce qui cassait silencieusement
// tout ce qui en dépend (getComputedAptitudeBonuses/getComputedResistanceBonuses
// via race/classe/origine/historique). On fusionne maintenant avec l'entrée
// personnalisée correspondante (admin store), la custom prenant le dessus —
// même sémantique que getCombinedClassDefinition côté CharacterListPage.jsx,
// dupliquée ici pour que le domaine reste correct même appelé seul.
function findCustomByName(rows, name) {
  const key = normalizeTextKey(name);
  if (!key) return null;
  return (rows || []).find((row) => normalizeTextKey(row?.nom) === key) || null;
}

function withCustomOverride(baseEntry, customRows, name) {
  const custom = findCustomByName(customRows, name);
  if (!baseEntry && !custom) return null;
  return { ...(baseEntry || {}), ...(custom || {}) };
}

export function getClassDefinition(charOrClassName) {
  const className = typeof charOrClassName === 'string'
    ? charOrClassName
    : charOrClassName?.classe;
  const base = CLASSES.find((c) => c.nom === className) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customClasses, className);
}

export function getRaceDefinition(charOrRaceName) {
  const raceName = typeof charOrRaceName === 'string'
    ? charOrRaceName
    : charOrRaceName?.race;
  const base = RACE_DATA.find((race) => race.nom === raceName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customRaces, raceName);
}

export function getAscendanceDefinition(charOrAscendanceName) {
  const ascendanceName = typeof charOrAscendanceName === 'string'
    ? charOrAscendanceName
    : charOrAscendanceName?.ascendance;
  const base = ASCENDANCE_DATA.find((ascendance) => ascendance.nom === ascendanceName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customAscendances, ascendanceName);
}

export function getOriginDefinition(charOrOriginName) {
  const originName = typeof charOrOriginName === 'string'
    ? charOrOriginName
    : charOrOriginName?.origine;
  const base = ORIGIN_DATA.find((origin) => origin.nom === originName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customOrigins, originName);
}

export function getHistoriqueDefinition(charOrHistoriqueName) {
  const historiqueName = typeof charOrHistoriqueName === 'string'
    ? charOrHistoriqueName
    : charOrHistoriqueName?.historique;
  const base = HISTORIQUE_DATA.find((historique) => historique.nom === historiqueName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customHistoriques, historiqueName);
}

export function getProvenanceDefinition(charOrProvenanceName) {
  const provenanceName = typeof charOrProvenanceName === 'string'
    ? charOrProvenanceName
    : charOrProvenanceName?.provenance;
  const base = PROVENANCE_DATA.find((provenance) => provenance.nom === provenanceName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customProvenances, provenanceName);
}

export function getSubclassDefinition(charOrSubclassName) {
  const subclassName = typeof charOrSubclassName === 'string'
    ? charOrSubclassName
    : charOrSubclassName?.sousClasse;
  const base = SUBCLASS_DATA.find((subclass) => subclass.nom === subclassName) ?? null;
  return withCustomOverride(base, useAdminStore.getState().customSubclasses, subclassName);
}

export function modifier(value, ppm = 2) {
  return Math.floor(((Number(value) || 0) - 10) / Math.max(1, ppm));
}

export function signed(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

export function statLabel(key) {
  return STAT_LABELS[key] || key;
}

function normalizeStatKey(value) {
  if (!value) return null;
  return STAT_ALIASES[String(value).trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')] ?? null;
}

function addStatBonus(target, stat, amount) {
  const key = normalizeStatKey(stat);
  if (!key) return;
  target[key] = (target[key] ?? 0) + amount;
}

function normalizeAptitudeName(value) {
  if (!value) return null;
  const key = normalizeTextKey(value)
    .replace(/\bVISU\b/g, 'VIS')
    .replace(/\bMEDECINE\b/g, 'MEDECINE');

  return getAptitudeLookup()[key] ?? null;
}

function addAptitudeBonus(target, aptitude, amount) {
  const key = normalizeAptitudeName(aptitude);
  if (!key) return;
  target[key] = (target[key] ?? 0) + amount;
}

function splitBonusTargets(value) {
  return String(value ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\bainsi qu['’]?/gi, ',')
    .replace(/\bet\b/gi, ',')
    .replace(/\bou\b/gi, ',')
    .replace(/\//g, ',')
    .split(',')
    .map((part) => part.replace(/\b(en|de|des|du|la|le|les|aux?|sur|jets?|choix|dans)\b/gi, ' ').trim())
    .filter(Boolean);
}

function parseAptitudeBonuses(text) {
  const bonuses = {};
  if (!text) return bonuses;

  const input = String(text).replace(/\s+/g, ' ');
  const amountGroups = /([+-]\s*\d+)\s*(?:en|à|a|au|aux|sur|dans)?\s*([^+\[\]]+?)(?=(?:\s+(?:et\s+)?(?:un\s+)?(?:bonus|malus|ajoute|obtient|gagne)\b)|(?:\s+[+-]\s*\d+)|[;\]]|$)/gi;

  for (const match of input.matchAll(amountGroups)) {
    const amount = Number(match[1].replace(/\s/g, ''));
    splitBonusTargets(match[2]).forEach((target) => addAptitudeBonus(bonuses, target, amount));
  }

  return bonuses;
}

function mergeAptitudeBonusMaps(...maps) {
  return maps.reduce((merged, map) => {
    Object.entries(map ?? {}).forEach(([key, value]) => {
      merged[key] = (merged[key] ?? 0) + Number(value || 0);
    });
    return merged;
  }, {});
}

function normalizeResistanceName(value) {
  if (!value) return null;
  const normalized = normalizeTextKey(value)
    .replace(/\bDM\b/g, ' ')
    .replace(/\bDEGATS?\b/g, ' ')
    .replace(/\bDOMMAGES?\b/g, ' ')
    .replace(/\bEFFETS?\b/g, ' ')
    .replace(/\bSUPPLEMENTAIRES?\b/g, ' ')
    .replace(/\bDOMAINE\b/g, ' ')
    .replace(/\bD\s+/g, ' ')
    .replace(/\bSOLAIRE\b/g, 'LUMIERE')
    .replace(/\bNATURE\b/g, 'TERRE')
    .replace(/\bGLACE\b/g, 'GEL')
    .replace(/\bMALADIE\b/g, 'MALADE')
    .replace(/\s+/g, ' ')
    .trim();

  return getResistanceLookup()[normalized] ?? null;
}

function addResistanceBonus(target, rawName, amount, column) {
  const normalized = normalizeResistanceName(rawName);
  if (!normalized) return;
  const [groupKey, itemName] = normalized;
  target[groupKey] ??= {};
  target[groupKey][itemName] ??= {};
  target[groupKey][itemName][column] = (target[groupKey][itemName][column] ?? 0) + amount;
}

function splitResistanceTargets(value) {
  return String(value ?? '')
    .replace(/\([^)]*\)/g, (match) => match.replace(/[()]/g, ' '))
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(?:et|ou|ainsi que|contre|aux?|de|des|du|la|le|les|d')\b/gi, ' ')
    .split(/[\/,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseResistanceBonuses(text, column = 'raciaux') {
  const bonuses = {};
  if (!text) return bonuses;

  const input = String(text).replace(/\s+/g, ' ');
  const toSheetResistance = (raw, percent = false) => {
    const value = Number(raw);
    if (!percent) return value;
    return value / 10;
  };
  const positiveRules = [
    /r[ée]sistance\s*(?:de)?\s*\(?\s*([+-]?\d+)\s*(%)?\s*\)?\s*(?:aux?|contre|de|des)?\s*([^.;]+)/gi,
    /r[ée]sistance\s*(?:aux?|contre|de|des)?\s*([^.;]+?)\s*(?:de)?\s*\+?(\d+)\b/gi,
    /r[ée]sistance\s*(?:aux?|contre|de|des)?\s*([^.;]+?)\s*\(d[ée]g[âa]ts r[ée]duits de moiti[ée]\)/gi,
  ];

  for (const match of input.matchAll(positiveRules[0])) {
    const amount = toSheetResistance(match[1], Boolean(match[2]));
    splitResistanceTargets(match[3]).forEach((target) => addResistanceBonus(bonuses, target, amount, column));
  }

  for (const match of input.matchAll(positiveRules[1])) {
    const amount = Number(match[2]);
    splitResistanceTargets(match[1]).forEach((target) => addResistanceBonus(bonuses, target, amount, column));
  }

  for (const match of input.matchAll(positiveRules[2])) {
    splitResistanceTargets(match[1]).forEach((target) => addResistanceBonus(bonuses, target, 5, column));
  }

  const malusRules = [
    /subit\s*\+?(\d+)\s*(%)?\s*(?:de\s*)?d[ée]g[âa]ts\s*(?:de|d')?\s*([^.;]+)/gi,
    /subit\s*\+?(\d+)\s*(%)?\s*(?:de\s*)?([^.;]+?)\s+suppl[ée]mentaires?/gi,
  ];

  for (const regex of malusRules) {
    for (const match of input.matchAll(regex)) {
      const amount = toSheetResistance(match[1], Boolean(match[2]));
      splitResistanceTargets(match[3]).forEach((target) => addResistanceBonus(bonuses, target, amount, 'malus'));
    }
  }

  return bonuses;
}

function mergeResistanceMaps(...maps) {
  return maps.reduce((merged, map) => {
    Object.entries(map ?? {}).forEach(([groupKey, group]) => {
      merged[groupKey] ??= {};
      Object.entries(group).forEach(([itemName, values]) => {
        merged[groupKey][itemName] ??= {};
        Object.entries(values).forEach(([column, value]) => {
          merged[groupKey][itemName][column] = (merged[groupKey][itemName][column] ?? 0) + Number(value || 0);
        });
      });
    });
    return merged;
  }, {});
}

function parseStatBonuses(text, { includeNegative = true } = {}) {
  const bonuses = {};
  if (!text) return bonuses;

  const input = String(text);
  const direct = new RegExp(`([+-]\\s*\\d+)\\s*(?:point[s]?\\s*)?(?:en|de)?\\s*${STAT_NAME_PATTERN}`, 'gi');
  const reverse = new RegExp(`${STAT_NAME_PATTERN}\\s*([+-]\\s*\\d+)`, 'gi');

  for (const match of input.matchAll(direct)) {
    const amount = Number(match[1].replace(/\s/g, ''));
    if (!includeNegative && amount < 0) continue;
    addStatBonus(bonuses, match[2], amount);
  }

  for (const match of input.matchAll(reverse)) {
    const amount = Number(match[2].replace(/\s/g, ''));
    if (!includeNegative && amount < 0) continue;
    addStatBonus(bonuses, match[1], amount);
  }

  return bonuses;
}

function mergeBonusMaps(...maps) {
  return maps.reduce((merged, map) => {
    Object.entries(map ?? {}).forEach(([key, value]) => {
      merged[key] = (merged[key] ?? 0) + Number(value || 0);
    });
    return merged;
  }, {});
}

// Contrepartie "déjà structurée" de parseStatBonuses/parseAptitudeBonuses/
// parseResistanceBonuses (qui, eux, extraient un bonus depuis du texte
// libre) : RacesPanel.jsx/AscendancesPanel.jsx posent aussi des bonus via de
// vrais pickers (bonusStats, aptitudes, resistanceBonuses) — jusqu'ici
// jamais lus par aucun calcul, seulement ré-affichés tels quels dans
// l'admin. On les fait converger vers les mêmes fonctions bonuses/cibles
// (addStatBonus/addAptitudeBonus/addResistanceBonus) que le texte, pour que
// les deux sources s'additionnent proprement.
function structuredStatBonuses(bonusStats) {
  const bonuses = {};
  Object.entries(bonusStats || {}).forEach(([stat, amount]) => addStatBonus(bonuses, stat, Number(amount) || 0));
  return bonuses;
}

function structuredAptitudeBonuses(entries) {
  const bonuses = {};
  (entries || []).forEach((entry) => addAptitudeBonus(bonuses, entry?.nom, Number(entry?.value ?? 1) || 0));
  return bonuses;
}

// resistanceBonuses stocke value en pourcentage (cf. RacesPanel.jsx, input
// -100..100 assorti de textes "+20%") — même conversion /10 que
// parseResistanceBonuses pour rester sur la même unité de points de fiche.
function structuredResistanceBonuses(entries, column) {
  const bonuses = {};
  (entries || []).forEach((entry) => {
    const col = entry?.type === 'malus' ? 'malus' : column;
    addResistanceBonus(bonuses, entry?.resistance, (Number(entry?.value) || 0) / 10, col);
  });
  return bonuses;
}

// Bonus "au choix du joueur" (race/ascendance/sous-classe.bonusChoices, voir
// BonusChoicesEditor + bonusChoiceDomains.js) : le MJ déclare une règle
// (domaine + montant, ouvert ou cible précise), le joueur pioche à la
// création (char.bonusChoices = { [groupKey]: {branchIndex, gainAllocation,
// costAllocation} }, voir CharacterListPage.jsx) — on ne retient ici que la
// branche effectivement choisie pour ce personnage. Un domaine "variante"
// (ex: aptitude-case1/case2) compte comme son `catalogDomain` de base
// (aptitude) pour ce filtre — même catalogue, juste un montant fixe.
function getBonusChoiceContributionsFor(sourceDef, char, domain) {
  return resolveBonusChoiceContributions(sourceDef?.bonusChoices, char?.bonusChoices)
    .filter((c) => (getDomainMeta(c.domain)?.catalogDomain || c.domain) === domain);
}

export function getComputedStatBonuses(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const subclass = getSubclassDefinition(char);
  const choiceStatBonuses = {};
  [
    ...getBonusChoiceContributionsFor(race, char, 'caracteristique'),
    ...getBonusChoiceContributionsFor(ascendance, char, 'caracteristique'),
    ...getBonusChoiceContributionsFor(subclass, char, 'caracteristique'),
  ].forEach((c) => addNamedBonus(choiceStatBonuses, c.key, c.amount));

  return mergeBonusMaps(
    // Les malus raciaux en texte sont souvent contextuels. On ne les applique pas
    // automatiquement tant qu'ils ne sont pas structurés dans le référentiel.
    parseStatBonuses(race?.bonusRaciaux, { includeNegative: false }),
    parseStatBonuses(ascendance?.competenceAscendance),
    structuredStatBonuses(race?.bonusStats),
    structuredStatBonuses(ascendance?.bonusStats),
    choiceStatBonuses,
  );
}

export function getStatBreakdown(char, key, caracDefsMap = {}) {
  const ppm = Math.max(1, Number(caracDefsMap[key]?.pointsParModificateur) || 2);
  const base = Number(char?.stats?.[key] ?? 10);
  const details = char?.statsDetails?.[key] ?? {};
  const computedBonuses = getComputedStatBonuses(char);
  const mod = modifier(base, ppm);
  const hasAutoStatRule = computedBonuses[key] !== undefined;
  const autoStatRule = Number(computedBonuses[key] ?? 0);
  const autoBonus = autoStatRule > 0 ? autoStatRule : 0;
  const autoMalus = autoStatRule < 0 ? autoStatRule : 0;
  const manualBonus = Number(details.bonus ?? 0);
  const manualMalus = Number(details.malus ?? 0);
  const bonus = hasAutoStatRule ? autoBonus : manualBonus;
  const malus = hasAutoStatRule ? autoMalus : manualMalus;
  // Bonus/Malus Objet : somme des effects.stats[key] de l'équipement porté
  // (voir getEquippedItemStatSum) — plus une saisie manuelle, ces colonnes
  // sont en lecture seule dans le tableau (voir CharacterListPage.jsx).
  const itemStatEffect = getEquippedItemStatSum(char, key);
  const bonusObjet = Math.max(0, itemStatEffect);
  const malusObjet = Math.min(0, itemStatEffect);
  const bonusTemp = Number(details.bonusTemp ?? 0);
  const malusTemp = Number(details.malusTemp ?? 0);

  return {
    key,
    label: statLabel(key),
    base,
    mod,
    bonus,
    autoBonus,
    autoMalus,
    manualBonus,
    manualMalus,
    malus,
    bonusObjet,
    malusObjet,
    bonusTemp,
    malusTemp,
    total: mod + bonus + malus + bonusObjet + malusObjet + bonusTemp + malusTemp,
  };
}

export function getComputedAptitudeBonuses(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const classDef = getClassDefinition(char);
  const subclass = getSubclassDefinition(char);
  const origin = getOriginDefinition(char);
  const historique = getHistoriqueDefinition(char);
  const aptitudeCatalog = getAptitudeCatalog({
    customAptitudes: useAdminStore.getState().customAptitudes,
    customAptitudeCategories: useAdminStore.getState().customAptitudeCategories,
  });
  const choiceAptitudeBonuses = (sourceDef) => {
    const bonuses = {};
    getBonusChoiceContributionsFor(sourceDef, char, 'aptitude').forEach((c) => {
      const entry = findCatalogEntry(aptitudeCatalog, c.key);
      if (entry) addAptitudeBonus(bonuses, entry.label, c.amount);
    });
    return bonuses;
  };

  return {
    raciaux: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(race?.competenceRaciale),
      parseAptitudeBonuses(race?.bonusRaciaux),
      parseAptitudeBonuses(ascendance?.competenceAscendance),
      parseAptitudeBonuses(ascendance?.bonusRaciaux),
      parseAptitudeBonuses(ascendance?.malusRaciaux),
      structuredAptitudeBonuses(race?.aptitudes),
      structuredAptitudeBonuses(ascendance?.aptitudes),
      choiceAptitudeBonuses(race),
      choiceAptitudeBonuses(ascendance),
    ),
    classes: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(classDef?.competenceInnee),
      ...(classDef?.competencesPassives ?? []).map(parseAptitudeBonuses),
      parseAptitudeBonuses(subclass?.passifsSousClasse),
      ...(subclass?.competencesPassives ?? []).map(parseAptitudeBonuses),
      choiceAptitudeBonuses(subclass),
    ),
    historique: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(historique?.amelioration),
      structuredAptitudeBonuses(historique?.aptitudes),
    ),
    origine: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(origin?.amelioration),
      structuredAptitudeBonuses(origin?.aptitudes),
    ),
  };
}

export function getAptitudeBreakdown(char, aptitude) {
  const apt = typeof aptitude === 'string'
    ? APTITUDES.find((item) => item.nom === aptitude)
    : aptitude;
  const details = char?.aptitudes?.[apt?.nom] ?? {};
  const computed = getComputedAptitudeBonuses(char);
  const statMod = getStatBreakdown(char, apt?.stat).total;
  const m2 = details.m2 ?? false;
  const m1 = details.m1 ?? false;
  const raciaux = computed.raciaux[apt?.nom] ?? Number(details.raciaux ?? 0);
  const classes = computed.classes[apt?.nom] ?? Number(details.classes ?? 0);
  const historique = computed.historique[apt?.nom] ?? Number(details.historique ?? 0);
  const origine = computed.origine[apt?.nom] ?? Number(details.origine ?? 0);
  const malus = Number(details.malus ?? 0);
  const bonus = Number(details.bonus ?? 0);
  // Clé de recherche identique à celle posée par le formulaire d'objet
  // (ItemPanel.jsx : aptitude.key || slugifyKey(aptitude.nom)).
  const objet = getEquippedItemAptitudeSum(char, apt?.key || slugifyLocal(apt?.nom || ''));

  return {
    aptitude: apt,
    statMod,
    m2,
    m1,
    raciaux,
    classes,
    historique,
    origine,
    malus,
    bonus,
    objet,
    total: statMod + (m2 ? 2 : 0) + (m1 ? 1 : 0) + raciaux + classes + historique + origine - malus + bonus + objet,
  };
}

// classDefOverride = classe résolue avec les données admin (custom + statique
// fusionnées, voir getCombinedClassDefinition côté appelant) — getClassDefinition
// seul ne lit que CLASSES, un tableau volontairement vide (voir gameData.js),
// donc `base` retombait à 0 et tout le vie.max de départ (créé au niveau 0,
// sans aucun level up) s'affichait à tort sous "Levelup".
export function getResourceData(char, classDefOverride = null) {
  const classDef = classDefOverride || getClassDefinition(char) || {};

  return [
    { key: 'vie', title: 'Vitalité', short: 'DDV', pool: char?.vie, base: classDef.vie || 0 },
    { key: 'mana', title: 'Maîtrise', short: 'DDM', pool: char?.mana, base: classDef.mana || 0 },
    { key: 'endu', title: 'Endurance', short: 'DDE', pool: char?.endu, base: classDef.endu || 0 },
  ].map((resource) => {
    const pool = resource.pool ?? { actuel: 0, max: 0 };
    const max = Number(pool.max ?? 0);
    const actuel = Number(pool.actuel ?? max);

    return {
      ...resource,
      pool: { actuel, max },
      // Rien n'alimente encore un vrai bonus permanent de ressource (race,
      // objet, effet...) — seul le gain de dé de niveau existe (`levelup`).
      // `bonus` reprenait par erreur la même formule que `levelup`,
      // affichant deux fois le même gain sous deux étiquettes différentes.
      bonus: 0,
      tempBonus: Number(pool.tempBonus ?? 0),
      malus: 0,
      tempMalus: Number(pool.tempMalus ?? 0),
      levelup: Math.max(0, max - resource.base),
      lost: Math.max(0, max - actuel),
    };
  });
}

function parseLanguageRule(line) {
  if (!line) return null;
  const name = String(line).match(/\[\s*([^\]]+?)\s*\]/)?.[1]?.trim();
  if (!name) return null;

  const meta = String(line).match(/\(([^)]+)\)/)?.[1] ?? '';
  const bonus = meta.match(/[+-]\s*\d+/)?.[0]?.replace(/\s+/g, '') ?? 'Complet';
  const type = meta
    .replace(/[+-]\s*\d+/g, '')
    .replace(/complet/gi, 'Ascendance')
    .trim() || 'Bonus';

  return { nom: name, type, bonus };
}

// La langue accordée est désormais choisie via un picker structuré
// (langueAccordee: {key, nom, complet, bonus}, voir AscendancesPanel.jsx)
// plutôt qu'écrite en texte libre — parseLanguageRule/`langue` restent en
// lecture seule pour les ascendances créées avant ce picker.
function resolveLanguageGrant(source) {
  if (source?.langueAccordee?.nom) {
    const { nom, complet, bonus } = source.langueAccordee;
    return { nom, type: 'Ascendance', bonus: complet ? 'Complet' : `+${Math.abs(Number(bonus) || 0)}` };
  }
  return parseLanguageRule(source?.langue);
}

// ascendanceDefOverride = ascendance résolue avec les données admin (custom +
// statique, voir getCombinedAscendanceBase côté appelant) — sans ça,
// getAscendanceDefinition seul ne lit que ASCENDANCE_DATA, un tableau
// volontairement vide (voir gameData.js), donc la langue d'ascendance ne
// ressortait jamais. Le lookup PROVENANCE_DATA.find(...ascendance) qu'il
// remplace cherchait en plus dans le mauvais catalogue (Provenance, pas
// Ascendance) par-dessus le marché.
export function getComputedLanguageRows(char, ascendanceDefOverride = null) {
  const ascendanceDef = ascendanceDefOverride || getAscendanceDefinition(char) || {};
  return [
    resolveLanguageGrant(getProvenanceDefinition(char)),
    resolveLanguageGrant(ascendanceDef),
  ].filter(Boolean);
}

export function getComputedResistanceBonuses(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const classDef = getClassDefinition(char);
  const subclass = getSubclassDefinition(char);
  const resistanceCatalog = getResistanceCatalog({
    customResistanceEntries: useAdminStore.getState().customResistanceEntries,
    customResistanceCategories: useAdminStore.getState().customResistanceCategories,
  });
  // Piège signe : le total résistance fait `raciaux + classes - malus + ...`
  // (voir getResistanceBreakdown) — la colonne 'malus' est déjà soustraite.
  // Un coût "Choix du joueur" (montant négatif) doit donc rester dans la
  // même colonne que le gain ('raciaux'/'classes'), jamais dans 'malus'
  // sous peine de doubler l'effet inverse (augmenter la résistance au lieu
  // de la réduire).
  const choiceResistanceBonuses = (sourceDef, column) => {
    const bonuses = {};
    getBonusChoiceContributionsFor(sourceDef, char, 'resistance').forEach((c) => {
      const entry = findCatalogEntry(resistanceCatalog, c.key);
      if (entry) addResistanceBonus(bonuses, entry.label, c.amount, column);
    });
    return bonuses;
  };

  return mergeResistanceMaps(
    parseResistanceBonuses(race?.competenceRaciale, 'raciaux'),
    parseResistanceBonuses(race?.bonusRaciaux, 'raciaux'),
    parseResistanceBonuses(ascendance?.competenceAscendance, 'raciaux'),
    parseResistanceBonuses(ascendance?.bonusRaciaux, 'raciaux'),
    parseResistanceBonuses(ascendance?.malusRaciaux, 'raciaux'),
    parseResistanceBonuses(classDef?.competenceInnee, 'classes'),
    ...(classDef?.competencesPassives ?? []).map((text) => parseResistanceBonuses(text, 'classes')),
    parseResistanceBonuses(subclass?.passifsSousClasse, 'classes'),
    ...(subclass?.competencesPassives ?? []).map((text) => parseResistanceBonuses(text, 'classes')),
    structuredResistanceBonuses(race?.resistanceBonuses, 'raciaux'),
    structuredResistanceBonuses(ascendance?.resistanceBonuses, 'raciaux'),
    choiceResistanceBonuses(race, 'raciaux'),
    choiceResistanceBonuses(ascendance, 'raciaux'),
    choiceResistanceBonuses(subclass, 'classes'),
  );
}

export function getResistanceBreakdown(char, groupKey, itemName) {
  const manual = char?.resistances?.[groupKey]?.[itemName] ?? {};
  const computed = getComputedResistanceBonuses(char)?.[groupKey]?.[itemName] ?? {};
  const hasComputed = Object.keys(computed).length > 0;
  const raciaux = computed.raciaux ?? (hasComputed ? 0 : Number(manual.raciaux ?? 0));
  const classes = computed.classes ?? (hasComputed ? 0 : Number(manual.classes ?? 0));
  const malus = computed.malus ?? (hasComputed ? 0 : Number(manual.malus ?? 0));
  const bonus = Number(manual.bonus ?? 0);
  const mtemp = Number(manual.mtemp ?? 0);
  const btemp = Number(manual.btemp ?? 0);
  // Clé identique à celle posée par le formulaire d'objet (ItemPanel.jsx :
  // `entry.key || slugifyKey(entry.label)` — sans préfixe de groupe, car
  // RESISTANCES_DEF est vide en pratique : seule la branche customResistanceEntries
  // alimente jamais ce picker, et elle ne préfixe pas la clé par le groupKey).
  const objet = getEquippedItemResistanceSum(char, slugifyLocal(itemName));

  return {
    raciaux,
    classes,
    malus,
    bonus,
    mtemp,
    btemp,
    objet,
    total: raciaux + classes - malus + bonus - mtemp + btemp + objet,
  };
}

function getRuleTexts(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const classDef = getClassDefinition(char);
  const subclass = getSubclassDefinition(char);

  return [
    race?.competenceRaciale,
    race?.bonusRaciaux,
    ascendance?.competenceAscendance,
    ascendance?.bonusRaciaux,
    ascendance?.malusRaciaux,
    ...(classDef?.competencesPassives ?? []),
    subclass?.passifsSousClasse,
    ...(subclass?.competencesPassives ?? []),
  ].filter(Boolean).join('\n');
}

function addNamedBonus(target, key, amount) {
  target[key] = (target[key] ?? 0) + amount;
}

export function getCombatRuleBonuses(char) {
  const text = getRuleTexts(char);
  const bonuses = {
    initiative: 0,
    attackPhysical: 0,
    attackMagic: 0,
    attackDistance: 0,
    defensePhysical: 0,
    defenseMagic: 0,
    esquive: 0,
  };

  const rules = [
    ['initiative', /(?:bonus de\s*)?\+(\d+)\s+(?:en|à|a)\s+initiative|augmente l['’]initiative[^.]{0,80}?de\s+\+(\d+)/gi],
    ['attackPhysical', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s*attaque physique/gi],
    ['attackMagic', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s*attaque magique/gi],
    ['attackDistance', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s*attaque (?:à|a) distance/gi],
    ['defensePhysical', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s+d[ée]fense physique/gi],
    ['defenseMagic', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s+d[ée]fense magique/gi],
    ['esquive', /(?:bonus de|gagne|obtient)?\s*\+(\d+)\s+(?:en|à|a)?\s+esquive/gi],
  ];

  rules.forEach(([key, regex]) => {
    for (const match of text.matchAll(regex)) {
      addNamedBonus(bonuses, key, Number(match[1] ?? match[2] ?? 0));
    }
  });

  return bonuses;
}

export function getLinearTotal(source, fallbackBase = 0) {
  const data = source ?? {};
  const base = Number(data.base ?? fallbackBase);
  const bonus = Number(data.bonus ?? 0);
  const objectBonus = Number(data.objectBonus ?? 0);
  const tempBonus = Number(data.tempBonus ?? 0);
  const malus = Number(data.malus ?? 0);
  const objectMalus = Number(data.objectMalus ?? 0);
  const tempMalus = Number(data.tempMalus ?? 0);

  return {
    base,
    bonus,
    objectBonus,
    tempBonus,
    malus,
    objectMalus,
    tempMalus,
    total: base + bonus + objectBonus + tempBonus - malus - objectMalus - tempMalus,
  };
}

export function getMovementData(char) {
  // objectBonus vient exclusivement de l'équipement porté (ex: bottes +4) —
  // voir getEquippedItemEffectSum juste en dessous, même mécanisme déjà
  // utilisé pour les stats de combat. Rien d'autre n'alimente ce champ, donc
  // on l'écrase plutôt que de l'additionner à une valeur stockée.
  return getLinearTotal({
    ...(char?.deplacement ?? {}),
    objectBonus: getEquippedItemEffectSum(char, 'deplacement'),
  }, 0);
}

export function getCarryingData(char) {
  // base vient de resolveCarryingBase (CharacterListPage.jsx, injecté dans
  // une copie de char avant l'appel — même schéma que getMovementData /
  // resolveMovementBase) : classe, remplacée par la sous-classe si elle
  // coche "Remplacer les emplacements de la classe parente". objectBonus
  // vient de l'équipement porté (ex: un sac +10), même mécanisme que le
  // déplacement.
  return getLinearTotal({
    ...(char?.emplacements ?? {}),
    objectBonus: getEquippedItemEffectSum(char, 'emplacements'),
  }, 0);
}

// Un item placé en inventaire/équipement est une COPIE de l'item catalogue
// au moment où il a été ajouté (voir addItemToSlot, CharacterListPage.jsx),
// pas une référence live — sans ça, deux personnages avec le "même" item
// pourraient diverger. Mais ça veut dire qu'éditer un item dans l'admin
// (ex: +15 emplacements sur un sac) n'était PAS répercuté sur les copies
// déjà en jeu. On résout donc les champs "modèle" (effects, nom, desc,
// equipSlot, rareté, icône, deuxMains...) depuis le catalogue courant à
// chaque lecture, en ne gardant du côté instance que ce qui est propre à
// cet exemplaire précis (id, quantité, position en case).
export function resolveLiveItem(item) {
  if (!item?.sourceItemId) return item;
  const customItems = useAdminStore.getState().customItems ?? [];
  const catalogItem = customItems.find((entry) => String(entry.id) === String(item.sourceItemId));
  if (!catalogItem) return item;
  return {
    ...catalogItem,
    id: item.id,
    sourceItemId: item.sourceItemId,
    qte: item.qte,
    slotIndex: item.slotIndex,
  };
}

// Somme, sur tout l'équipement porté, la valeur d'un effet "simple" donné
// (voir ITEM_SIMPLE_EFFECTS dans pages/admin/itemUtils.js — attaquePhysique,
// esquive, initiative, etc.) : ce sont ces items qui alimentent maintenant
// Bonus/Malus de "Stats de combat", pas une saisie manuelle.
export function getEquippedItemEffectSum(char, effectKey) {
  const equipement = char?.equipement ?? {};
  const items = [...Object.values(equipement), ...getActiveGadgetItems(char)];
  return items.reduce((sum, item) => (
    sum + Number(resolveLiveItem(item)?.effects?.simple?.[effectKey] ?? 0)
  ), 0);
}

// Même principe pour les bonus de caractéristique (effects.stats.FOR, etc.)
// posés sur un objet depuis l'admin (ItemPanel.jsx) — alimente Bonus/Malus
// Objet dans getStatBreakdown, jusque-là toujours à 0 (case morte).
// Les sacs équipés (char.sacsEquipes, jusqu'à 4 emplacements — voir le
// bouton "Sac" de l'inventaire) fonctionnent comme char.equipement : équiper
// un sac le retire de l'inventaire (une seule case en moins), le slot stocke
// directement une copie de l'item plutôt qu'un id à résoudre.
export function getEquippedBagItems(char) {
  const slots = char?.sacsEquipes ?? [];
  return slots.filter(Boolean).map(resolveLiveItem);
}

export function getEquippedBagEffectSum(char, effectKey) {
  return getEquippedBagItems(char).reduce((sum, item) => (
    sum + Number(item?.effects?.simple?.[effectKey] ?? 0)
  ), 0);
}

// "Gadgets" : objets equipSlot 'custom' réservés à une race/ascendance (voir
// BLANK_ITEM_CLASS.allowedRaces, bouton dédié dans EquipementPanel). Le
// nombre d'emplacements est la somme de celui de la race et de celui de
// l'ascendance (chacune un simple champ MJ, BLANK_RACE/BLANK_ASCENDANCE.gadgetSlots).
export function getGadgetSlotCount(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  return Number(race?.gadgetSlots ?? 0) + Number(ascendance?.gadgetSlots ?? 0);
}

// Le MJ nomme ce mécanisme lui-même par race/ascendance (ex: "Mutation" pour
// une race, "Gadget" pour une autre — voir BLANK_RACE/BLANK_ASCENDANCE.
// gadgetSlotsLabel) plutôt qu'un terme générique imposé partout. L'ascendance,
// plus spécifique, l'emporte sur la race si les deux en définissent un ; à
// défaut des deux, "Objets raciaux" sert de terme générique de repli.
export function getGadgetSlotLabel(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const ascendanceLabel = String(ascendance?.gadgetSlotsLabel ?? '').trim();
  const raceLabel = String(race?.gadgetSlotsLabel ?? '').trim();
  return ascendanceLabel || raceLabel || 'Objets raciaux';
}

// Catégorie d'item (customItemCategories.id) dont le contenu remplit les
// emplacements du personnage — voir BLANK_RACE/BLANK_ASCENDANCE.
// gadgetItemCategoryId. Même précédence que le nom : l'ascendance (plus
// spécifique) l'emporte sur la race si elle en définit une.
export function getGadgetItemCategoryId(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  return ascendance?.gadgetItemCategoryId ?? race?.gadgetItemCategoryId ?? null;
}

// Comme sacsEquipes : équiper un gadget le retire de l'inventaire, le slot
// stocke directement une copie de l'item plutôt qu'un id à résoudre.
export function getEquippedGadgetItems(char) {
  const slots = char?.gadgetsEquipes ?? [];
  return slots.filter(Boolean).map(resolveLiveItem);
}

// Un gadget passif (item.actif === false) applique toujours son bonus une
// fois équipé, comme n'importe quel objet équipé. Un gadget actif
// (item.actif === true) n'y contribue que si le joueur l'a explicitement
// activé sur sa fiche (char.gadgetsActifs[item.id] === true, voir
// toggleGadgetActive dans characterStore.js) — sinon aucun bonus.
export function getActiveGadgetItems(char) {
  return getEquippedGadgetItems(char).filter((item) => !item.actif || char?.gadgetsActifs?.[item.id]);
}

export function getEquippedItemStatSum(char, statKey) {
  const equipement = char?.equipement ?? {};
  const items = [...Object.values(equipement), ...getActiveGadgetItems(char)];
  return items.reduce((sum, item) => (
    sum + Number(resolveLiveItem(item)?.effects?.stats?.[statKey] ?? 0)
  ), 0);
}

// Un item stocke ses bonus d'aptitude/résistance sous forme de liste
// `{ key, value }` (voir ItemPanel.jsx : aptitudeKey = slugifyKey(nom),
// resistanceKey = `${groupKey}.${slugifyKey(label)}`) plutôt qu'un objet
// indexé par clé comme `effects.stats` — d'où la recherche par `.find`.
export function getEquippedItemAptitudeSum(char, aptitudeKey) {
  if (!aptitudeKey) return 0;
  const equipement = char?.equipement ?? {};
  const items = [...Object.values(equipement), ...getActiveGadgetItems(char)];
  return items.reduce((sum, item) => {
    const row = (resolveLiveItem(item)?.effects?.aptitudes ?? []).find((entry) => entry.key === aptitudeKey);
    return sum + Number(row?.value ?? 0);
  }, 0);
}

export function getEquippedItemResistanceSum(char, resistanceKey) {
  if (!resistanceKey) return 0;
  const equipement = char?.equipement ?? {};
  const items = [...Object.values(equipement), ...getActiveGadgetItems(char)];
  return items.reduce((sum, item) => {
    const row = (resolveLiveItem(item)?.effects?.resistances ?? []).find((entry) => entry.key === resistanceKey);
    return sum + Number(row?.value ?? 0);
  }, 0);
}

export function getCombatStats(char) {
  const str = getStatBreakdown(char, 'FOR').total;
  const dex = getStatBreakdown(char, 'DEX').total;
  const con = getStatBreakdown(char, 'CON').total;
  const int = getStatBreakdown(char, 'INT').total;
  const sag = getStatBreakdown(char, 'SAG').total;
  const cha = getStatBreakdown(char, 'CHA').total;
  const ruleBonuses = getCombatRuleBonuses(char);
  const details = char?.combatStatsDetails ?? {};

  // autoBonus : calcul automatique inchangé (stats + bonus de règles de
  // montée de niveau). Bonus/Malus affichés = autoBonus + l'effet net de
  // l'équipement porté (itemKey, voir getEquippedItemEffectSum) — en
  // lecture seule, plus de saisie directe ici (voir DetailStats). Seuls
  // Bonus Temp./Malus Temp. (bonusTemp/malusTemp, char.combatStatsDetails)
  // restent modifiables à la main, pour un ajustement ponctuel du MJ.
  const rows = [
    { key: 'initiative', label: 'Initiative', base: 10, mod: dex, autoBonus: Math.max(0, cha) + ruleBonuses.initiative, itemKey: 'initiative' },
    { key: 'atkPhysique', label: 'Att. physique', base: 3, mod: str, autoBonus: Math.max(0, dex) + ruleBonuses.attackPhysical, itemKey: 'attaquePhysique' },
    { key: 'atkMagique', label: 'Att. magique', base: 2, mod: Math.max(int, sag, cha), autoBonus: ruleBonuses.attackMagic, itemKey: 'attaqueMagique' },
    { key: 'atkDistance', label: 'Att. distance', base: 3, mod: dex, autoBonus: ruleBonuses.attackDistance, itemKey: 'attaqueDistance' },
    { key: 'defPhysique', label: 'Déf. physique', base: 8, mod: con, autoBonus: ruleBonuses.defensePhysical, itemKey: 'resistancePhysique' },
    { key: 'defMagique', label: 'Déf. magique', base: 8, mod: sag, autoBonus: ruleBonuses.defenseMagic, itemKey: 'resistanceMagique' },
    { key: 'esquive', label: 'Esquive', base: 9, mod: dex, autoBonus: ruleBonuses.esquive, itemKey: 'esquive' },
  ];

  return rows.map((row) => {
    const detail = details[row.key] ?? {};
    const itemEffect = getEquippedItemEffectSum(char, row.itemKey);
    const bonus = row.autoBonus + Math.max(0, itemEffect);
    const malus = Math.max(0, -itemEffect);
    const bonusTemp = Number(detail.bonusTemp ?? 0);
    const malusTemp = Number(detail.malusTemp ?? 0);
    return {
      key: row.key,
      label: row.label,
      base: row.base,
      mod: row.mod,
      bonus,
      malus,
      bonusTemp,
      malusTemp,
      total: row.base + row.mod + bonus - malus + bonusTemp - malusTemp,
    };
  });
}

export function getChance(char) {
  return char?.chance ?? Math.max(0, modifier(char?.stats?.CHA ?? 10) + 3);
}
