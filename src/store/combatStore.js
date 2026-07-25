import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const COMBAT_STAT_KEYS = ['atkPhysique', 'atkDistance', 'atkMagique', 'defPhysique', 'defMagique', 'esquive', 'initiative'];

// Même liste que les onglets de la fiche complète (DETAIL_TABS dans
// CharacterListPage.jsx) — tout ce qui existe sur la fiche doit pouvoir
// s'afficher dans un panneau condensé.
export const COMBAT_PANEL_TYPES = [
  'fiche', 'infos', 'stats', 'aptitudes', 'resistances', 'competences', 'grimoire', 'equipement', 'inventaire',
];
const DEFAULT_PANEL_SELECTION = ['inventaire', 'competences', 'grimoire'];

const blankStatBonus = () => Object.fromEntries(COMBAT_STAT_KEYS.map((key) => [key, 0]));
const blankOverrides = () => ({ resourceTemp: { vie: 0, mana: 0, endu: 0 }, statBonus: blankStatBonus(), caracBonus: {} });

// v1 local : pas de backend, l'état est partagé via localStorage (donc
// uniquement visible sur le même navigateur — utile pour tester le flux en
// changeant de compte). Les actions ci-dessous sont l'API publique du
// combat ; le jour où une synchro réseau (Supabase) sera branchée, seule
// leur implémentation change (appels réseau + souscription realtime au lieu
// de `set()` local), pas la façon dont les pages les consomment.
export const useCombatStore = create(
  persist(
    (set, get) => ({
      active: false,
      startedAt: null,
      startedBy: null,
      participants: {}, // { [userId]: characterId }

      // Modificateurs "live" propres au combat en cours, distincts des
      // valeurs permanentes du personnage — remis à zéro à chaque combat.
      // caracBonus est indexé par la clé (`cle`) des caractéristiques
      // configurées par le MJ (customCaracteristiques), donc pas de liste
      // fixe comme COMBAT_STAT_KEYS.
      statOverrides: {}, // { [characterId]: { resourceTemp: {vie,mana,endu}, statBonus: {...COMBAT_STAT_KEYS}, caracBonus: {...} } }

      // Préférence d'affichage des 3 panneaux condensés, par joueur.
      panelSelections: {}, // { [userId]: [type, type, type] }

      startCombat: (user) =>
        set({
          active: true,
          startedAt: new Date().toISOString(),
          startedBy: user?.id ?? null,
          participants: {},
          statOverrides: {},
        }),

      endCombat: () =>
        set({ active: false, participants: {}, statOverrides: {} }),

      // Rejoindre et changer de personnage sont la même action : upsert.
      setParticipantCharacter: (userId, characterId) =>
        set((state) => ({
          participants: { ...state.participants, [String(userId)]: characterId },
        })),

      leaveParticipant: (userId) =>
        set((state) => {
          const next = { ...state.participants };
          delete next[String(userId)];
          return { participants: next };
        }),

      getStatOverrides: (characterId) =>
        get().statOverrides[characterId] || blankOverrides(),

      setResourceTemp: (characterId, resourceKey, value) =>
        set((state) => {
          const current = state.statOverrides[characterId] || blankOverrides();
          return {
            statOverrides: {
              ...state.statOverrides,
              [characterId]: {
                ...current,
                resourceTemp: { ...current.resourceTemp, [resourceKey]: value },
              },
            },
          };
        }),

      setStatBonus: (characterId, statKey, value) =>
        set((state) => {
          const current = state.statOverrides[characterId] || blankOverrides();
          return {
            statOverrides: {
              ...state.statOverrides,
              [characterId]: {
                ...current,
                statBonus: { ...current.statBonus, [statKey]: value },
              },
            },
          };
        }),

      // Bonus/malus temporaire sur une caractéristique (Stats), configurable
      // à la volée pendant le combat — indexé par `cle`, pas de liste fixe
      // puisque les caractéristiques sont définies par le MJ.
      setCaracBonus: (characterId, cle, value) =>
        set((state) => {
          const current = state.statOverrides[characterId] || blankOverrides();
          return {
            statOverrides: {
              ...state.statOverrides,
              [characterId]: {
                ...current,
                caracBonus: { ...current.caracBonus, [cle]: value },
              },
            },
          };
        }),

      getPanelSelection: (userId) =>
        get().panelSelections[String(userId)] || DEFAULT_PANEL_SELECTION,

      setPanelSelection: (userId, index, type) =>
        set((state) => {
          const current = state.panelSelections[String(userId)] || DEFAULT_PANEL_SELECTION;
          const next = [...current];
          next[index] = type;
          return { panelSelections: { ...state.panelSelections, [String(userId)]: next } };
        }),
    }),
    { name: 'dndhill-combat-v1' },
  ),
);
