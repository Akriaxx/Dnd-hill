// Données par défaut du Grimoire (Rangs, Types, Zones) — partagées entre les
// panneaux admin (SpellRanksPanel, SpellTypesPanel, SpellZonesPanel) et le
// wizard joueur (GrimoireBook). Isolées dans un fichier sans composant pour
// ne pas casser le Fast Refresh.

// Les 6 paliers officiels du Niveau du Sort, avec leur progression de jeu
// (cibles/portée/dés/déplacement débloqués à chaque palier). Ces valeurs
// restent éditables par le MJ dans le panneau Rangs — ce sont des graines de
// données, pas des constantes verrouillées.
export const DEFAULT_SPELL_RANKS = [
  {
    id: 'spell-rank-mineur', key: 'mineur', value: 1, label: 'Mineur', couleur: '#8fbf8f', restrictLevel: null,
    maxCibles: 1, porteeCiblage: ['0 - 1', '0 - 5'], porteeZone: ['5 - 10'],
    dePrincipal: [1], deSecondaire: [2, 4], deplacementArpenteur: [1],
  },
  {
    id: 'spell-rank-moyen', key: 'moyen', value: 2, label: 'Moyen', couleur: '#7ec8c8', restrictLevel: null,
    maxCibles: 2, porteeCiblage: ['0 - 1', '0 - 5', '0 - 10'], porteeZone: ['5 - 10', '5 - 15'],
    dePrincipal: [1, 2, 3], deSecondaire: [2, 4, 6], deplacementArpenteur: [1],
  },
  {
    id: 'spell-rank-fort', key: 'fort', value: 3, label: 'Fort', couleur: '#c8a84a', restrictLevel: null,
    maxCibles: 3, porteeCiblage: ['0 - 1', '0 - 5', '0 - 10', '0 - 15'], porteeZone: ['5 - 10', '5 - 15', '5 - 20'],
    dePrincipal: [1, 2, 3, 4, 5], deSecondaire: [2, 4, 6, 8], deplacementArpenteur: [1, 2],
  },
  {
    id: 'spell-rank-majeur', key: 'majeur', value: 4, label: 'Majeur', couleur: '#d97a3a', restrictLevel: null,
    maxCibles: 4, porteeCiblage: ['0 - 1', '0 - 5', '0 - 10', '0 - 15', '0 - 20'], porteeZone: ['5 - 10', '5 - 15', '5 - 20', '5 - 25'],
    dePrincipal: [1, 2, 3, 4, 5, 6, 7], deSecondaire: [2, 4, 6, 8, 10], deplacementArpenteur: [1, 2, 3],
  },
  {
    id: 'spell-rank-eminent', key: 'eminent', value: 5, label: 'Éminent', couleur: '#b23a5a', restrictLevel: null,
    maxCibles: 5, porteeCiblage: ['0 - 1', '0 - 5', '0 - 10', '0 - 15', '0 - 20', '0 - 25'], porteeZone: ['5 - 10', '5 - 15', '5 - 20', '5 - 25', '5 - 30'],
    dePrincipal: [1, 2, 3, 4, 5, 6, 7, 8, 9], deSecondaire: [2, 4, 6, 8, 10, 12], deplacementArpenteur: [1, 2, 3, 4],
  },
  {
    id: 'spell-rank-prodigieux', key: 'prodigieux', value: 6, label: 'Prodigieux', couleur: '#7a3ab2', restrictLevel: null,
    maxCibles: 5, porteeCiblage: ['0 - 1', '0 - 5', '0 - 10', '0 - 15', '0 - 20', '0 - 25', '0 - 30'], porteeZone: ['5 - 10', '5 - 15', '5 - 20', '5 - 25', '5 - 30', '5 - 35'],
    dePrincipal: [1, 2, 3, 4, 5, 6, 7, 8, 9], deSecondaire: [2, 4, 6, 8, 10, 12, 20], deplacementArpenteur: [1, 2, 3, 4, 5],
  },
];

