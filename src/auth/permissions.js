export const PERMISSIONS = Object.freeze({
  managePlayers: 'managePlayers',
  manageRoles: 'manageRoles',
  reviewCharacterCreations: 'reviewCharacterCreations',
  manageReferences: 'manageReferences',
  manageIdentities: 'manageIdentities',
  manageGameplay: 'manageGameplay',
  manageItems: 'manageItems',
  viewAllCharacters: 'viewAllCharacters',
  manageTickets: 'manageTickets',
  viewTerminal: 'viewTerminal',
  manageStorage: 'manageStorage',
  manageCombat: 'manageCombat',
});

export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.managePlayers]: 'Gérer les joueurs',
  [PERMISSIONS.manageRoles]: 'Gérer les rôles',
  [PERMISSIONS.reviewCharacterCreations]: 'Valider les créations de fiche',
  [PERMISSIONS.manageReferences]: 'Gérer les références et savoirs',
  [PERMISSIONS.manageIdentities]: 'Gérer origines et identités',
  [PERMISSIONS.manageGameplay]: 'Gérer le gameplay',
  [PERMISSIONS.manageItems]: 'Gérer équipement et économie',
  [PERMISSIONS.viewAllCharacters]: 'Voir toutes les fiches',
  [PERMISSIONS.manageTickets]: 'Gérer les tickets',
  [PERMISSIONS.viewTerminal]: 'Voir le terminal développeur',
  [PERMISSIONS.manageStorage]: 'Gérer le stockage JSON',
  [PERMISSIONS.manageCombat]: 'Lancer le mode combat',
});

export const ROLE_KEYS = Object.freeze({
  developer: 'developer',
  gm: 'gm',
  moderator: 'moderator',
  player: 'player',
});

const fullPermissions = Object.fromEntries(
  Object.values(PERMISSIONS).map((permission) => [permission, true]),
);

export const DEFAULT_ACCOUNT_ROLES = Object.freeze([
  {
    key: ROLE_KEYS.developer,
    label: 'Développeur',
    system: true,
    absolute: true,
    power: 100,
    permissions: fullPermissions,
  },
  {
    key: ROLE_KEYS.gm,
    label: 'Maître du Donjon',
    system: true,
    power: 90,
    permissions: {
      [PERMISSIONS.reviewCharacterCreations]: true,
      [PERMISSIONS.manageReferences]: true,
      [PERMISSIONS.manageIdentities]: true,
      [PERMISSIONS.manageGameplay]: true,
      [PERMISSIONS.manageItems]: true,
      [PERMISSIONS.viewAllCharacters]: true,
      [PERMISSIONS.manageRoles]: true,
      [PERMISSIONS.managePlayers]: true,
      [PERMISSIONS.manageStorage]: true,
      [PERMISSIONS.manageCombat]: true,
    },
  },
  {
    key: ROLE_KEYS.moderator,
    label: 'Modérateur',
    system: true,
    power: 40,
    permissions: {},
  },
  {
    key: ROLE_KEYS.player,
    label: 'Joueur',
    system: true,
    power: 0,
    permissions: {},
  },
]);

export const MODERATOR_PERMISSIONS = Object.freeze(
  Object.values(PERMISSIONS).map((key) => ({ key, label: PERMISSION_LABELS[key] })),
);

