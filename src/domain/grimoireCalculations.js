import { mergeTemporaryRows, getRanksAtLevel } from '../pages/admin/adminUtils';
import { DEFAULT_SPELL_TYPES, DEFAULT_SPELL_ZONES } from '../pages/admin/spellDefaults';

// Le Grimoire ne gère que les sorts magiques — les sorts physiques
// (compétences/techniques) sont gérés ailleurs.
export function getGrimoireContext(char, admin = {}) {
  const spellTypes = mergeTemporaryRows(DEFAULT_SPELL_TYPES, admin.customSpellTypes);
  const spellZones = mergeTemporaryRows(DEFAULT_SPELL_ZONES, admin.customSpellZones);
  const spellRanks = getRanksAtLevel(admin.customSpellRanks, char?.niveau ?? 0);
  const totalSlots = Number(char?.sortsMagiquesDisponibles) || 0;
  const usedSlots = (char?.sorts ?? []).length;
  const remainingSlots = Math.max(0, totalSlots - usedSlots);
  return { spellTypes, spellZones, spellRanks, totalSlots, usedSlots, remainingSlots };
}