export const DEFAULT_SPELL_TYPES = [
  {
    id: 'spell-type-invocateur',
    key: 'invocateur',
    isDefault: true,
    nom: 'Invocateur',
    couleur: '#8b5cf6',
    modes: [],
    accroche: 'Invocation de créatures, alliés spectraux ou entités magiques.',
    description: "Un sort d'Invocateur fait apparaître une présence sur le terrain — créature, esprit ou construct — qui agit pour le lanceur. L'entité invoquée a ses propres capacités et sa propre durée de vie, distinctes du lanceur.",
    usages: ['Faire apparaître une créature ou un esprit combattant', 'Invoquer un allié temporaire pour soutenir le groupe', "Créer une entité qui bloque ou distrait l'ennemi", 'Invocation ponctuelle liée à un rituel ou un pacte'],
    contraintes: [
      "Doit préciser les statistiques ou le comportement de l'entité invoquée.",
      "La durée de vie ou la durée d'invocation doit être explicite.",
      "Si l'entité peut être invoquée plusieurs fois, préciser la limite (cooldown, coût croissant...).",
    ],
    champs: ["Nature de l'entité invoquée", 'Statistiques ou capacités', 'Durée', "Limite d'invocation"],
    sortie: 'Ex: invoque un loup spectral (10 PV, griffes 1d6) pendant 3 tours.',
  },
  {
    id: 'spell-type-transformateur',
    key: 'transformateur',
    isDefault: true,
    nom: 'Transformateur',
    couleur: '#a78bfa',
    modes: [],
    accroche: "Modification de la forme, de l'apparence ou de la nature d'une cible.",
    description: "Un sort de Transformateur altère ce qu'une chose est, pas ce qu'elle fait directement : il change la forme physique, l'apparence ou la nature intrinsèque d'un objet, d'un ennemi ou du lanceur lui-même.",
    usages: ['Changer sa propre forme (métamorphose, forme animale...)', 'Transformer un objet en un autre', "Altérer la nature d'un ennemi (pétrification, polymorphie...)", 'Modifier une propriété physique (taille, matière, texture)'],
    contraintes: [
      "Doit préciser la nouvelle forme ou l'effet exact de la transformation.",
      'Si la cible est un ennemi non consentant, préciser le jet de résistance.',
      'La durée ou la permanence de la transformation doit être indiquée.',
    ],
    champs: ['Cible', 'Nouvelle forme ou nature', 'Durée', 'Jet de résistance (si non consentant)'],
    sortie: 'Ex: transforme la cible en statue de pierre pendant 2 tours, sauf réussite d\'un jet de CON.',
  },
  {
    id: 'spell-type-arpenteur',
    key: 'arpenteur',
    isDefault: true,
    nom: 'Arpenteur',
    couleur: '#9d7cf5',
    modes: ['ciblage'],
    accroche: 'Déplacement, franchissement, vitesse et repositionnement.',
    description: "Un sort d'Arpenteur modifie la position, la mobilité ou les trajectoires. Il sert à traverser l'espace, accélérer un allié, fuir une zone ou atteindre un point normalement inaccessible.",
    usages: ['Téléportation courte ou longue', 'Bonus de déplacement', 'Dash, échange de position, rappel', 'Ignorer un terrain difficile'],
    contraintes: [
      'Doit définir une distance, une portée ou un nombre de cases.',
      "Ne produit pas de dégâts directs par défaut.",
      "Si le sort déplace une cible ennemie, il doit préciser le jet ou la défense utilisée.",
    ],
    champs: ["Cible ou point d'arrivée", 'Distance en cases', 'Durée du boost', 'Type de déplacement'],
    sortie: 'Ex: téléporte une cible consentante à 6 cases, ou donne +4 cases de déplacement pendant 1 tour.',
  },
  {
    id: 'spell-type-defenseur',
    key: 'defenseur',
    isDefault: true,
    nom: 'Défenseur',
    couleur: '#4ade80',
    modes: ['ciblage', 'zone'],
    accroche: 'Boucliers, barrières magiques et armures pour absorber les dégâts.',
    description: "Un sort de Défenseur ne soigne ni n'attaque : il empêche les dégâts d'arriver. Il pose un bouclier, une barrière ou renforce une armure, sur soi ou sur un allié.",
    usages: ['Bouclier absorbant un montant de dégâts', 'Barrière bloquant une zone ou une trajectoire', "Renforcement temporaire de l'armure ou de la défense", 'Protection contre un type de dégâts précis'],
    contraintes: [
      'Doit indiquer la valeur ou le montant absorbé.',
      'La durée de la protection doit être précisée.',
      'Si la protection est limitée à un type de dégâts, le préciser.',
    ],
    champs: ['Cible', 'Valeur absorbée ou bonus de défense', 'Durée', 'Type de dégâts concerné (optionnel)'],
    sortie: 'Ex: pose un bouclier absorbant 15 dégâts pendant 2 tours.',
  },
  {
    id: 'spell-type-renforceur',
    key: 'renforceur',
    isDefault: true,
    nom: 'Renforceur',
    couleur: '#22c55e',
    modes: ['ciblage', 'zone'],
    accroche: "Amélioration des capacités d'un allié : force, précision, efficacité.",
    description: "Un sort de Renforceur ne protège pas et ne soigne pas : il rend un allié (ou le lanceur) meilleur dans ce qu'il fait déjà — plus fort, plus précis, plus rapide à agir.",
    usages: ['Bonus temporaire à une caractéristique', "Bonus aux jets d'attaque ou de compétence", 'Amélioration de dégâts infligés', "Octroi d'une action ou d'une réaction supplémentaire"],
    contraintes: [
      'Doit préciser la caractéristique ou le jet amélioré et sa valeur.',
      'La durée du bonus doit être explicite.',
      'Si le sort cible plusieurs alliés, préciser le nombre maximum.',
    ],
    champs: ['Cible(s)', 'Effet ou bonus accordé', 'Valeur', 'Durée'],
    sortie: "Ex: +2 aux jets d'attaque et +1d4 dégâts pour un allié pendant 3 tours.",
  },
  {
    id: 'spell-type-soigneur',
    key: 'soigneur',
    isDefault: true,
    nom: 'Soigneur',
    couleur: '#58e6b8',
    modes: ['ciblage', 'zone'],
    accroche: 'Restauration des points de vie et élimination de la fatigue.',
    description: "Un sort de Soigneur restaure ce qui a été perdu : points de vie, endurance, ou état physique dégradé. C'est le pilier de la survie du groupe.",
    usages: ['Restauration de points de vie', "Élimination d'un état de fatigue ou d'épuisement", 'Stabilisation d\'une cible mourante', 'Soin sur zone pour plusieurs alliés'],
    contraintes: [
      'Doit définir une formule ou une valeur de soin.',
      "Si le sort retire un état (fatigue, saignement...), préciser lequel.",
      'Préciser si le soin cible une seule personne ou une zone.',
    ],
    champs: ['Cible ou zone', 'Formule ou valeur de soin', 'État retiré (optionnel)', 'Portée'],
    sortie: 'Ex: restaure 2d8 points de vie à une cible au contact.',
  },
  {
    id: 'spell-type-ravageur',
    key: 'ravageur',
    isDefault: true,
    nom: 'Ravageur',
    couleur: '#ff6b5f',
    modes: ['ciblage'],
    accroche: 'Dégâts de précision concentrés sur une cible unique.',
    description: "Un sort Ravageur frappe une seule cible avec force. Contrairement au Destructeur qui frappe une zone, le Ravageur concentre tous ses dégâts sur un adversaire clé.",
    usages: ['Dégâts directs sur cible unique', 'Coup critique ou coup de grâce', "Élimination rapide d'une cible prioritaire"],
    contraintes: [
      'Doit définir une formule de dégâts au format XdX.',
      'La cible doit être unique — pas de zone.',
      'Le type de dégâts et le jet de défense doivent être explicites.',
    ],
    champs: ['Formule de dégâts', 'Type de dégâts', 'Cible', 'Jet de défense'],
    sortie: 'Ex: inflige 3d8 dégâts perforants à une cible unique.',
  },
  {
    id: 'spell-type-destructeur',
    key: 'destructeur',
    isDefault: true,
    nom: 'Destructeur',
    couleur: '#ef4444',
    modes: ['zone'],
    accroche: 'Destruction massive frappant plusieurs ennemis sur une large surface.',
    description: "Un sort Destructeur frappe une zone entière plutôt qu'une cible unique. Il est pensé pour nettoyer un groupe d'adversaires au prix d'une portée ou d'une précision réduite.",
    usages: ['Dégâts de zone (explosion, rayon, cône, ligne)', "Nettoyage de groupes d'ennemis", 'Dégâts persistants sur une zone si règle spéciale'],
    contraintes: [
      'Doit définir une formule de dégâts au format XdX.',
      'La taille et la forme de la zone sont obligatoires.',
      'Le type de dégâts et le jet de défense doivent être explicites.',
    ],
    champs: ['Formule de dégâts', 'Type de dégâts', 'Zone (forme et portée)', 'Jet de défense'],
    sortie: 'Ex: zone en cône de 4 cases, 2d6 dégâts de feu à chaque cible touchée.',
  },
  {
    id: 'spell-type-saboteur',
    key: 'saboteur',
    isDefault: true,
    nom: 'Saboteur',
    couleur: '#dc2626',
    modes: ['ciblage', 'zone'],
    accroche: "Affaiblissement de l'ennemi par malus, poisons ou entraves.",
    description: "Un sort Saboteur ne cherche pas à détruire directement : il dégrade la capacité de l'ennemi à agir, par un malus, un poison ou une entrave physique ou magique.",
    usages: ['Malus à une caractéristique ou à un jet', 'Poison infligeant des dégâts sur la durée', 'Entrave (immobilisation, silence, aveuglement...)'],
    contraintes: [
      "Doit préciser le malus ou l'entrave exacte et sa valeur.",
      "La durée de l'effet doit être explicite.",
      "Si un jet de résistance permet d'éviter ou de réduire l'effet, le préciser.",
    ],
    champs: ['Cible', 'Effet ou malus infligé', 'Valeur', 'Durée', 'Jet de résistance'],
    sortie: "Ex: -2 à tous les jets d'attaque de la cible et poison infligeant 1d4/tour pendant 3 tours, sauf réussite d'un jet de CON.",
  },
];

