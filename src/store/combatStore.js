import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

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

// v2 réseau : la source de vérité vit dans Supabase (voir
// docs/supabase/017_combat_realtime.sql — 4 tables étroites, pas un blob
// JSON unique), ce store n'est qu'un miroir local tenu à jour par les
// événements Realtime (voir hydrateCombat plus bas). Les actions ci-dessous
// n'écrivent JAMAIS optimistiquement dans `set()` — uniquement vers
// Supabase — pour ne jamais diverger de ce que voient les autres clients.
export const useCombatStore = create((set, get) => ({
  active: false,
  startedAt: null,
  startedBy: null,
  participants: {}, // { [userId]: characterId }

  // Modificateurs "live" propres au combat en cours, distincts des valeurs
  // permanentes du personnage — remis à zéro à chaque combat.
  statOverrides: {}, // { [characterId]: { resourceTemp: {vie,mana,endu}, statBonus: {...COMBAT_STAT_KEYS}, caracBonus: {...} } }

  // Préférence d'affichage des 3 panneaux condensés, par joueur.
  panelSelections: {}, // { [userId]: [type, type, type] }

  startCombat: async (user) => {
    await Promise.all([
      supabase.from('combat_participants').delete().not('user_id', 'is', null),
      supabase.from('combat_stat_overrides').delete().not('character_id', 'is', null),
    ]);
    await supabase.from('combat_sessions').update({
      active: true,
      started_at: new Date().toISOString(),
      started_by: user?.id ?? null,
    }).eq('id', 1);
  },

  endCombat: async () => {
    await Promise.all([
      supabase.from('combat_participants').delete().not('user_id', 'is', null),
      supabase.from('combat_stat_overrides').delete().not('character_id', 'is', null),
    ]);
    await supabase.from('combat_sessions').update({ active: false }).eq('id', 1);
  },

  // Rejoindre et changer de personnage sont la même action : upsert.
  setParticipantCharacter: async (userId, characterId) => {
    await supabase.from('combat_participants').upsert({
      user_id: userId,
      character_id: characterId,
      updated_at: new Date().toISOString(),
    });
  },

  leaveParticipant: async (userId) => {
    await supabase.from('combat_participants').delete().eq('user_id', userId);
  },

  getStatOverrides: (characterId) =>
    get().statOverrides[characterId] || blankOverrides(),

  setResourceTemp: async (characterId, resourceKey, value) => {
    const current = get().statOverrides[characterId] || blankOverrides();
    await supabase.from('combat_stat_overrides').upsert({
      character_id: characterId,
      resource_temp: { ...current.resourceTemp, [resourceKey]: value },
      stat_bonus: current.statBonus,
      carac_bonus: current.caracBonus,
      updated_at: new Date().toISOString(),
    });
  },

  setStatBonus: async (characterId, statKey, value) => {
    const current = get().statOverrides[characterId] || blankOverrides();
    await supabase.from('combat_stat_overrides').upsert({
      character_id: characterId,
      resource_temp: current.resourceTemp,
      stat_bonus: { ...current.statBonus, [statKey]: value },
      carac_bonus: current.caracBonus,
      updated_at: new Date().toISOString(),
    });
  },

  // Bonus/malus temporaire sur une caractéristique (Stats), configurable à
  // la volée pendant le combat — indexé par `cle`, pas de liste fixe
  // puisque les caractéristiques sont définies par le MJ.
  setCaracBonus: async (characterId, cle, value) => {
    const current = get().statOverrides[characterId] || blankOverrides();
    await supabase.from('combat_stat_overrides').upsert({
      character_id: characterId,
      resource_temp: current.resourceTemp,
      stat_bonus: current.statBonus,
      carac_bonus: { ...current.caracBonus, [cle]: value },
      updated_at: new Date().toISOString(),
    });
  },

  getPanelSelection: (userId) =>
    get().panelSelections[String(userId)] || DEFAULT_PANEL_SELECTION,

  setPanelSelection: async (userId, index, type) => {
    const current = get().panelSelections[String(userId)] || DEFAULT_PANEL_SELECTION;
    const next = [...current];
    next[index] = type;
    await supabase.from('combat_panel_selections').upsert({ user_id: userId, panel_types: next });
  },
}));

// Charge l'état de combat courant depuis Supabase puis s'abonne à ses
// changements en temps réel — à appeler une fois qu'un utilisateur est
// authentifié (voir CharacterDataBridge dans App.jsx, comme
// hydrateGameData/hydrateRoles/hydrateStates). L'abonnement n'est créé
// qu'une fois : un ré-appel (ex: changement d'utilisateur) ne fait que
// rafraîchir l'état, il ne duplique pas le channel.
let combatChannel = null;

export const hydrateCombat = async () => {
  const [
    { data: session },
    { data: participantRows },
    { data: overrideRows },
    { data: panelRows },
  ] = await Promise.all([
    supabase.from('combat_sessions').select('active, started_at, started_by').eq('id', 1).maybeSingle(),
    supabase.from('combat_participants').select('user_id, character_id'),
    supabase.from('combat_stat_overrides').select('character_id, resource_temp, stat_bonus, carac_bonus'),
    supabase.from('combat_panel_selections').select('user_id, panel_types'),
  ]);

  useCombatStore.setState({
    active: session?.active ?? false,
    startedAt: session?.started_at ?? null,
    startedBy: session?.started_by ?? null,
    participants: Object.fromEntries((participantRows || []).map((r) => [String(r.user_id), r.character_id])),
    statOverrides: Object.fromEntries((overrideRows || []).map((r) => [r.character_id, {
      resourceTemp: r.resource_temp || { vie: 0, mana: 0, endu: 0 },
      statBonus: r.stat_bonus || blankStatBonus(),
      caracBonus: r.carac_bonus || {},
    }])),
    panelSelections: Object.fromEntries((panelRows || []).map((r) => [String(r.user_id), r.panel_types || DEFAULT_PANEL_SELECTION])),
  });

  if (combatChannel) return;
  combatChannel = supabase
    .channel('combat-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_sessions' }, (payload) => {
      const row = payload.new;
      if (!row || Object.keys(row).length === 0) return;
      useCombatStore.setState({ active: row.active, startedAt: row.started_at, startedBy: row.started_by });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_participants' }, (payload) => {
      useCombatStore.setState((state) => {
        const participants = { ...state.participants };
        if (payload.eventType === 'DELETE') delete participants[String(payload.old.user_id)];
        else participants[String(payload.new.user_id)] = payload.new.character_id;
        return { participants };
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_stat_overrides' }, (payload) => {
      useCombatStore.setState((state) => {
        const statOverrides = { ...state.statOverrides };
        if (payload.eventType === 'DELETE') {
          delete statOverrides[payload.old.character_id];
        } else {
          statOverrides[payload.new.character_id] = {
            resourceTemp: payload.new.resource_temp || { vie: 0, mana: 0, endu: 0 },
            statBonus: payload.new.stat_bonus || blankStatBonus(),
            caracBonus: payload.new.carac_bonus || {},
          };
        }
        return { statOverrides };
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_panel_selections' }, (payload) => {
      useCombatStore.setState((state) => {
        const panelSelections = { ...state.panelSelections };
        if (payload.eventType === 'DELETE') delete panelSelections[String(payload.old.user_id)];
        else panelSelections[String(payload.new.user_id)] = payload.new.panel_types || DEFAULT_PANEL_SELECTION;
        return { panelSelections };
      });
    })
    .subscribe();
};
