import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

// Chaque personnage est une ligne public.characters (id, user_id, status,
// requested_by, data jsonb) — `data` porte tout ce que le reste de l'appli
// connaît déjà (nom, classe, stats, inventaire, sorts…). On aplatit la ligne
// en un seul objet plat pour ne rien changer côté composants.
const rowToCharacter = (row) => ({
  ...(row.data || {}),
  id: row.id,
  userId: row.user_id,
  status: row.status,
  requestedBy: row.requested_by,
});

const characterDataOf = (character) => {
  const data = { ...character };
  delete data.id;
  delete data.userId;
  delete data.status;
  delete data.requestedBy;
  return data;
};

const persistCharacter = (character) => {
  supabase
    .from('characters')
    .update({ data: characterDataOf(character) })
    .eq('id', character.id)
    .then(({ error }) => { if (error) console.error('characters update failed', error); });
};

// set/get + un transform (ancien objet -> nouvel objet) : applique en local
// tout de suite (l'UI reste synchrone/instantanée) puis pousse la donnée
// complète du perso vers Supabase en arrière-plan.
const applyCharacterUpdate = (set, get, charId, updater) => {
  set((state) => ({
    characters: state.characters.map((c) => (c.id === charId ? updater(c) : c)),
  }));
  const updated = get().characters.find((c) => c.id === charId);
  if (updated) persistCharacter(updated);
};