// Coût en action d'un sort au moment de le lancer en combat.
export const DEFAULT_ACTION_TYPES = [
  { id: 'action-type-gratuite', key: 'gratuite', isDefault: true, label: 'Action Gratuite', couleur: '#7ec8c8', description: "Ne consomme aucune action du tour — peut être lancée en plus d'une action normale." },
  { id: 'action-type-simple', key: 'simple', isDefault: true, label: 'Action Simple', couleur: '#c8a84a', description: "Consomme une action standard du tour, la plus courante pour un sort." },
  { id: 'action-type-limitee', key: 'limitee', isDefault: true, label: 'Action Limitée', couleur: '#d97a3a', description: "Consomme l'unique action limitée du tour (un seul sort de ce type par tour)." },
  { id: 'action-type-limitee-2', key: 'limitee-2', isDefault: true, label: 'Action Limitée²', couleur: '#b23a5a', description: "Consomme une seconde réserve d'action limitée, distincte de la première — pour les personnages qui en disposent." },
];

// Sous-catégorie d'un sort, rattachée à un des 9 Types de sort (typeKey).
export const DEFAULT_SPECIALITES = [
  { id: 'specialite-sabotage-malediction', key: 'sabotage-malediction', isDefault: true, label: 'Sabotage - Malédiction', typeKey: 'saboteur', couleur: '#dc2626', description: 'Malus et entraves de nature occulte.' },
  { id: 'specialite-sabotage-elementaire', key: 'sabotage-elementaire', isDefault: true, label: 'Sabotage - Élémentaire', typeKey: 'saboteur', couleur: '#dc2626', description: 'Malus et entraves liés à un élément (feu, glace, foudre...).' },
  { id: 'specialite-sabotage-psychique', key: 'sabotage-psychique', isDefault: true, label: 'Sabotage - Psychique', typeKey: 'saboteur', couleur: '#dc2626', description: 'Malus et entraves agissant sur l\'esprit.' },
  { id: 'specialite-defense-physique', key: 'defense-physique', isDefault: true, label: 'Défense - Physique', typeKey: 'defenseur', couleur: '#4ade80', description: 'Protection contre les dégâts physiques.' },
  { id: 'specialite-defense-magique', key: 'defense-magique', isDefault: true, label: 'Défense - Magique', typeKey: 'defenseur', couleur: '#4ade80', description: 'Protection contre les dégâts magiques.' },
  { id: 'specialite-defense-etats', key: 'defense-etats', isDefault: true, label: 'Défense - Etats', typeKey: 'defenseur', couleur: '#4ade80', description: 'Protection contre les altérations d\'état.' },
  { id: 'specialite-augmentation', key: 'augmentation', isDefault: true, label: 'Augmentation', typeKey: 'renforceur', couleur: '#22c55e', description: 'Bonus temporaire aux capacités d\'un allié.' },
  { id: 'specialite-reduction', key: 'reduction', isDefault: true, label: 'Réduction', typeKey: 'renforceur', couleur: '#22c55e', description: 'Malus temporaire imposé à un ennemi — pendant écrit à revérifier avec le MJ.' },
  { id: 'specialite-guerisseur', key: 'guerisseur', isDefault: true, label: 'Guérisseur', typeKey: 'soigneur', couleur: '#58e6b8', description: 'Restauration directe de points de vie ou de ressource.' },
  { id: 'specialite-renforcement', key: 'renforcement', isDefault: true, label: 'Renforcement', typeKey: 'renforceur', couleur: '#22c55e', description: 'Amélioration durable d\'une capacité ou d\'un équipement.' },
];

