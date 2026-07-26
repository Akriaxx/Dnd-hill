// Données par défaut du Grimoire (Rangs, Types, Zones) — partagées entre les
// panneaux admin (SpellRanksPanel, SpellTypesPanel, SpellZonesPanel) et le
// wizard joueur (GrimoireBook). Isolées dans un fichier sans composant pour
// ne pas casser le Fast Refresh.
//
// Aucune donnée par défaut : rangs, types de sort, types d'action,
// spécialités et zones sont tous créés depuis l'admin (Gestion du Donjon
// → Grimoire).
export const DEFAULT_SPELL_RANKS = [];
export const DEFAULT_SPELL_TYPES = [];
export const DEFAULT_ACTION_TYPES = [];
export const DEFAULT_SPECIALITES = [];
export const DEFAULT_SPELL_ZONES = [];

export const SPELL_ZONE_COLUMNS = 11;
export const SPELL_ZONE_ROWS = 11;
export const SPELL_ZONE_CELL_COUNT = SPELL_ZONE_COLUMNS * SPELL_ZONE_ROWS;
export const DEFAULT_SPELL_ZONE_PLAYER = Math.floor(SPELL_ZONE_CELL_COUNT / 2);
