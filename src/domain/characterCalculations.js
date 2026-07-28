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

const APTITUDE_LOOKUP = APTITUDES.reduce((lookup, aptitude) => {
  lookup[normalizeTextKey(aptitude.nom)] = aptitude.nom;
  return lookup;
}, Object.fromEntries(
  Object.entries(APTITUDE_ALIASES).map(([alias, aptitude]) => [normalizeTextKey(alias), aptitude]),
));

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

const RESISTANCE_LOOKUP = Object.entries(RESISTANCES_DEF).reduce((lookup, [groupKey, group]) => {
  group.items.forEach((item) => {
    lookup[normalizeTextKey(item)] = [groupKey, item];
  });
  return lookup;
}, Object.fromEntries(
  Object.entries(RESISTANCE_ALIASES).map(([alias, target]) => [normalizeTextKey(alias), target]),
));

export function getClassDefinition(charOrClassName) {
  const className = typeof charOrClassName === 'string'
    ? charOrClassName
    : charOrClassName?.classe;

  return CLASSES.find((c) => c.nom === className) ?? null;
}

export function getRaceDefinition(charOrRaceName) {
  const raceName = typeof charOrRaceName === 'string'
    ? charOrRaceName
    : charOrRaceName?.race;

  return RACE_DATA.find((race) => race.nom === raceName) ?? null;
}

export function getAscendanceDefinition(charOrAscendanceName) {
  const ascendanceName = typeof charOrAscendanceName === 'string'
    ? charOrAscendanceName
    : charOrAscendanceName?.ascendance;

  return ASCENDANCE_DATA.find((ascendance) => ascendance.nom === ascendanceName) ?? null;
}

export function getOriginDefinition(charOrOriginName) {
  const originName = typeof charOrOriginName === 'string'
    ? charOrOriginName
    : charOrOriginName?.origine;

  return ORIGIN_DATA.find((origin) => origin.nom === originName) ?? null;
}

export function getHistoriqueDefinition(charOrHistoriqueName) {
  const historiqueName = typeof charOrHistoriqueName === 'string'
    ? charOrHistoriqueName
    : charOrHistoriqueName?.historique;

  return HISTORIQUE_DATA.find((historique) => historique.nom === historiqueName) ?? null;
}

export function getProvenanceDefinition(charOrProvenanceName) {
  const provenanceName = typeof charOrProvenanceName === 'string'
    ? charOrProvenanceName
    : charOrProvenanceName?.provenance;

  return PROVENANCE_DATA.find((provenance) => provenance.nom === provenanceName) ?? null;
}

export function getSubclassDefinition(charOrSubclassName) {
  const subclassName = typeof charOrSubclassName === 'string'
    ? charOrSubclassName
    : charOrSubclassName?.sousClasse;

  return SUBCLASS_DATA.find((subclass) => subclass.nom === subclassName) ?? null;
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

  return APTITUDE_LOOKUP[key] ?? null;
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

  return RESISTANCE_LOOKUP[normalized] ?? null;
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

export function getComputedStatBonuses(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);

  return mergeBonusMaps(
    // Les malus raciaux en texte sont souvent contextuels. On ne les applique pas
    // automatiquement tant qu'ils ne sont pas structurés dans le référentiel.
    parseStatBonuses(race?.bonusRaciaux, { includeNegative: false }),
    parseStatBonuses(ascendance?.competenceAscendance),
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
  const bonusObjet = Number(details.bonusObjet ?? 0);
  const malusObjet = Number(details.malusObjet ?? 0);
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

  return {
    raciaux: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(race?.competenceRaciale),
      parseAptitudeBonuses(race?.bonusRaciaux),
      parseAptitudeBonuses(ascendance?.competenceAscendance),
      parseAptitudeBonuses(ascendance?.bonusRaciaux),
      parseAptitudeBonuses(ascendance?.malusRaciaux),
    ),
    classes: mergeAptitudeBonusMaps(
      parseAptitudeBonuses(classDef?.competenceInnee),
      ...(classDef?.competencesPassives ?? []).map(parseAptitudeBonuses),
      parseAptitudeBonuses(subclass?.passifsSousClasse),
      ...(subclass?.competencesPassives ?? []).map(parseAptitudeBonuses),
    ),
    historique: parseAptitudeBonuses(historique?.amelioration),
    origine: parseAptitudeBonuses(origin?.amelioration),
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
    total: statMod + (m2 ? 2 : 0) + (m1 ? 1 : 0) + raciaux + classes + historique + origine - malus + bonus,
  };
}

export function getResourceData(char) {
  const classDef = getClassDefinition(char) ?? {};

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

export function getComputedLanguageRows(char) {
  return [
    parseLanguageRule(getProvenanceDefinition(char)?.langue),
    parseLanguageRule(PROVENANCE_DATA.find((item) => item.nom === char?.ascendance)?.langue),
  ].filter(Boolean);
}

export function getComputedResistanceBonuses(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const classDef = getClassDefinition(char);
  const subclass = getSubclassDefinition(char);

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

  return {
    raciaux,
    classes,
    malus,
    bonus,
    mtemp,
    btemp,
    total: raciaux + classes - malus + bonus - mtemp + btemp,
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

// Somme, sur tout l'équipement porté, la valeur d'un effet "simple" donné
// (voir ITEM_SIMPLE_EFFECTS dans pages/admin/itemUtils.js — attaquePhysique,
// esquive, initiative, etc.) : ce sont ces items qui alimentent maintenant
// Bonus/Malus de "Stats de combat", pas une saisie manuelle.
export function getEquippedItemEffectSum(char, effectKey) {
  const equipement = char?.equipement ?? {};
  return Object.values(equipement).reduce((sum, item) => (
    sum + Number(item?.effects?.simple?.[effectKey] ?? 0)
  ), 0);
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