export const SPELL_ZONE_COLUMNS = 11;
export const SPELL_ZONE_ROWS = 11;
export const SPELL_ZONE_CELL_COUNT = SPELL_ZONE_COLUMNS * SPELL_ZONE_ROWS;
export const DEFAULT_SPELL_ZONE_PLAYER = Math.floor(SPELL_ZONE_CELL_COUNT / 2);

const PLAYER_ROW = Math.floor(DEFAULT_SPELL_ZONE_PLAYER / SPELL_ZONE_COLUMNS);
const PLAYER_COL = DEFAULT_SPELL_ZONE_PLAYER % SPELL_ZONE_COLUMNS;

// Cellules alignées sur une seule ligne, partant devant le lanceur (utilisé pour Rayon).
const buildLineCells = (row, startCol, length) =>
  Array.from({ length }, (_, i) => row * SPELL_ZONE_COLUMNS + startCol + i);

// Cellules formant un losange (distance de Manhattan <= radius) autour d'un centre (utilisé pour Cercle).
const buildDiamondCells = (centerRow, centerCol, radius, excludeIndex) => {
  const cells = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.abs(dr) + Math.abs(dc) > radius) continue;
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row < 0 || row >= SPELL_ZONE_ROWS || col < 0 || col >= SPELL_ZONE_COLUMNS) continue;
      const index = row * SPELL_ZONE_COLUMNS + col;
      if (index !== excludeIndex) cells.push(index);
    }
  }
  return cells.sort((a, b) => a - b);
};

