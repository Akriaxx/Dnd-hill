// Registre des domaines pour "Choix du joueur" (voir BonusChoicesEditor,
// AdminShared.jsx, et le picker joueur dans CharacterListPage.jsx).
//
// Volontairement séparé de pages/admin/adminUtils.js : characterCalculations.js
// (couche domaine) ne doit jamais dépendre de pages/admin (même règle déjà
// appliquée pour slugifyLocal/getAptitudeLookup/getResistanceLookup dans ce
// fichier). Les catalogues APTITUDES/APT_CATEGORIES/RESISTANCES_DEF de
// gameData.js sont vides par conception (tout est admin-authored) — inutile
// de les fusionner ici, contrairement à buildAptitudeOptions/buildResistanceOptions
// (RacesPanel.jsx) qui gardent cette fusion pour d'autres pickers plus riches.
//
// Ajouter un domaine (langue, connaissance…) plus tard = une entrée dans
// BONUS_CHOICE_DOMAINS/DOMAIN_LABELS + un getXCatalog() ici, rien d'autre à
// changer dans BonusChoicesEditor/BonusChoiceBuilderPanel/CharacterListPage.jsx.

const asArray = (value) => (Array.isArray(value) ? value : []);

// `aptitude-case1`/`aptitude-case2` sont des variantes du domaine Aptitude
// pour le système existant de cases +1/+2 (creationAptitudesPlusOne/PlusTwo,
// CharacterListPage.jsx) : chaque case cochée vaut un montant FIXE (+1 ou
// +2, jamais cumulable sur une même aptitude), par opposition au domaine
// "aptitude" normal où Valeur est un pool de points librement empilables.
// `catalogDomain` indique quel catalogue réutiliser ; `fixedAmount` +
// `maxPerTarget: 1` changent l'interprétation de "Valeur" (nombre de cases
// à cocher, pas un total de points) — voir resolveSlotAllocation.
export const BONUS_CHOICE_DOMAINS = [
  { key: 'caracteristique', label: 'Caractéristique' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'aptitude-case1', label: 'Aptitude (case +1)', catalogDomain: 'aptitude', fixedAmount: 1, maxPerTarget: 1 },
  { key: 'aptitude-case2', label: 'Aptitude (case +2)', catalogDomain: 'aptitude', fixedAmount: 2, maxPerTarget: 1 },
  { key: 'resistance', label: 'Résistance' },
];

export const DOMAIN_LABELS = Object.fromEntries(BONUS_CHOICE_DOMAINS.map((d) => [d.key, d.label]));
const DOMAIN_META = Object.fromEntries(BONUS_CHOICE_DOMAINS.map((d) => [d.key, d]));
export const getDomainMeta = (domainKey) => DOMAIN_META[domainKey] || null;

export function getCaracteristiqueCatalog(customCaracteristiques) {
  return asArray(customCaracteristiques)
    .slice()
    .sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0))
    .map((c) => ({ key: c.cle, label: c.nom, group: null }));
}

// Piège : aptitude.categoryKey ET aptitude.cat sont tous les deux posés à la
// même valeur par AptitudesPanel.jsx (dual-field legacy) — on lit les deux.
export function getAptitudeCatalog({ customAptitudes, customAptitudeCategories }) {
  const categories = asArray(customAptitudeCategories);
  const categoryLabel = (categoryKey) => categories.find((c) => c.key === categoryKey)?.nom || categoryKey;
  return asArray(customAptitudes).map((a) => ({
    key: a.key,
    label: a.nom,
    group: categoryLabel(a.categoryKey || a.cat),
  }));
}

// Piège : les résistances utilisent `.label`, pas `.nom`, pour l'entrée ET
// la catégorie (seul catalogue de ce type dans toute l'admin). Clé composite
// `categoryKey:key` : deux catégories peuvent contenir un libellé identique
// (ex: "Bloqué" en Physique et en Malédiction, voir seed-resistances), une
// clé simple les confondrait.
export function getResistanceCatalog({ customResistanceEntries, customResistanceCategories }) {
  const categories = asArray(customResistanceCategories);
  const categoryLabel = (categoryKey) => categories.find((c) => c.key === categoryKey)?.label || categoryKey;
  return asArray(customResistanceEntries).map((entry) => ({
    key: `${entry.categoryKey}:${entry.key}`,
    label: entry.label,
    group: categoryLabel(entry.categoryKey),
  }));
}

const CATALOG_BUILDERS = {
  caracteristique: (slices) => getCaracteristiqueCatalog(slices.customCaracteristiques),
  aptitude: (slices) => getAptitudeCatalog(slices),
  resistance: (slices) => getResistanceCatalog(slices),
};

export function getDomainCatalog(domainKey, slices) {
  const builder = CATALOG_BUILDERS[domainKey];
  return builder ? builder(slices) : [];
}