export const useCharacterStore = create((set, get) => ({
  characters: [],
  activeCharacterId: null,
  pendingCharacterCreations: [],
  loaded: false,

  fetchCharacters: async () => {
    const { data, error } = await supabase.from('characters').select('*').eq('status', 'active');
    if (error) { console.error(error); return; }
    set({ characters: (data || []).map(rowToCharacter), loaded: true });
  },

  fetchPendingCharacterCreations: async () => {
    const { data, error } = await supabase.from('characters').select('*').eq('status', 'pending');
    if (error) { console.error(error); return; }
    set({ pendingCharacterCreations: (data || []).map(rowToCharacter) });
  },

  getCharactersForUser: (userId) =>
    get().characters.filter((c) => String(c.userId) === String(userId)),

  getCharacter: (id) =>
    get().characters.find((c) => c.id === id),

  setActive: (id) => set({ activeCharacterId: id }),

  levelUp: (charId, rewards) =>
    applyCharacterUpdate(set, get, charId, (c) => {
      const safeResource = (resource) => ({
        actuel: Number(resource?.actuel || 0),
        max: Number(resource?.max || 0),
      });
      const vie = safeResource(c.vie);
      const mana = safeResource(c.mana);
      const endu = safeResource(c.endu);
      const patch = {
        niveau: (c.niveau ?? 0) + 1,
        vie:  { ...c.vie,  max: vie.max  + (rewards.vie  || 0), actuel: vie.actuel  + (rewards.vie  || 0) },
        mana: { ...c.mana, max: mana.max + (rewards.mana || 0), actuel: mana.actuel + (rewards.mana || 0) },
        endu: { ...c.endu, max: endu.max + (rewards.endu || 0), actuel: endu.actuel + (rewards.endu || 0) },
        pointsCarac: (c.pointsCarac || 0) + (rewards.pointsCarac || 0),
        sortsPhysiquesDisponibles: (c.sortsPhysiquesDisponibles || 0) + (rewards.sortsPhysiques || 0),
        sortsMagiquesDisponibles: (c.sortsMagiquesDisponibles || 0) + (rewards.sortsMagiques || 0),
        competencesDisponibles: (c.competencesDisponibles || 0) + (rewards.competences || 0),
        ...(rewards.classe ? { classe: rewards.classe } : {}),
        ...(rewards.sousClasse ? { sousClasse: rewards.sousClasse } : {}),
        ...(rewards.maitrise ? { maitrise: rewards.maitrise } : {}),
        levelUpDraft: null,
        levelUpHistory: [
          ...(c.levelUpHistory || []),
          {
            level: (c.niveau ?? 0) + 1,
            resourceKey: rewards.resourceKey,
            resourceLabel: rewards.resourceLabel,
            formula: rewards.formula,
            roll: rewards.roll,
            pointsCarac: rewards.pointsCarac || 0,
            sortsPhysiques: rewards.sortsPhysiques || 0,
            sortsMagiques: rewards.sortsMagiques || 0,
            competences: rewards.competences || 0,
            classe: rewards.classe || c.classe,
            sousClasse: rewards.sousClasse || c.sousClasse,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      return { ...c, ...patch };
    }),

  updateCharacter: (id, patch) =>
    applyCharacterUpdate(set, get, id, (c) => ({ ...c, ...patch })),

  addCharacter: async (character) => {
    const payload = {
      user_id: character.userId,
      status: 'active',
      data: characterDataOf(character),
    };
    const { data, error } = await supabase.from('characters').insert(payload).select().single();
    if (error) { console.error(error); return null; }
    const created = rowToCharacter(data);
    set((state) => ({ characters: [...state.characters, created], activeCharacterId: created.id }));
    return created.id;
  },

  submitCharacterCreation: async (character, user) => {
    const requesterId = user?.id ?? character.userId;
    const payload = {
      user_id: character.userId ?? requesterId,
      status: 'pending',
      requested_by: requesterId,
      data: {
        ...characterDataOf(character),
        requestedByName: user?.name || user?.username || 'Joueur',
        submittedAt: new Date().toISOString(),
      },
    };
    const { data, error } = await supabase.from('characters').insert(payload).select().single();
    if (error) { console.error(error); return null; }
    const created = rowToCharacter(data);
    set((state) => ({ pendingCharacterCreations: [...(state.pendingCharacterCreations || []), created] }));
    return created.id;
  },

  approveCharacterCreation: async (pendingId, reviewer) => {
    const pending = (get().pendingCharacterCreations || []).find((item) => item.id === pendingId);
    if (!pending) return null;
    const nextData = {
      ...characterDataOf(pending),
      approvedBy: reviewer?.id,
      approvedByName: reviewer?.name || reviewer?.username,
      approvedAt: new Date().toISOString(),
    };
    delete nextData.requestedByName;
    const { data, error } = await supabase
      .from('characters')
      .update({ status: 'active', data: nextData })
      .eq('id', pendingId)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    const approved = rowToCharacter(data);
    set((state) => ({
      characters: [...state.characters, approved],
      pendingCharacterCreations: (state.pendingCharacterCreations || []).filter((item) => item.id !== pendingId),
      activeCharacterId: approved.id,
    }));
    return approved;
  },

  rejectCharacterCreation: async (pendingId) => {
    set((state) => ({
      pendingCharacterCreations: (state.pendingCharacterCreations || []).filter((item) => item.id !== pendingId),
    }));
    const { error } = await supabase.from('characters').delete().eq('id', pendingId);
    if (error) console.error(error);
  },

  deleteCharacter: (id) => {
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
      activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId,
    }));
    supabase.from('characters').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  },

  addInventoryItem: (charId, item) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, inventaire: [...c.inventaire, { ...item, id: Date.now() }],
    })),

  removeInventoryItem: (charId, itemId) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, inventaire: c.inventaire.filter((i) => i.id !== itemId),
    })),

  updateInventoryItem: (charId, itemId, patch) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c,
      inventaire: c.inventaire.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    })),

  equipItem: (charId, slot, item) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, equipement: { ...(c.equipement ?? {}), [slot]: item },
    })),

  unequipSlot: (charId, slot) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, equipement: { ...(c.equipement ?? {}), [slot]: null },
    })),

  // Equipping an item from the inventory grid removes it from the
  // inventaire array (it isn't "in the bag" anymore) — whatever was
  // already in that slot goes back into the inventory. `item` is the
  // (possibly slot-normalized) equip payload; its id is used to find
  // and remove the matching inventaire entry.
  equipFromInventory: (charId, slot, item) =>
    applyCharacterUpdate(set, get, charId, (c) => {
      const inv = c.inventaire ?? [];
      if (!inv.some((i) => String(i.id) === String(item.id))) return c;
      const previouslyEquipped = c.equipement?.[slot] ?? null;
      const nextInv = inv.filter((i) => String(i.id) !== String(item.id));
      if (previouslyEquipped) nextInv.push({ ...previouslyEquipped, slotIndex: undefined });
      return {
        ...c,
        inventaire: nextInv,
        equipement: { ...(c.equipement ?? {}), [slot]: item },
      };
    }),

  // Unequipping puts the item back in the inventory grid.
  unequipToInventory: (charId, slot) =>
    applyCharacterUpdate(set, get, charId, (c) => {
      const equipped = c.equipement?.[slot];
      if (!equipped) return c;
      return {
        ...c,
        inventaire: [...(c.inventaire ?? []), { ...equipped, slotIndex: undefined }],
        equipement: { ...(c.equipement ?? {}), [slot]: null },
      };
    }),

  addSpell: (charId, spell) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, sorts: [...c.sorts, { ...spell, id: Date.now() }],
    })),

  removeSpell: (charId, spellId) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, sorts: c.sorts.filter((s) => s.id !== spellId),
    })),

  updateSpell: (charId, spellId, patch) =>
    applyCharacterUpdate(set, get, charId, (c) => ({
      ...c, sorts: c.sorts.map((s) => (s.id === spellId ? { ...s, ...patch } : s)),
    })),
}));