// Chaque famille n'a que 2 paliers (contrairement aux Rangs qui en ont 6) —
// minRank 1 (Mineur) et 3 (Fort) est une hypothèse de calage à ajuster au
// besoin, la donnée source ne précisait pas explicitement à quel palier
// chaque taille de zone se débloque.
export const DEFAULT_SPELL_ZONES = [
  {
    id: 'spell-zone-cone-1',
    key: 'cone-1',
    nom: 'Cône X1',
    famille: 'Cône',
    portee: 1,
    couleur: '#bcecff',
    description: 'Petit cône court partant du lanceur.',
    minRank: 1,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: [61],
    isDefault: true,
  },
  {
    id: 'spell-zone-cone-2',
    key: 'cone-2',
    nom: 'Cône X2',
    famille: 'Cône',
    portee: 2,
    couleur: '#bcecff',
    description: 'Cône élargi couvrant une zone plus large devant le lanceur.',
    minRank: 3,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: [50, 61, 62, 72],
    isDefault: true,
  },
  {
    id: 'spell-zone-rayon-5',
    key: 'rayon-5',
    nom: 'Ligne 5',
    famille: 'Rayon',
    portee: 5,
    couleur: '#ffd166',
    description: 'Trait rectiligne de 5 cases devant le lanceur.',
    minRank: 1,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: buildLineCells(PLAYER_ROW, PLAYER_COL + 1, 3),
    isDefault: true,
  },
  {
    id: 'spell-zone-rayon-10',
    key: 'rayon-10',
    nom: 'Ligne 10',
    famille: 'Rayon',
    portee: 10,
    couleur: '#ffd166',
    description: 'Trait rectiligne long de 10 cases devant le lanceur.',
    minRank: 3,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: buildLineCells(PLAYER_ROW, PLAYER_COL + 1, 5),
    isDefault: true,
  },
  {
    id: 'spell-zone-cercle-1',
    key: 'cercle-1',
    nom: 'Cases Adjacentes +1',
    famille: 'Cercle',
    portee: 1,
    couleur: '#c9a6ff',
    description: 'Explosion centrée sur le lanceur, une case tout autour.',
    minRank: 1,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: buildDiamondCells(PLAYER_ROW, PLAYER_COL, 1, DEFAULT_SPELL_ZONE_PLAYER),
    isDefault: true,
  },
  {
    id: 'spell-zone-cercle-2',
    key: 'cercle-2',
    nom: 'Cases Adjacentes +2',
    famille: 'Cercle',
    portee: 2,
    couleur: '#c9a6ff',
    description: 'Explosion centrée sur le lanceur, deux cases tout autour.',
    minRank: 3,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: buildDiamondCells(PLAYER_ROW, PLAYER_COL, 2, DEFAULT_SPELL_ZONE_PLAYER),
    isDefault: true,
  },
  {
    id: 'spell-zone-carre-1x1',
    key: 'carre-1x1',
    nom: 'Zone 1x1',
    famille: 'Carré',
    portee: 1,
    couleur: '#a0e0a0',
    description: 'Une seule case affectée, devant le lanceur.',
    minRank: 1,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: [DEFAULT_SPELL_ZONE_PLAYER + 1],
    isDefault: true,
  },
  {
    id: 'spell-zone-carre-2x2',
    key: 'carre-2x2',
    nom: 'Zone 2x2',
    famille: 'Carré',
    portee: 2,
    couleur: '#a0e0a0',
    description: 'Un bloc de 4 cases (2x2) devant le lanceur.',
    minRank: 3,
    playerCell: DEFAULT_SPELL_ZONE_PLAYER,
    cells: [
      PLAYER_ROW * SPELL_ZONE_COLUMNS + PLAYER_COL + 1,
      PLAYER_ROW * SPELL_ZONE_COLUMNS + PLAYER_COL + 2,
      (PLAYER_ROW + 1) * SPELL_ZONE_COLUMNS + PLAYER_COL + 1,
      (PLAYER_ROW + 1) * SPELL_ZONE_COLUMNS + PLAYER_COL + 2,
    ],
    isDefault: true,
  },
];