// `domainCatalogs` (construit par les appelants, ex: {caracteristique:[],
// aptitude:[], resistance:[]}) n'a une entrée que par catalogue réel — les
// domaines "variantes" (aptitude-case1/case2) n'ont pas leur propre clé,
// ils réutilisent le catalogue de `catalogDomain`. Toujours passer par cette
// fonction plutôt que `domainCatalogs[domainKey]` directement.
export function resolveDomainCatalog(domainCatalogs, domainKey) {
  const meta = getDomainMeta(domainKey);
  return domainCatalogs?.[meta?.catalogDomain || domainKey] || [];
}

export function findCatalogEntry(catalog, key) {
  if (!key) return null;
  return asArray(catalog).find((entry) => entry.key === key) || null;
}

export const formatSigned = (n) => {
  const value = Number(n) || 0;
  return value >= 0 ? `+${value}` : `${value}`;
};

export const sumAllocation = (allocation) => Object.values(allocation || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);

// slot = { mode, domain, valeur, cible } ; allocation = {[catalogKey]: points}
// (ignoré hors mode 'open'). Retourne [{key, amount}].
// "Valeur" est TOUJOURS un montant, dans les deux modes — en mode 'precise'
// c'est le montant accordé sur la cible verrouillée par le MJ ; en mode
// 'open' c'est un POOL de points que le joueur répartit librement entre
// autant de cibles qu'il veut dans le catalogue du domaine (tout sur une
// seule, ou réparti sur plusieurs) — pas "une seule cible au choix".
// Domaines à `fixedAmount` (ex: aptitude-case1/case2) : "Valeur" devient un
// nombre de CASES (pas de points), chaque case cochée valant toujours
// `fixedAmount`, jamais cumulable deux fois sur la même cible (maxPerTarget).
export function resolveSlotAllocation(slot, allocation) {
  if (!slot) return [];
  if (slot.mode === 'precise') {
    return slot.cible?.key ? [{ key: slot.cible.key, amount: Number(slot.valeur) || 0 }] : [];
  }
  const fixedAmount = getDomainMeta(slot.domain)?.fixedAmount;
  return Object.entries(allocation || {})
    .filter(([, points]) => Number(points) > 0)
    .map(([key, points]) => ({ key, amount: fixedAmount != null ? fixedAmount : Number(points) }));
}

// def = race/ascendance/subclass.bonusChoices (array de Choix) ; answers =
// char.bonusChoices ({[groupKey]: {branchIndex, gainAllocation, costAllocation}}).
// Retourne [{domain, key, amount}] — les contributions du coût sont déjà
// négatives, prêtes à être additionnées telles quelles.
export function resolveBonusChoiceContributions(def, answers) {
  return asArray(def).flatMap((group) => {
    const answer = answers?.[group.key];
    const branch = group.branches?.[answer?.branchIndex];
    if (!branch) return [];
    const gain = resolveSlotAllocation(branch.gain, answer.gainAllocation).map((c) => ({ domain: branch.gain.domain, ...c }));
    const cost = branch.cost
      ? resolveSlotAllocation(branch.cost, answer.costAllocation).map((c) => ({ domain: branch.cost.domain, key: c.key, amount: -c.amount }))
      : [];
    return [...gain, ...cost];
  });
}

// Validation à la soumission de la création de personnage : une branche doit
// être choisie, et chaque slot en mode 'open' doit avoir son pool de points
// entièrement réparti (le mode 'precise' n'a rien à répartir, la cible est
// déjà verrouillée).
export function isBonusChoiceAnswerComplete(group, answer) {
  const branch = group?.branches?.[answer?.branchIndex];
  if (!branch) return false;
  const slotComplete = (slot, allocation) => !slot || slot.mode === 'precise' || sumAllocation(allocation) === (Number(slot.valeur) || 0);
  return slotComplete(branch.gain, answer.gainAllocation) && slotComplete(branch.cost, answer.costAllocation);
}

// Texte lisible pour les boutons de branche (joueur) et les cartes résumé
// (MJ) : "Force +2" (precise) ou "+3 à répartir en Aptitude" (open).
export function describeSlot(slot, catalog) {
  if (!slot || !slot.domain) return '';
  const domainLabel = DOMAIN_LABELS[slot.domain] || slot.domain;
  if (slot.mode === 'precise') {
    const entry = findCatalogEntry(catalog, slot.cible?.key);
    const label = entry?.label || slot.cible?.label || '—';
    return `${label} ${formatSigned(slot.valeur)}`;
  }
  const fixedAmount = getDomainMeta(slot.domain)?.fixedAmount;
  if (fixedAmount != null) {
    const count = Number(slot.valeur) || 0;
    return `${count} case${count > 1 ? 's' : ''} de ${formatSigned(fixedAmount)} en ${domainLabel}`;
  }
  return `${formatSigned(slot.valeur)} à répartir en ${domainLabel}`;
}