export const SECTION_PERMISSIONS = Object.freeze({
  home: PERMISSIONS.manageIdentities,
  joueurs: PERMISSIONS.managePlayers,
  roles: PERMISSIONS.manageRoles,
  tickets: PERMISSIONS.manageTickets,
  terminal: PERMISSIONS.viewTerminal,
  storage: PERMISSIONS.manageStorage,
  'createur-fiche': PERMISSIONS.reviewCharacterCreations,
  connaissances: PERMISSIONS.manageReferences,
  aptitudes: PERMISSIONS.manageReferences,
  langues: PERMISSIONS.manageReferences,
  races: PERMISSIONS.manageIdentities,
  ascendances: PERMISSIONS.manageIdentities,
  origines: PERMISSIONS.manageIdentities,
  historiques: PERMISSIONS.manageIdentities,
  provenances: PERMISSIONS.manageIdentities,
  caracteristiques: PERMISSIONS.manageGameplay,
  index: PERMISSIONS.manageGameplay,
  leveling: PERMISSIONS.manageGameplay,
  classes: PERMISSIONS.manageGameplay,
  'sous-classes': PERMISSIONS.manageGameplay,
  competences: PERMISSIONS.manageGameplay,
  resistances: PERMISSIONS.manageGameplay,
  maitrise: PERMISSIONS.manageGameplay,
  etats: PERMISSIONS.manageGameplay,
  'grimoire-rangs': PERMISSIONS.manageGameplay,
  'grimoire-types': PERMISSIONS.manageGameplay,
  'grimoire-zones': PERMISSIONS.manageGameplay,
  item: PERMISSIONS.manageItems,
  'item-categorie': PERMISSIONS.manageItems,
  'item-classe': PERMISSIONS.manageItems,
  'item-rarete': PERMISSIONS.manageItems,
});

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeRoleKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getRoleDefinitions = (customRoles = [], systemRoleOverrides = {}) => [
  ...DEFAULT_ACCOUNT_ROLES.map((role) => {
    const override = systemRoleOverrides?.[role.key] || {};
    return {
      ...role,
      ...override,
      key: role.key,
      system: true,
      absolute: role.absolute,
      power: role.power,
      permissions: role.absolute ? role.permissions : (override.permissions || role.permissions || {}),
      hasOverride: Boolean(systemRoleOverrides?.[role.key]),
    };
  }),
  ...asArray(customRoles).map((role) => ({
    ...role,
    key: normalizeRoleKey(role.key || role.label || role.nom || role.id),
    label: role.label || role.nom || 'Rôle personnalisé',
    permissions: role.permissions || {},
    power: Number(role.power) || Object.values(role.permissions || {}).filter(Boolean).length * 5,
  })),
].sort((a, b) => (b.power || 0) - (a.power || 0) || a.label.localeCompare(b.label));

export const getRoleDefinition = (roleKey, customRoles = [], systemRoleOverrides = {}) => {
  const normalized = normalizeRoleKey(roleKey || ROLE_KEYS.player);
  return getRoleDefinitions(customRoles, systemRoleOverrides).find((role) => role.key === normalized)
    || DEFAULT_ACCOUNT_ROLES.find((role) => role.key === ROLE_KEYS.player);
};

export const getEffectivePermissions = (user, customRoles = [], systemRoleOverrides = {}) => {
  if (!user) return {};
  const role = getRoleDefinition(user.role, customRoles, systemRoleOverrides);
  if (role?.absolute) return fullPermissions;

  return {
    ...(role?.permissions || {}),
    ...(user.permissions || {}),
  };
};

export const hasPermission = (user, permission, customRoles = [], systemRoleOverrides = {}) => {
  if (!user || !permission) return false;
  const role = getRoleDefinition(user.role, customRoles, systemRoleOverrides);
  if (role?.absolute) return true;
  return Boolean(getEffectivePermissions(user, customRoles, systemRoleOverrides)[permission]);
};

export const canAccessAdmin = (user, customRoles = [], systemRoleOverrides = {}) => {
  if (!user) return false;
  const role = getRoleDefinition(user.role, customRoles, systemRoleOverrides);
  if (role?.absolute) return true;
  return Object.values(getEffectivePermissions(user, customRoles, systemRoleOverrides)).some(Boolean);
};

export const canAccessAdminSection = (user, sectionKey, customRoles = [], systemRoleOverrides = {}) => {
  const permission = SECTION_PERMISSIONS[sectionKey];
  if (!permission) return false;
  return hasPermission(user, permission, customRoles, systemRoleOverrides);
};

export const canViewAllCharacters = (user, customRoles = [], systemRoleOverrides = {}) =>
  hasPermission(user, PERMISSIONS.viewAllCharacters, customRoles, systemRoleOverrides);

export const canManageCombat = (user, customRoles = [], systemRoleOverrides = {}) =>
  hasPermission(user, PERMISSIONS.manageCombat, customRoles, systemRoleOverrides);

export const canReviewCharacterCreations = (user, customRoles = [], systemRoleOverrides = {}) =>
  hasPermission(user, PERMISSIONS.reviewCharacterCreations, customRoles, systemRoleOverrides);

export const ownsCharacter = (user, character) =>
  Boolean(user && character && (
    String(character.userId) === String(user.id)
    || String(character.requestedBy) === String(user.id)
  ));

export const canViewCharacter = (user, character, customRoles = [], systemRoleOverrides = {}) =>
  ownsCharacter(user, character) || canViewAllCharacters(user, customRoles, systemRoleOverrides);

export const canEditCharacter = (user, character, customRoles = [], systemRoleOverrides = {}) => {
  if (!character || character.__pending || character.status === 'pending') return false;
  return ownsCharacter(user, character) || canViewAllCharacters(user, customRoles, systemRoleOverrides);
};

export const canDeleteCharacter = (user, character, customRoles = [], systemRoleOverrides = {}) =>
  canEditCharacter(user, character, customRoles, systemRoleOverrides);
