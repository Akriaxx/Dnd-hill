import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SPELL_RANKS, DEFAULT_ACTION_TYPES, DEFAULT_SPECIALITES } from '../pages/admin/spellDefaults';
import { supabase } from '../lib/supabaseClient';
import { PERMISSIONS, DEFAULT_ACCOUNT_ROLES } from '../auth/permissions';

// Écrit un rôle (système ou personnalisé) et l'intégralité de ses droits
// vers Supabase (source de vérité pour la RLS via has_permission()).
const syncRoleToSupabase = async ({ key, label, power, system = false, permissions = {} }) => {
  const { error: roleError } = await supabase
    .from('roles')
    .upsert({ key, label, power: power ?? 0, system }, { onConflict: 'key' });
  if (roleError) { console.error('roles upsert failed', roleError); return; }
  const rows = Object.keys(PERMISSIONS).map((permission_key) => ({
    role_key: key,
    permission_key,
    enabled: Boolean(permissions?.[permission_key]),
  }));
  const { error: permError } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_key,permission_key' });
  if (permError) console.error('role_permissions upsert failed', permError);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const TICKET_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_STORE_VERSION = 3;
const SECURITY_STATE_KEYS = [
  'playerAccounts',
  'customRoles',
  'systemRoleOverrides',
  'appTickets',
  'terminalLogs',
];

export const GAME_DATA_STATE_KEYS = [
  'customRaceCategories',
  'customRaces',
  'hiddenRaceKeys',
  'customAscendances',
  'hiddenAscendanceKeys',
  'customCompetenceCategories',
  'customCompetences',
  'customKnowledgeCategories',
  'customKnowledge',
  'hiddenKnowledgeKeys',
  'customOriginCategories',
  'customOrigins',
  'hiddenOriginKeys',
  'customProvenances',
  'hiddenProvenanceKeys',
  'customHistoriqueCategories',
  'customHistoriques',
  'hiddenHistoriqueKeys',
  'customLanguageCategories',
  'customLanguages',
  'customAptitudeCategories',
  'customAptitudes',
  'hiddenAptitudeKeys',
  'customClassCategories',
  'customClasses',
  'hiddenClassKeys',
  'customSubclasses',
  'hiddenSubclassKeys',
  'gameplayIndexCategories',
  'hiddenGameplayIndexCategoryKeys',
  'gameplayIndex',
  'hiddenGameplayIndexKeys',
  'customLevelRules',
  'customSpellRanks',
  'customSpellTypes',
  'customSpellZones',
  'customActionTypes',
  'customSpecialites',
  'customCaracteristiques',
  'customResistanceCategories',
  'customResistanceEntries',
  'customMaitriseEntries',
  'customArchetypes',
  'customItemCategories',
  'customItems',
  'customItemClasses',
  'customItemRarities',
];

const EMPTY_GAME_DATA_STATE = {
  customRaceCategories: [],
  customRaces: [],
  hiddenRaceKeys: [],
  customAscendances: [],
  hiddenAscendanceKeys: [],
  customCompetenceCategories: [],
  customCompetences: [],
  customKnowledgeCategories: [],
  customKnowledge: [],
  hiddenKnowledgeKeys: [],
  customOriginCategories: [],
  customOrigins: [],
  hiddenOriginKeys: [],
  customProvenances: [],
  hiddenProvenanceKeys: [],
  customHistoriqueCategories: [],
  customHistoriques: [],
  hiddenHistoriqueKeys: [],
  customLanguageCategories: [],
  customLanguages: [],
  customAptitudeCategories: [],
  customAptitudes: [],
  hiddenAptitudeKeys: [],
  customClassCategories: [],
  customClasses: [],
  hiddenClassKeys: [],
  customSubclasses: [],
  hiddenSubclassKeys: [],
  gameplayIndexCategories: [],
  hiddenGameplayIndexCategoryKeys: [],
  gameplayIndex: [],
  hiddenGameplayIndexKeys: [],
  customLevelRules: [],
  // Graine : les 6 paliers officiels, librement éditables/supprimables par le MJ.
  customSpellRanks: DEFAULT_SPELL_RANKS,
  customSpellTypes: [],
  customSpellZones: [],
  customActionTypes: DEFAULT_ACTION_TYPES,
  customSpecialites: DEFAULT_SPECIALITES,
  customCaracteristiques: [],
  customResistanceCategories: [],
  customResistanceEntries: [],
  customMaitriseEntries: [],
  customArchetypes: [],
  customItemCategories: [],
  customItems: [],
  customItemClasses: [],
  customItemRarities: [],
};

const pickGameDataState = (state = {}) =>
  GAME_DATA_STATE_KEYS.reduce((next, key) => ({
    ...next,
    [key]: Array.isArray(state[key]) ? state[key] : [],
  }), {});

const normalizeImportedGameData = (payload = {}) => {
  const data = payload?.data || payload?.gameData || payload;
  return GAME_DATA_STATE_KEYS.reduce((next, key) => ({
    ...next,
    [key]: Array.isArray(data?.[key]) ? data[key] : [],
  }), {});
};

const buildGameDataSnapshot = (state = {}) => ({
  schema: 'eindhill-game-data-json',
  version: 1,
  exportedAt: new Date().toISOString(),
  data: pickGameDataState(state),
});

const normalizeTicketPart = (value) =>
  String(value || '')
    .replace(/https?:\/\/localhost:\d+/gi, 'localhost')
    .replace(/https?:\/\/127\.0\.0\.1:\d+/gi, 'localhost')
    .replace(/[?&]t=\d+/gi, '')
    .replace(/:\d+:\d+/g, ':line:col')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const buildTicketSignature = (ticket) =>
  [
    ticket?.title || 'Erreur applicative',
    ticket?.severity || 'error',
    ticket?.source || 'terminal',
    ticket?.description || ticket?.message || '',
  ]
    .map(normalizeTicketPart)
    .join('|');

const getTicketTime = (ticket) => {
  const time = Date.parse(ticket?.lastSeenAt || ticket?.updatedAt || ticket?.createdAt || '');
  return Number.isFinite(time) ? time : 0;
};

export const isDevServerNoise = (ticketOrMessage) => {
  const text = normalizeTicketPart(
    typeof ticketOrMessage === 'string'
      ? ticketOrMessage
      : [
          ticketOrMessage?.title,
          ticketOrMessage?.description,
          ticketOrMessage?.message,
          ticketOrMessage?.source,
          ticketOrMessage?.stack,
        ].filter(Boolean).join(' ')
  );

  return [
    '[vite] failed to reload',
    'failed to connect to websocket',
    'server-hmr',
    'vite / network configuration',
    '<--[websocket (failing)]-->',
  ].some((pattern) => text.includes(pattern));
};

const preserveSecurityState = (state = {}) =>
  SECURITY_STATE_KEYS.reduce((next, key) => {
    if (state[key] !== undefined) next[key] = state[key];
    return next;
  }, {});

export const useAdminStore = create(
  persist(
    (set, get) => ({
      // Races créées par le MJ
      customRaceCategories: [],
      customRaces: [],
      hiddenRaceKeys: [],

      addRaceCategory: (category) =>
        set((state) => ({
          customRaceCategories: [
            ...(state.customRaceCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateRaceCategory: (id, patch) =>
        set((state) => ({
          customRaceCategories: (state.customRaceCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteRaceCategory: (id) =>
        set((state) => ({
          customRaceCategories: (state.customRaceCategories || []).filter((category) => category.id !== id),
        })),

      addRace: (race) =>
        set((state) => ({
          customRaces: [...state.customRaces, { ...race, id: Date.now(), custom: true }],
        })),

      updateRace: (id, patch) =>
        set((state) => ({
          customRaces: state.customRaces.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteRace: (id) =>
        set((state) => ({
          customRaces: state.customRaces.filter((r) => r.id !== id),
        })),

      hideDefaultRace: (key) =>
        set((state) => ({
          hiddenRaceKeys: [...new Set([...(state.hiddenRaceKeys || []), key])],
        })),

      // Ascendances créées par le MJ
      customAscendances: [],
      hiddenAscendanceKeys: [],

      addAscendance: (ascendance) =>
        set((state) => ({
          customAscendances: [
            ...(state.customAscendances || []),
            { ...ascendance, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateAscendance: (id, patch) =>
        set((state) => ({
          customAscendances: (state.customAscendances || []).map((ascendance) =>
            ascendance.id === id ? { ...ascendance, ...patch, updatedAt: new Date().toISOString() } : ascendance
          ),
        })),

      deleteAscendance: (id) =>
        set((state) => ({
          customAscendances: (state.customAscendances || []).filter((ascendance) => ascendance.id !== id),
        })),

      hideDefaultAscendance: (key) =>
        set((state) => ({
          hiddenAscendanceKeys: [...new Set([...(state.hiddenAscendanceKeys || []), key])],
        })),

      // Compétences créées par le MJ
      customCompetenceCategories: [],

      addCompetenceCategory: (category) =>
        set((state) => ({
          customCompetenceCategories: [
            ...(state.customCompetenceCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateCompetenceCategory: (id, patch) =>
        set((state) => ({
          customCompetenceCategories: (state.customCompetenceCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteCompetenceCategory: (id) =>
        set((state) => ({
          customCompetenceCategories: (state.customCompetenceCategories || []).filter((category) => category.id !== id),
        })),

      customCompetences: [],

      addCompetence: (comp) =>
        set((state) => ({
          customCompetences: [...state.customCompetences, { ...comp, id: Date.now() }],
        })),

      updateCompetence: (id, patch) =>
        set((state) => ({
          customCompetences: state.customCompetences.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCompetence: (id) =>
        set((state) => ({
          customCompetences: state.customCompetences.filter((c) => c.id !== id),
        })),

      // Catégories et connaissances créées par le MJ
      customKnowledgeCategories: [],

      addKnowledgeCategory: (category) =>
        set((state) => ({
          customKnowledgeCategories: [
            ...(state.customKnowledgeCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateKnowledgeCategory: (id, patch) =>
        set((state) => ({
          customKnowledgeCategories: (state.customKnowledgeCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteKnowledgeCategory: (id) =>
        set((state) => ({
          customKnowledgeCategories: (state.customKnowledgeCategories || []).filter((category) => category.id !== id),
        })),

      customKnowledge: [],
      hiddenKnowledgeKeys: [],

      addKnowledge: (knowledge) =>
        set((state) => ({
          customKnowledge: [
            ...(state.customKnowledge || []),
            { ...knowledge, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateKnowledge: (id, patch) =>
        set((state) => ({
          customKnowledge: (state.customKnowledge || []).map((knowledge) =>
            knowledge.id === id ? { ...knowledge, ...patch, updatedAt: new Date().toISOString() } : knowledge
          ),
        })),

      deleteKnowledge: (id) =>
        set((state) => ({
          customKnowledge: (state.customKnowledge || []).filter((knowledge) => knowledge.id !== id),
        })),

      hideDefaultKnowledge: (key) =>
        set((state) => ({
          hiddenKnowledgeKeys: [...new Set([...(state.hiddenKnowledgeKeys || []), key])],
        })),

      // Catégories et origines créées par le MJ
      customOriginCategories: [],
      customOrigins: [],
      hiddenOriginKeys: [],

      addOriginCategory: (category) =>
        set((state) => ({
          customOriginCategories: [
            ...(state.customOriginCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateOriginCategory: (id, patch) =>
        set((state) => ({
          customOriginCategories: (state.customOriginCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteOriginCategory: (id) =>
        set((state) => ({
          customOriginCategories: (state.customOriginCategories || []).filter((category) => category.id !== id),
        })),

      addOrigin: (origin) =>
        set((state) => ({
          customOrigins: [
            ...(state.customOrigins || []),
            { ...origin, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateOrigin: (id, patch) =>
        set((state) => ({
          customOrigins: (state.customOrigins || []).map((origin) =>
            origin.id === id ? { ...origin, ...patch, updatedAt: new Date().toISOString() } : origin
          ),
        })),

      deleteOrigin: (id) =>
        set((state) => ({
          customOrigins: (state.customOrigins || []).filter((origin) => origin.id !== id),
        })),

      hideDefaultOrigin: (key) =>
        set((state) => ({
          hiddenOriginKeys: [...new Set([...(state.hiddenOriginKeys || []), key])],
        })),

      // Provenances créées par le MJ
      customProvenances: [],
      hiddenProvenanceKeys: [],

      addProvenance: (provenance) =>
        set((state) => ({
          customProvenances: [
            ...(state.customProvenances || []),
            { ...provenance, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateProvenance: (id, patch) =>
        set((state) => ({
          customProvenances: (state.customProvenances || []).map((provenance) =>
            provenance.id === id ? { ...provenance, ...patch, updatedAt: new Date().toISOString() } : provenance
          ),
        })),

      deleteProvenance: (id) =>
        set((state) => ({
          customProvenances: (state.customProvenances || []).filter((provenance) => provenance.id !== id),
        })),

      hideDefaultProvenance: (key) =>
        set((state) => ({
          hiddenProvenanceKeys: [...new Set([...(state.hiddenProvenanceKeys || []), key])],
        })),

      // Catégories et historiques créés par le MJ
      customHistoriqueCategories: [],
      customHistoriques: [],
      hiddenHistoriqueKeys: [],

      addHistoriqueCategory: (category) =>
        set((state) => ({
          customHistoriqueCategories: [
            ...(state.customHistoriqueCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateHistoriqueCategory: (id, patch) =>
        set((state) => ({
          customHistoriqueCategories: (state.customHistoriqueCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteHistoriqueCategory: (id) =>
        set((state) => ({
          customHistoriqueCategories: (state.customHistoriqueCategories || []).filter((category) => category.id !== id),
        })),

      addHistorique: (historique) =>
        set((state) => ({
          customHistoriques: [
            ...(state.customHistoriques || []),
            { ...historique, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateHistorique: (id, patch) =>
        set((state) => ({
          customHistoriques: (state.customHistoriques || []).map((historique) =>
            historique.id === id ? { ...historique, ...patch, updatedAt: new Date().toISOString() } : historique
          ),
        })),

      deleteHistorique: (id) =>
        set((state) => ({
          customHistoriques: (state.customHistoriques || []).filter((historique) => historique.id !== id),
        })),

      hideDefaultHistorique: (key) =>
        set((state) => ({
          hiddenHistoriqueKeys: [...new Set([...(state.hiddenHistoriqueKeys || []), key])],
        })),

      // Catégories et langues créées par le MJ
      customLanguageCategories: [],

      addLanguageCategory: (category) =>
        set((state) => ({
          customLanguageCategories: [
            ...(state.customLanguageCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateLanguageCategory: (id, patch) =>
        set((state) => ({
          customLanguageCategories: (state.customLanguageCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteLanguageCategory: (id) =>
        set((state) => ({
          customLanguageCategories: (state.customLanguageCategories || []).filter((category) => category.id !== id),
        })),

      customLanguages: [],

      addLanguage: (language) =>
        set((state) => ({
          customLanguages: [
            ...(state.customLanguages || []),
            { ...language, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateLanguage: (id, patch) =>
        set((state) => ({
          customLanguages: (state.customLanguages || []).map((language) =>
            language.id === id ? { ...language, ...patch, updatedAt: new Date().toISOString() } : language
          ),
        })),

      deleteLanguage: (id) =>
        set((state) => ({
          customLanguages: (state.customLanguages || []).filter((language) => language.id !== id),
        })),

      // Catégories et aptitudes créées par le MJ
      customAptitudeCategories: [],

      addAptitudeCategory: (category) =>
        set((state) => ({
          customAptitudeCategories: [
            ...(state.customAptitudeCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateAptitudeCategory: (id, patch) =>
        set((state) => ({
          customAptitudeCategories: (state.customAptitudeCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteAptitudeCategory: (id) =>
        set((state) => ({
          customAptitudeCategories: (state.customAptitudeCategories || []).filter((category) => category.id !== id),
        })),

      customAptitudes: [],
      hiddenAptitudeKeys: [],

      addAptitude: (aptitude) =>
        set((state) => ({
          customAptitudes: [
            ...(state.customAptitudes || []),
            { ...aptitude, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateAptitude: (id, patch) =>
        set((state) => ({
          customAptitudes: (state.customAptitudes || []).map((aptitude) =>
            aptitude.id === id ? { ...aptitude, ...patch, updatedAt: new Date().toISOString() } : aptitude
          ),
        })),

      deleteAptitude: (id) =>
        set((state) => ({
          customAptitudes: (state.customAptitudes || []).filter((aptitude) => aptitude.id !== id),
        })),

      hideDefaultAptitude: (key) =>
        set((state) => ({
          hiddenAptitudeKeys: [...new Set([...(state.hiddenAptitudeKeys || []), key])],
        })),

      // Catégories de classes (ex: Combattante, Héroïque…) créées par le MJ
      customClassCategories: [],

      addClassCategory: (category) =>
        set((state) => ({
          customClassCategories: [
            ...(state.customClassCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateClassCategory: (id, patch) =>
        set((state) => ({
          customClassCategories: (state.customClassCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch, updatedAt: new Date().toISOString() } : category
          ),
        })),

      deleteClassCategory: (id) =>
        set((state) => ({
          customClassCategories: (state.customClassCategories || []).filter((category) => category.id !== id),
        })),

      // Classes et sous-classes créées/modifiées par le MJ
      customClasses: [],
      hiddenClassKeys: [],

      addClass: (classDef) =>
        set((state) => ({
          customClasses: [
            ...(state.customClasses || []),
            { ...classDef, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateClass: (id, patch) =>
        set((state) => ({
          customClasses: (state.customClasses || []).map((classDef) =>
            classDef.id === id ? { ...classDef, ...patch, updatedAt: new Date().toISOString() } : classDef
          ),
        })),

      deleteClass: (id) =>
        set((state) => ({
          customClasses: (state.customClasses || []).filter((classDef) => classDef.id !== id),
        })),

      hideDefaultClass: (key) =>
        set((state) => ({
          hiddenClassKeys: [...new Set([...(state.hiddenClassKeys || []), key])],
        })),

      customSubclasses: [],
      hiddenSubclassKeys: [],

      addSubclass: (subclass) =>
        set((state) => ({
          customSubclasses: [
            ...(state.customSubclasses || []),
            { ...subclass, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateSubclass: (id, patch) =>
        set((state) => ({
          customSubclasses: (state.customSubclasses || []).map((subclass) =>
            subclass.id === id ? { ...subclass, ...patch, updatedAt: new Date().toISOString() } : subclass
          ),
        })),

      deleteSubclass: (id) =>
        set((state) => ({
          customSubclasses: (state.customSubclasses || []).filter((subclass) => subclass.id !== id),
        })),

      hideDefaultSubclass: (key) =>
        set((state) => ({
          hiddenSubclassKeys: [...new Set([...(state.hiddenSubclassKeys || []), key])],
        })),

      // Catégories et entrées d'index gameplay créées par le MJ
      gameplayIndexCategories: [],
      hiddenGameplayIndexCategoryKeys: [],

      addGameplayIndexCategory: (category) =>
        set((state) => ({
          gameplayIndexCategories: [...(state.gameplayIndexCategories || []), { ...category, id: Date.now() }],
        })),

      updateGameplayIndexCategory: (id, patch) =>
        set((state) => ({
          gameplayIndexCategories: (state.gameplayIndexCategories || []).map((category) =>
            category.id === id ? { ...category, ...patch } : category
          ),
        })),

      deleteGameplayIndexCategory: (id) =>
        set((state) => ({
          gameplayIndexCategories: (state.gameplayIndexCategories || []).filter((category) => category.id !== id),
        })),

      gameplayIndex: [],
      hiddenGameplayIndexKeys: [],

      addGameplayIndex: (entry) =>
        set((state) => ({
          gameplayIndex: [...state.gameplayIndex, { ...entry, id: Date.now() }],
        })),

      updateGameplayIndex: (id, patch) =>
        set((state) => ({
          gameplayIndex: state.gameplayIndex.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
        })),

      deleteGameplayIndex: (id) =>
        set((state) => ({
          gameplayIndex: state.gameplayIndex.filter((entry) => entry.id !== id),
        })),

      hideDefaultGameplayIndexCategory: (key) =>
        set((state) => ({
          hiddenGameplayIndexCategoryKeys: [...new Set([...(state.hiddenGameplayIndexCategoryKeys || []), key])],
        })),

      hideDefaultGameplayIndex: (key) =>
        set((state) => ({
          hiddenGameplayIndexKeys: [...new Set([...(state.hiddenGameplayIndexKeys || []), key])],
        })),

      // Règles de progression créées par le MJ
      customLevelRules: [],

      addLevelRule: (rule) =>
        set((state) => ({
          customLevelRules: [
            ...(state.customLevelRules || []),
            { ...rule, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateLevelRule: (id, patch) =>
        set((state) => ({
          customLevelRules: (state.customLevelRules || []).map((rule) =>
            rule.id === id ? { ...rule, ...patch, updatedAt: new Date().toISOString() } : rule
          ),
        })),

      deleteLevelRule: (id) =>
        set((state) => ({
          customLevelRules: (state.customLevelRules || []).filter((rule) => rule.id !== id),
        })),

      deleteLevelRuleFromLevel: (level) =>
        set((state) => ({
          customLevelRules: (state.customLevelRules || []).filter((rule) => (Number(rule.level) || 0) < (Number(level) || 0)),
        })),

      // Rangs de sorts configurés par le MJ
      // Graine : les 6 paliers officiels, librement éditables/supprimables par le MJ.
  customSpellRanks: DEFAULT_SPELL_RANKS,

      addSpellRank: (rank) =>
        set((state) => ({
          customSpellRanks: [
            ...(state.customSpellRanks || []),
            { ...rank, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateSpellRank: (id, patch) =>
        set((state) => ({
          customSpellRanks: (state.customSpellRanks || []).map((rank) =>
            rank.id === id ? { ...rank, ...patch, updatedAt: new Date().toISOString() } : rank
          ),
        })),

      deleteSpellRankFromValue: (value) =>
        set((state) => ({
          customSpellRanks: (state.customSpellRanks || []).filter((rank) => (Number(rank.value) || 0) < (Number(value) || 0)),
        })),

      // Types de sorts configurés par le MJ
      customSpellTypes: [],

      addSpellType: (type) =>
        set((state) => ({
          customSpellTypes: [
            ...(state.customSpellTypes || []),
            { ...type, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateSpellType: (id, patch) =>
        set((state) => ({
          customSpellTypes: (state.customSpellTypes || []).map((type) =>
            type.id === id ? { ...type, ...patch, updatedAt: new Date().toISOString() } : type
          ),
        })),

      deleteSpellType: (id) =>
        set((state) => ({
          customSpellTypes: (state.customSpellTypes || []).filter((type) => type.id !== id),
        })),

      // Zones de sorts configurées par le MJ
      customSpellZones: [],

      addSpellZone: (zone) =>
        set((state) => ({
          customSpellZones: [
            ...(state.customSpellZones || []),
            { ...zone, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateSpellZone: (id, patch) =>
        set((state) => ({
          customSpellZones: (state.customSpellZones || []).map((zone) =>
            zone.id === id ? { ...zone, ...patch, updatedAt: new Date().toISOString() } : zone
          ),
        })),

      deleteSpellZone: (id) =>
        set((state) => ({
          customSpellZones: (state.customSpellZones || []).filter((zone) => zone.id !== id),
        })),

      // Types d'action des sorts configurés par le MJ
      customActionTypes: DEFAULT_ACTION_TYPES,

      addActionType: (entry) =>
        set((state) => ({
          customActionTypes: [
            ...(state.customActionTypes || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateActionType: (id, patch) =>
        set((state) => ({
          customActionTypes: (state.customActionTypes || []).map((entry) =>
            entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
          ),
        })),

      deleteActionType: (id) =>
        set((state) => ({
          customActionTypes: (state.customActionTypes || []).filter((entry) => entry.id !== id),
        })),

      // Spécialités de sorts configurées par le MJ
      customSpecialites: DEFAULT_SPECIALITES,

      addSpecialite: (entry) =>
        set((state) => ({
          customSpecialites: [
            ...(state.customSpecialites || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateSpecialite: (id, patch) =>
        set((state) => ({
          customSpecialites: (state.customSpecialites || []).map((entry) =>
            entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
          ),
        })),

      deleteSpecialite: (id) =>
        set((state) => ({
          customSpecialites: (state.customSpecialites || []).filter((entry) => entry.id !== id),
        })),

      // Caractéristiques de base créées par le MJ
      customCaracteristiques: [],

      addCaracteristique: (carac) =>
        set((state) => ({
          customCaracteristiques: [
            ...(state.customCaracteristiques || []),
            { ...carac, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateCaracteristique: (id, patch) =>
        set((state) => ({
          customCaracteristiques: (state.customCaracteristiques || []).map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteCaracteristique: (id) =>
        set((state) => ({
          customCaracteristiques: (state.customCaracteristiques || []).filter((c) => c.id !== id),
        })),

      // Catégories et entrées de résistances créées par le MJ
      customResistanceCategories: [],
      customResistanceEntries: [],

      addResistanceCategory: (category) =>
        set((state) => ({
          customResistanceCategories: [
            ...(state.customResistanceCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateResistanceCategory: (id, patch) =>
        set((state) => ({
          customResistanceCategories: (state.customResistanceCategories || []).map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteResistanceCategory: (id) =>
        set((state) => ({
          customResistanceCategories: (state.customResistanceCategories || []).filter((c) => c.id !== id),
        })),

      addResistanceEntry: (entry) =>
        set((state) => ({
          customResistanceEntries: [
            ...(state.customResistanceEntries || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateResistanceEntry: (id, patch) =>
        set((state) => ({
          customResistanceEntries: (state.customResistanceEntries || []).map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteResistanceEntry: (id) =>
        set((state) => ({
          customResistanceEntries: (state.customResistanceEntries || []).filter((e) => e.id !== id),
        })),

      // Entrées de maîtrise créées par le MJ
      customMaitriseEntries: [],

      addMaitriseEntry: (entry) =>
        set((state) => ({
          customMaitriseEntries: [
            ...(state.customMaitriseEntries || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateMaitriseEntry: (id, patch) =>
        set((state) => ({
          customMaitriseEntries: (state.customMaitriseEntries || []).map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteMaitriseEntry: (id) =>
        set((state) => ({
          customMaitriseEntries: (state.customMaitriseEntries || []).filter((e) => e.id !== id),
        })),

      // Archétypes (rôle principal d'une classe/sous-classe en jeu) —
      // liste plate avec hiérarchie par parentId (même convention que les
      // catégories d'objets) : un archétype racine (parentId nul) est un
      // archétype "Principal", un archétype enfant est un "Second"
      // (sous-archétype) rattaché à son parent.
      customArchetypes: [],

      addArchetype: (entry) =>
        set((state) => ({
          customArchetypes: [
            ...(state.customArchetypes || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateArchetype: (id, patch) =>
        set((state) => ({
          customArchetypes: (state.customArchetypes || []).map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteArchetype: (id) =>
        set((state) => ({
          customArchetypes: (state.customArchetypes || []).filter((e) => e.id !== id && e.parentId !== id),
        })),

      // États — contrairement au reste du contenu de référence (races,
      // compétences…) qui vit dans le blob game_data, les États ont leurs
      // propres tables Supabase dédiées (state_categories/states, voir
      // docs/supabase/010_states.sql), chargées via hydrateStates().
      customEtatCategories: [],
      customEtats: [],

      addEtatCategory: (category) => {
        const newCategory = { ...category, custom: true, createdAt: new Date().toISOString() };
        set((state) => ({ customEtatCategories: [...(state.customEtatCategories || []), newCategory] }));
        supabase.from('state_categories')
          .upsert({ key: newCategory.key, nom: newCategory.nom, couleur: newCategory.couleur, sous_classes: newCategory.sousClasses || [] })
          .then(({ error }) => { if (error) console.error('state_categories upsert failed', error); });
      },

      updateEtatCategory: (key, patch) => {
        let nextCategory = null;
        set((state) => ({
          customEtatCategories: (state.customEtatCategories || []).map((category) => {
            if (category.key !== key) return category;
            nextCategory = { ...category, ...patch, updatedAt: new Date().toISOString() };
            return nextCategory;
          }),
        }));
        if (nextCategory) {
          supabase.from('state_categories')
            .upsert({ key: nextCategory.key, nom: nextCategory.nom, couleur: nextCategory.couleur, sous_classes: nextCategory.sousClasses || [] })
            .then(({ error }) => { if (error) console.error('state_categories upsert failed', error); });
        }
      },

      // Un état peut appartenir à plusieurs catégories : supprimer une
      // catégorie ne doit pas effacer les états qui restent rattachés à
      // une autre catégorie — juste retirer la clé de leur liste. Seuls
      // les états qui n'ont plus aucune catégorie après ça sont supprimés.
      deleteEtatCategory: (key) => {
        const before = get().customEtats || [];
        const toDelete = before.filter((etat) => asArray(etat.categoryKeys).length <= 1 && asArray(etat.categoryKeys).includes(key));
        const toUpdate = before.filter((etat) => asArray(etat.categoryKeys).length > 1 && asArray(etat.categoryKeys).includes(key));

        set((state) => ({
          customEtatCategories: (state.customEtatCategories || []).filter((category) => category.key !== key),
          customEtats: (state.customEtats || [])
            .filter((etat) => !toDelete.some((d) => d.id === etat.id))
            .map((etat) => (
              toUpdate.some((u) => u.id === etat.id)
                ? { ...etat, categoryKeys: asArray(etat.categoryKeys).filter((k) => k !== key) }
                : etat
            )),
        }));

        supabase.from('state_categories').delete().eq('key', key)
          .then(({ error }) => { if (error) console.error('state_categories delete failed', error); });
        toDelete.forEach((etat) => {
          supabase.from('states').delete().eq('id', etat.id)
            .then(({ error }) => { if (error) console.error('states delete failed', error); });
        });
        toUpdate.forEach((etat) => {
          supabase.from('states').update({ category_keys: asArray(etat.categoryKeys).filter((k) => k !== key) }).eq('id', etat.id)
            .then(({ error }) => { if (error) console.error('states update failed', error); });
        });
      },

      addEtat: (etat) => {
        const newEtat = { ...etat, id: crypto.randomUUID(), custom: true, createdAt: new Date().toISOString() };
        set((state) => ({ customEtats: [...(state.customEtats || []), newEtat] }));
        supabase.from('states').insert({
          id: newEtat.id,
          category_keys: newEtat.categoryKeys || [],
          nom: newEtat.nom,
          tag_color: newEtat.tagColor,
          description: newEtat.description || '',
          effects: newEtat.effects || '',
          maitrise_keys: newEtat.maitriseKeys || [],
          removal_conditions: newEtat.removalConditions || [],
        }).then(({ error }) => { if (error) console.error('states insert failed', error); });
      },

      updateEtat: (id, patch) => {
        let nextEtat = null;
        set((state) => ({
          customEtats: (state.customEtats || []).map((etat) => {
            if (etat.id !== id) return etat;
            nextEtat = { ...etat, ...patch, updatedAt: new Date().toISOString() };
            return nextEtat;
          }),
        }));
        if (nextEtat) {
          supabase.from('states').update({
            category_keys: nextEtat.categoryKeys || [],
            nom: nextEtat.nom,
            tag_color: nextEtat.tagColor,
            description: nextEtat.description || '',
            effects: nextEtat.effects || '',
            maitrise_keys: nextEtat.maitriseKeys || [],
            removal_conditions: nextEtat.removalConditions || [],
          }).eq('id', id).then(({ error }) => { if (error) console.error('states update failed', error); });
        }
      },

      deleteEtat: (id) => {
        set((state) => ({ customEtats: (state.customEtats || []).filter((etat) => etat.id !== id) }));
        supabase.from('states').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('states delete failed', error); });
      },

      // Catégories d'objets (économie)
      customItemCategories: [],

      addItemCategory: (category) =>
        set((state) => ({
          customItemCategories: [
            ...(state.customItemCategories || []),
            { ...category, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateItemCategory: (id, patch) =>
        set((state) => ({
          customItemCategories: (state.customItemCategories || []).map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteItemCategory: (id) =>
        set((state) => ({
          customItemCategories: (state.customItemCategories || []).filter((c) => c.id !== id),
        })),

      // Entrées d'objets (économie)
      customItems: [],

      addItem: (item) =>
        set((state) => ({
          customItems: [
            ...(state.customItems || []),
            { ...item, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateItem: (id, patch) =>
        set((state) => ({
          customItems: (state.customItems || []).map((i) =>
            i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          customItems: (state.customItems || []).filter((i) => i.id !== id),
        })),

      // Classes d'objets (économie)
      customItemClasses: [],

      addItemClass: (entry) =>
        set((state) => ({
          customItemClasses: [
            ...(state.customItemClasses || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateItemClass: (id, patch) =>
        set((state) => ({
          customItemClasses: (state.customItemClasses || []).map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteItemClass: (id) =>
        set((state) => ({
          customItemClasses: (state.customItemClasses || []).filter((c) => c.id !== id),
        })),

      // Niveaux de rareté d'objets (économie)
      customItemRarities: [],

      addItemRarity: (entry) =>
        set((state) => ({
          customItemRarities: [
            ...(state.customItemRarities || []),
            { ...entry, id: Date.now(), custom: true, createdAt: new Date().toISOString() },
          ],
        })),

      updateItemRarity: (id, patch) =>
        set((state) => ({
          customItemRarities: (state.customItemRarities || []).map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
          ),
        })),

      deleteItemRarity: (id) =>
        set((state) => ({
          customItemRarities: (state.customItemRarities || []).filter((r) => r.id !== id),
        })),

      // Comptes joueurs préparés par le MJ
      playerAccounts: [],

      addPlayerAccount: (account) =>
        set((state) => ({
          playerAccounts: [
            ...(state.playerAccounts || []),
            {
              ...account,
              id: Date.now(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updatePlayerAccount: (id, patch) =>
        set((state) => ({
          playerAccounts: (state.playerAccounts || []).map((account) =>
            account.id === id ? { ...account, ...patch, updatedAt: new Date().toISOString() } : account
          ),
        })),

      deletePlayerAccount: (id) =>
        set((state) => ({
          playerAccounts: (state.playerAccounts || []).filter((account) => account.id !== id),
        })),

      activatePlayerAccount: (token) =>
        set((state) => ({
          playerAccounts: (state.playerAccounts || []).map((account) =>
            account.activationToken === token && account.status === 'pending'
              ? { ...account, status: 'active', activationToken: null, activatedAt: new Date().toISOString() }
              : account
          ),
        })),

      customRoles: [],
      systemRoleOverrides: {},

      addCustomRole: (role) => {
        const power = Object.values(role.permissions || {}).filter(Boolean).length * 5;
        const newRole = {
          ...role,
          power,
          id: Date.now(),
          custom: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          customRoles: [...(state.customRoles || []), newRole],
        }));
        syncRoleToSupabase({ key: newRole.key, label: newRole.label, power: newRole.power, system: false, permissions: newRole.permissions });
      },

      updateCustomRole: (id, patch) => {
        let updatedRole = null;
        set((state) => {
          const currentRole = (state.customRoles || []).find((role) => role.id === id);
          const nextRole = currentRole ? { ...currentRole, ...patch, updatedAt: new Date().toISOString() } : null;
          updatedRole = nextRole;
          return {
            customRoles: (state.customRoles || []).map((role) =>
              role.id === id ? nextRole : role
            ),
            playerAccounts: (state.playerAccounts || []).map((account) =>
              nextRole && account.role === currentRole?.key
                ? { ...account, role: nextRole.key, permissions: nextRole.permissions || {} }
                : account
            ),
          };
        });
        if (updatedRole) {
          syncRoleToSupabase({ key: updatedRole.key, label: updatedRole.label, power: updatedRole.power, system: false, permissions: updatedRole.permissions });
        }
      },

      deleteCustomRole: (id) => {
        const role = (get().customRoles || []).find((item) => item.id === id);
        set((state) => ({
          customRoles: (state.customRoles || []).filter((item) => item.id !== id),
          playerAccounts: (state.playerAccounts || []).map((account) =>
            account.role === role?.key ? { ...account, role: 'player', permissions: {} } : account
          ),
        }));
        if (role?.key) {
          supabase.from('roles').delete().eq('key', role.key)
            .then(({ error }) => { if (error) console.error('roles delete failed', error); });
        }
      },

      updateSystemRoleOverride: (key, patch) => {
        let nextOverride = null;
        set((state) => {
          nextOverride = {
            ...(state.systemRoleOverrides?.[key] || {}),
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          return {
            systemRoleOverrides: {
              ...(state.systemRoleOverrides || {}),
              [key]: nextOverride,
            },
            playerAccounts: (state.playerAccounts || []).map((account) =>
              account.role === key
                ? { ...account, permissions: nextOverride.permissions || account.permissions || {} }
                : account
            ),
          };
        });
        const defaultRole = DEFAULT_ACCOUNT_ROLES.find((role) => role.key === key);
        syncRoleToSupabase({
          key,
          label: nextOverride.label || defaultRole?.label || key,
          power: nextOverride.power ?? defaultRole?.power ?? 0,
          system: true,
          permissions: nextOverride.permissions || {},
        });
      },

      resetSystemRoleOverride: (key) => {
        set((state) => {
          const nextOverrides = { ...(state.systemRoleOverrides || {}) };
          delete nextOverrides[key];
          return { systemRoleOverrides: nextOverrides };
        });
        const defaultRole = DEFAULT_ACCOUNT_ROLES.find((role) => role.key === key);
        if (defaultRole) {
          syncRoleToSupabase({
            key: defaultRole.key,
            label: defaultRole.label,
            power: defaultRole.power,
            system: true,
            permissions: defaultRole.permissions,
          });
        }
      },

      appTickets: [],
      terminalLogs: [],

      addTerminalLog: (log) =>
        set((state) => ({
          terminalLogs: [
            {
              id: Date.now() + Math.random(),
              level: log.level || 'info',
              message: log.message || '',
              stack: log.stack || '',
              source: log.source || 'app',
              createdAt: new Date().toISOString(),
            },
            ...(state.terminalLogs || []),
          ].slice(0, 120),
        })),

      clearTerminalLogs: () => set({ terminalLogs: [] }),

      addAppTicket: (ticket) =>
        set((state) => {
          if (isDevServerNoise(ticket)) return {};

          const now = Date.now();
          const nowIso = new Date(now).toISOString();
          const nextTicket = {
            id: Date.now() + Math.random(),
            title: ticket.title || 'Erreur applicative',
            description: ticket.description || '',
            severity: ticket.severity || 'error',
            status: 'open',
            source: ticket.source || 'terminal',
            stack: ticket.stack || '',
            createdAt: nowIso,
            updatedAt: nowIso,
            lastSeenAt: nowIso,
            occurrences: 1,
          };
          const signature = buildTicketSignature(nextTicket);
          const existingTickets = (state.appTickets || []).filter((existing) => !isDevServerNoise(existing));
          const duplicate = existingTickets.find((existing) => {
            const existingSignature = existing.signature || buildTicketSignature(existing);
            return existingSignature === signature && now - getTicketTime(existing) <= TICKET_DEDUPE_WINDOW_MS;
          });

          if (duplicate) {
            return {
              appTickets: existingTickets.map((existing) =>
                existing.id === duplicate.id
                  ? {
                      ...existing,
                      signature,
                      status: existing.status || 'open',
                      lastSeenAt: nowIso,
                      updatedAt: nowIso,
                      occurrences: (existing.occurrences || 1) + 1,
                      stack: existing.stack || nextTicket.stack,
                    }
                  : existing
              ),
            };
          }

          return {
            appTickets: [
              {
                ...nextTicket,
                signature,
              },
              ...existingTickets,
            ],
          };
        }),

      updateAppTicket: (id, patch) =>
        set((state) => ({
          appTickets: (state.appTickets || []).filter((ticket) => !isDevServerNoise(ticket)).map((ticket) =>
            ticket.id === id ? { ...ticket, ...patch, updatedAt: new Date().toISOString() } : ticket
          ),
        })),

      deleteAppTicket: (id) =>
        set((state) => ({
          appTickets: (state.appTickets || []).filter((ticket) => !isDevServerNoise(ticket) && ticket.id !== id),
        })),

      clearAppTickets: () => set({ appTickets: [] }),

      purgeLocalGameData: () => set(() => ({ ...EMPTY_GAME_DATA_STATE })),

      exportGameDataSnapshot: () => buildGameDataSnapshot(get()),

      importGameDataSnapshot: (payload) =>
        set(() => ({
          ...EMPTY_GAME_DATA_STATE,
          ...normalizeImportedGameData(payload),
        })),
    }),
    {
      name: 'eindhill-admin-v1',
      version: ADMIN_STORE_VERSION,
      // Les données de jeu (GAME_DATA_STATE_KEYS) vivent maintenant dans
      // Supabase (table game_data), pas en localStorage — seul l'état
      // sécurité (comptes/rôles/tickets) reste persisté ici.
      partialize: (state) => preserveSecurityState(state),
      migrate: (persistedState, version) => {
        if (version < ADMIN_STORE_VERSION) return preserveSecurityState(persistedState);
        return persistedState;
      },
    },
  ),
);

// Charge le blob game_data depuis Supabase dans le store — à appeler une
// fois qu'un utilisateur est authentifié (RLS: lecture réservée aux
// comptes connectés).
export const hydrateGameData = async () => {
  const { data, error } = await supabase.from('game_data').select('data').eq('id', 1).maybeSingle();
  if (error) { console.error('game_data fetch failed', error); return; }
  const payload = data?.data || {};
  useAdminStore.setState(
    GAME_DATA_STATE_KEYS.reduce((next, key) => {
      next[key] = payload[key] !== undefined ? payload[key] : EMPTY_GAME_DATA_STATE[key];
      return next;
    }, {}),
  );
};

// Charge les rôles et leurs droits depuis Supabase (tables roles /
// role_permissions) dans le store — à appeler une fois qu'un utilisateur
// est authentifié (RLS: lecture réservée aux comptes avec manageRoles).
export const hydrateRoles = async () => {
  const [{ data: rolesRows, error: rolesError }, { data: permRows, error: permError }] = await Promise.all([
    supabase.from('roles').select('key, label, power, system'),
    supabase.from('role_permissions').select('role_key, permission_key, enabled'),
  ]);
  if (rolesError || permError) { console.error('roles hydrate failed', rolesError || permError); return; }

  const permsByRole = {};
  (permRows || []).forEach(({ role_key, permission_key, enabled }) => {
    if (!permsByRole[role_key]) permsByRole[role_key] = {};
    permsByRole[role_key][permission_key] = enabled;
  });

  const systemRoleOverrides = {};
  const customRoles = [];
  (rolesRows || []).forEach((row) => {
    const dbPermissions = permsByRole[row.key] || {};
    if (row.system) {
      // Une permission absente en base (ex: ajoutée au code après le seed
      // SQL initial, comme manageStorage/manageCombat pour gm) ne doit pas
      // être perdue : on part du défaut code puis on applique ce qui a
      // été explicitement écrit en base par-dessus.
      const defaultRole = DEFAULT_ACCOUNT_ROLES.find((role) => role.key === row.key);
      const permissions = { ...(defaultRole?.permissions || {}), ...dbPermissions };
      systemRoleOverrides[row.key] = { label: row.label, power: row.power, permissions };
    } else {
      customRoles.push({ id: row.key, key: row.key, label: row.label, power: row.power, custom: true, permissions: dbPermissions });
    }
  });

  useAdminStore.setState({ systemRoleOverrides, customRoles });
};

// Charge les catégories et entrées d'états depuis leurs tables Supabase
// dédiées (state_categories/states) — à appeler une fois qu'un
// utilisateur est authentifié.
export const hydrateStates = async () => {
  const [{ data: categoryRows, error: categoryError }, { data: stateRows, error: stateError }] = await Promise.all([
    supabase.from('state_categories').select('key, nom, couleur, sous_classes'),
    supabase.from('states').select('id, category_keys, nom, tag_color, description, effects, maitrise_keys, removal_conditions'),
  ]);
  if (categoryError || stateError) { console.error('states hydrate failed', categoryError || stateError); return; }

  useAdminStore.setState({
    customEtatCategories: (categoryRows || []).map((row) => ({
      key: row.key,
      nom: row.nom,
      couleur: row.couleur,
      sousClasses: row.sous_classes || [],
      custom: true,
    })),
    customEtats: (stateRows || []).map((row) => ({
      id: row.id,
      categoryKeys: row.category_keys || [],
      nom: row.nom,
      tagColor: row.tag_color,
      description: row.description || '',
      effects: row.effects || '',
      maitriseKeys: row.maitrise_keys || [],
      removalConditions: row.removal_conditions || [],
      custom: true,
    })),
  });
};

// Repousse le blob game_data vers Supabase à chaque changement effectif
// (comparaison JSON pour ignorer les changements d'état sécurité, qui ne
// touchent pas GAME_DATA_STATE_KEYS).
let lastGameDataJson = null;
let pushGameDataTimer = null;
useAdminStore.subscribe((state) => {
  const nextGameData = pickGameDataState(state);
  const nextJson = JSON.stringify(nextGameData);
  if (nextJson === lastGameDataJson) return;
  lastGameDataJson = nextJson;
  clearTimeout(pushGameDataTimer);
  pushGameDataTimer = setTimeout(() => {
    supabase.from('game_data').update({ data: nextGameData }).eq('id', 1)
      .then(({ error }) => { if (error) console.error('game_data update failed', error); });
  }, 300);
});
