import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import CreationInfoSelect from '../components/ui/CreationInfoSelect';
import FormulaInput from '../components/ui/FormulaInput';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import { isDevServerNoise, useAdminStore } from '../store/adminStore';
import { supabase } from '../lib/supabaseClient';
import {
  canAccessAdmin,
  canManageCombat,
  canReviewCharacterCreations,
  canViewAllCharacters,
  canViewCharacter,
} from '../auth/permissions';
import { useCombatStore } from '../store/combatStore';
import { SmartText } from '../components/admin/SmartDescEditor';
import ItemEffectSummary from '../components/admin/ItemEffectSummary';
import EquipementPanel, {
  CatSVG,
  getInventoryItemCategory,
  getItemEquipType,
  getItemRarityColor,
  getItemEffectLookupOptions,
} from '../components/equip/EquipementPanel';
import {
  APTITUDES,
  APT_CATEGORIES,
  ASCENDANCE_DATA,
  ASCENDANCES,
  CLASS_NAMES,
  CLASSES,
  HISTORIQUE_DATA,
  MAITRISE_DATA,
  ORIGIN_DATA,
  PROVENANCE_DATA,
  RACE_DATA,
  RACES,
  RESISTANCES_DEF,
  SEXES,
  SOUS_CLASSES,
} from '../data/gameData';
import {
  STAT_KEYS,
  getAptitudeBreakdown,
  getAscendanceDefinition,
  getChance,
  getClassDefinition,
  getCombatStats,
  getComputedAptitudeBonuses,
  getComputedLanguageRows,
  getComputedResistanceBonuses,
  getMovementData,
  getRaceDefinition,
  getResourceData,
  getResistanceBreakdown,
  getSubclassDefinition,
  getStatBreakdown,
  signed,
  statLabel,
} from '../domain/characterCalculations';
import { getGrimoireContext } from '../domain/grimoireCalculations';
import logoEindhill from '../assets/logo/logo-eindhill-transparent.png';

// prettier-ignore
const DETAIL_TABS = [
  'Fiche',
  'Infos',
  'Stats',
  'Aptitudes',
  'Résistances',
  'Compétences',
  'Grimoire',
  'Équipement',
  'Inventaire',
];
const DETAIL_CLEAN_MS = 620;
const DETAIL_RESIZE_MS = 820;
const DETAIL_SHIFT_MS = 920;
const DETAIL_PANEL_MS = 620;
const CREATION_TABS = ['Identité', 'Stats', 'Aptitudes'];
const DEFAULT_PORTRAIT = { url: '', zoom: 1, x: 50, y: 50 };
const GrimoireBook = lazy(() => import('../components/grimoire/GrimoireBook'));
const slugifyKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const EXPLORER_CLASS = {
  nom: 'Explorateur',
  type: 'Novice',
  vie: 8,
  mana: 8,
  endu: 8,
  physique: 'FOR',
  magique: 'CHA',
  nombreSortsMagiques: 0,
  nombreSortsPhysiques: 0,
  nombreCompetences: 0,
  resourceDice: { vie: '1d8', mana: '1d8', endu: '1d8' },
};

const getLevelZeroRule = (rules = []) =>
  (rules || []).find((rule) => Number(rule.level) === 0) || null;

const getLevelRuleBaseClass = (rule) =>
  rule?.baseClass || rule?.classe || rule?.className || EXPLORER_CLASS.nom;

const getLevelRuleCharacterPoints = (rule) =>
  Number(
    rule?.characterPoints ??
      rule?.pointsCarac ??
      rule?.caracPoints ??
      rule?.statPoints ??
      rule?.characteristicPoints ??
      0
  ) || 0;

const numberOrFallback = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getAptitudeChoiceSlots = (ascendance, race) => {
  const choices = ascendance?.aptitudeChoices || race?.aptitudeChoices || {};
  const isPremiersHommes = normalizeLocalKey(ascendance?.nom) === 'premiers-hommes';

  return {
    plusOne: numberOrFallback(
      choices.plusOne ?? ascendance?.aptitudePlusOne ?? ascendance?.plusOneChoices,
      isPremiersHommes ? 4 : 1
    ),
    plusTwo: numberOrFallback(
      choices.plusTwo ?? ascendance?.aptitudePlusTwo ?? ascendance?.plusTwoChoices,
      isPremiersHommes ? 0 : 1
    ),
  };
};

const stripIdentityLead = (text = '') =>
  String(text || '').replace(/^\s*\[[^\]]+\]\s*[–-]\s*/u, '').trim();

const normalizeLocalKey = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function normalizePortrait(portrait) {
  const zoom = Math.min(2.8, Math.max(1, Number(portrait?.zoom) || DEFAULT_PORTRAIT.zoom));
  const clampPosition = (value, fallback) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : fallback;
    return Math.min(100, Math.max(0, safe));
  };

  return {
    ...DEFAULT_PORTRAIT,
    ...(portrait ?? {}),
    zoom,
    x: clampPosition(portrait?.x, DEFAULT_PORTRAIT.x),
    y: clampPosition(portrait?.y, DEFAULT_PORTRAIT.y),
  };
}

function getClassBase(classe) {
  if (classe === EXPLORER_CLASS.nom) return EXPLORER_CLASS;
  return CLASSES.find((c) => c.nom === classe) || CLASSES[0] || {};
}

function getRaceBase(race) {
  return getRaceDefinition(race) || {};
}

function getCombinedRaceBase(race, customRaces = []) {
  return {
    ...getRaceBase(race),
    ...(findByName(customRaces, race) || {}),
  };
}

function getCombinedAscendanceBase(ascendance, customAscendances = []) {
  return {
    ...(getAscendanceDefinition(ascendance) || {}),
    ...(findByName(customAscendances, ascendance) || {}),
  };
}

function getMovementBaseValue(source) {
  const value =
    source?.deplacement ??
    source?.baseDeplacement ??
    source?.movement ??
    source?.baseMovement;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ascendanceOverridesMovement(source) {
  return Boolean(
    source?.replaceRaceMovement ??
      source?.replaceRaceDeplacement ??
      source?.overrideRaceMovement ??
      source?.overrideRaceDeplacement
  );
}

function resolveMovementBase(char, customRaces = [], customAscendances = []) {
  const raceData = getCombinedRaceBase(char?.race, customRaces);
  const ascendanceData = getCombinedAscendanceBase(char?.ascendance, customAscendances);
  const raceMove = getMovementBaseValue(raceData);
  const ascendanceMove = getMovementBaseValue(ascendanceData);

  if (ascendanceMove != null && ascendanceOverridesMovement(ascendanceData)) {
    return ascendanceMove;
  }

  return raceMove ?? ascendanceMove ?? 15;
}

function normalizeCreationNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildBaseCharacterDraft(char, context = {}) {
  const { customRaces = [], customAscendances = [] } = context;
  const classData = getClassBase(char.classe);
  const vie = normalizeCreationNumber(classData.vie, 0);
  const mana = normalizeCreationNumber(classData.mana, 0);
  const endu = normalizeCreationNumber(classData.endu, 0);
  const deplacement = resolveMovementBase(char, customRaces, customAscendances);

  return {
    ...char,
    portrait: normalizePortrait(char.portrait),
    niveau: 0,
    chance: normalizeCreationNumber(char.chance, 0),
    vie: { actuel: vie, max: vie },
    mana: { actuel: mana, max: mana },
    endu: { actuel: endu, max: endu },
    deplacement: { base: deplacement, bonus: 0, objectBonus: 0, tempBonus: 0, malus: 0, objectMalus: 0, tempMalus: 0 },
    emplacements: { base: 50, bonus: 0, objectBonus: 0, tempBonus: 0, malus: 0, objectMalus: 0, tempMalus: 0 },
    competences: [],
    connaissances: [],
    langues: [],
    competencesSousClasse: [],
    actionsRapide: [],
    actions: [],
    resistances: {},
    inventaire: [],
    sorts: [],
    equipement: {},
    bourse: 0,
    notesEquipement: '',
  };
}

function makeBlankCharacter(userId) {
  const classe = EXPLORER_CLASS.nom;
  const race = RACES[0];
  return buildBaseCharacterDraft({
    userId,
    nom: '',
    sexe: SEXES[0],
    race,
    ascendance: ASCENDANCES[race]?.[0] || '',
    classe,
    sousClasse: '',
    niveau: 0,
    chance: 0,
    naissance: '',
    provenance: '',
    origine: '',
    historique: '',
    maitrise: '',
    taille: '',
    poids: '',
    age: '',
    stats: { FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 },
    aptitudes: {},
    competencesInnees: {
      spécialeClasse: null,
      classe: [],
      race: [],
      ascendance: [],
      origine: [],
      historique: [],
      armement: [],
      equipement: [],
    },
    isBoss: false,
  });
}

function cloneEditableCharacter(char) {
  return {
    ...char,
    vie: { ...(char.vie ?? { actuel: 0, max: 0 }) },
    mana: { ...(char.mana ?? { actuel: 0, max: 0 }) },
    endu: { ...(char.endu ?? { actuel: 0, max: 0 }) },
    stats: { ...(char.stats ?? {}) },
    portrait: normalizePortrait(char.portrait),
    competences: [...(char.competences ?? [])],
    connaissances: [...(char.connaissances ?? [])],
    langues: [...(char.langues ?? [])],
    competencesSousClasse: [...(char.competencesSousClasse ?? [])],
    actionsRapide: [...(char.actionsRapide ?? [])],
    actions: [...(char.actions ?? [])],
    resistances: { ...(char.resistances ?? {}) },
    inventaire: [...(char.inventaire ?? [])],
    sorts: [...(char.sorts ?? [])],
    equipement: { ...(char.equipement ?? {}) },
  };
}

function AvatarIcon() {
  return (
    <svg
      className="select-avatar-icon"
      viewBox="0 0 140 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="70" cy="44" rx="30" ry="32" stroke="currentColor" strokeWidth="3" />
      <path
        d="M16 180c0-29.823 24.177-54 54-54h0c29.823 0 54 24.177 54 54"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="38" y="90" width="64" height="72" rx="14" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function PortraitFrame({ portrait }) {
  const image = normalizePortrait(portrait);

  if (!image.url) return <AvatarIcon />;

  return (
    <div className="select-avatar-media" aria-hidden="true">
      <img
        className="select-avatar-image"
        src={image.url}
        alt=""
        style={{
          objectPosition: `${image.x}% ${image.y}%`,
          transform: `scale(${image.zoom})`,
        }}
      />
    </div>
  );
}


function CharCard({ char, onOpen, ownerName, portraitOverride, portraitEditor }) {
  const isPending = Boolean(char.__pending || char.status === 'pending');
  const portrait = portraitOverride || char.portrait;
  const customCaracteristiques = useAdminStore((s) => s.customCaracteristiques);
  const caracsDef = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const dragRef = useRef(null);
  const avatarRef = useRef(null);
  const isEditing = portraitEditor?.open;
  const status = portraitEditor?.status;
  const draft = normalizePortrait(portraitEditor?.draft);

  const updateDraft = (field, value) => {
    const next = normalizePortrait({ ...draft, [field]: field === 'url' ? value : Number(value) });
    portraitEditor?.onChange(next);
    if (field === 'url') portraitEditor?.onStatus(next.url.trim() ? 'loading' : 'idle');
  };

  const startPortraitDrag = (event) => {
    if (!isEditing || status !== 'ready') return;
    if (event.target.closest('button, input, label, .portrait-url-above, .portrait-zoom-col, .portrait-frame-actions')) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const start = normalizePortrait(portraitEditor.draft);
    dragRef.current = { rect, startX: event.clientX, startY: event.clientY, portrait: start };

    const move = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // object-position: dragging right moves image right → x decreases (left=0%, right=100%)
      const dx = -((moveEvent.clientX - drag.startX) / drag.rect.width) * 100 / drag.portrait.zoom;
      const dy = -((moveEvent.clientY - drag.startY) / drag.rect.height) * 100 / drag.portrait.zoom;
      portraitEditor.onChange(normalizePortrait({
        ...drag.portrait,
        x: drag.portrait.x + dx,
        y: drag.portrait.y + dy,
      }));
    };

    const stop = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const avatarEl = (
    <div
      ref={avatarRef}
      className={`select-avatar${isEditing && status === 'ready' ? ' is-portrait-dragging' : ''}`}
      onPointerDown={startPortraitDrag}
    >
      <PortraitFrame portrait={portrait} />
      {portraitEditor?.enabled && !isEditing && (
        <button
          className="portrait-frame-edit"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            portraitEditor.onOpen();
          }}
        >
          Modifier l'image
        </button>
      )}
      <div className="select-avatar-name">{char.nom}</div>
      {isPending && (
        <div className="select-pending-label">
          Fiche en attente de validation
        </div>
      )}
      {ownerName && (
        <div className="select-avatar-owner">
          <span className="gm-badge">👤 {ownerName}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={`select-card${char.isBoss ? ' boss-card' : ''}${isPending ? ' pending-card' : ''}${isEditing ? ' is-portrait-editing' : ''}`}>
      {isEditing && (
        <div className="portrait-url-above" onClick={(e) => e.stopPropagation()}>
          <input
            type="url"
            value={draft.url}
            placeholder="https://..."
            onChange={(e) => updateDraft('url', e.target.value)}
          />
          {draft.url && (
            <img
              className="portrait-side-loader"
              src={draft.url}
              alt=""
              onLoad={() => portraitEditor.onStatus('ready')}
              onError={() => portraitEditor.onStatus('error')}
            />
          )}
          <span className={`portrait-side-status is-${status}`}>
            {status === 'idle' && 'Colle une URL.'}
            {status === 'loading' && 'Chargement...'}
            {status === 'ready' && "Glisse pour cadrer."}
            {status === 'error' && 'URL invalide.'}
          </span>
        </div>
      )}
      {isEditing ? (
        <div className="portrait-body-row">
          {avatarEl}
          <div className="portrait-zoom-col" onClick={(e) => e.stopPropagation()}>
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="2.8"
              step="0.01"
              value={draft.zoom}
              onChange={(e) => updateDraft('zoom', e.target.value)}
            />
          </div>
        </div>
      ) : avatarEl}
      {isEditing && (
        <div className="portrait-frame-actions" onClick={(e) => e.stopPropagation()}>
          <button className="portrait-remove-action" type="button" onClick={portraitEditor.onRemove}>
            Supprimer
          </button>
          <button type="button" onClick={portraitEditor.onCancel}>Annuler</button>
          <button type="button" disabled={status !== 'ready'} onClick={portraitEditor.onSave}>
            Valider
          </button>
        </div>
      )}
      <div className="select-card-footer">
        {isPending ? (
          <div className="select-card-meta">Validation MJ requise</div>
        ) : (
          <>
            <div className="select-card-identity">
              <span>{char.classe}</span>
              <span className="select-card-sep">✦</span>
              <span>{char.race}</span>
            </div>
            <div className="select-card-level">Niveau {char.niveau}</div>
          </>
        )}
        {caracsDef.length > 0 && (
          <div className="select-stats-strip">
            {caracsDef.map((c) => (
              <div className="select-stat" key={c.cle}>
                <div className="select-stat-val">{char.stats?.[c.cle] ?? '—'}</div>
                <div className="select-stat-key">{c.cle}</div>
              </div>
            ))}
          </div>
        )}
        <button className="select-enter-btn" onClick={onOpen} disabled={isPending}>
          {isPending ? 'Fiche verrouillée' : 'Consulter la fiche'}
        </button>
      </div>
    </div>
  );
}

function NewCharCard({ onOpen }) {
  return (
    <div className="select-card new-char-card" onClick={onOpen}>
      <div className="select-new-body">
        <div className="select-new-ring">
          <span className="select-new-cross">+</span>
        </div>
        <div className="select-new-title">Nouveau Personnage</div>
        <div className="select-new-sub">Commencer une nouvelle aventure</div>
      </div>
      <div className="select-card-footer">
        <button className="select-enter-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          Créer une fiche
        </button>
      </div>
    </div>
  );
}

function useCarousel(total) {
  const [rawIndex, setRawIndex] = useState(0);
  const index = Math.min(rawIndex, Math.max(0, total - 1));

  const goToIndex = useCallback(
    (next) => {
      if (next < 0 || next >= total) return;
      setRawIndex(next);
    },
    [total],
  );

  const go = useCallback(
    (dir) => goToIndex(rawIndex + (dir === 'right' ? 1 : -1)),
    [goToIndex, rawIndex],
  );

  return { index, go, goToIndex };
}

export default function CharacterListPage() {
  const user = useAuthStore((s) => s.user);
  const characters           = useCharacterStore((s) => s.characters);
  const getCharactersForUser = useCharacterStore((s) => s.getCharactersForUser);
  const setActive            = useCharacterStore((s) => s.setActive);
  const updateCharacter      = useCharacterStore((s) => s.updateCharacter);
  const addCharacter         = useCharacterStore((s) => s.addCharacter);
  const submitCharacterCreation = useCharacterStore((s) => s.submitCharacterCreation);
  const deleteCharacter      = useCharacterStore((s) => s.deleteCharacter);
  const pendingCharacterCreations = useCharacterStore((s) => s.pendingCharacterCreations || []);
  const [playerAccounts, setPlayerAccounts] = useState([]);
  useEffect(() => {
    supabase.from('profiles').select('id, username, display_name').then(({ data }) => setPlayerAccounts(data || []));
  }, []);
  const customRoles          = useAdminStore((s) => s.customRoles || []);
  const systemRoleOverrides  = useAdminStore((s) => s.systemRoleOverrides || {});
  const openTickets          = useAdminStore((s) => (s.appTickets || []).filter((ticket) => !isDevServerNoise(ticket) && ticket.status !== 'closed').length);
  const terminalErrors       = useAdminStore((s) => (s.terminalLogs || []).filter((log) => log.level === 'error').length);
  const navigate = useNavigate();

  const combatActive = useCombatStore((s) => s.active);
  const startCombat = useCombatStore((s) => s.startCombat);
  const endCombat = useCombatStore((s) => s.endCombat);

  const hasAdminAccess = canAccessAdmin(user, customRoles, systemRoleOverrides);
  const hasCombatAccess = canManageCombat(user, customRoles, systemRoleOverrides);
  const hasReviewAccess = canReviewCharacterCreations(user, customRoles, systemRoleOverrides);
  const canSeeAllCharacters = canViewAllCharacters(user, customRoles, systemRoleOverrides);
  const errorCount = Math.max(openTickets, terminalErrors);
  const pendingReviewCount = pendingCharacterCreations.filter((char) => char.status === 'pending').length;
  const [gmViewAll, setGmViewAll] = useState(false);

  const allChars = canSeeAllCharacters && gmViewAll
    ? characters
    : getCharactersForUser(user?.id);
  const pendingChars = pendingCharacterCreations
    .filter((char) => char.status === 'pending')
    .filter((char) => {
      if (canViewCharacter(user, char, customRoles, systemRoleOverrides)) return true;
      return canSeeAllCharacters && gmViewAll;
    })
    .map((char) => ({ ...char, __pending: true }));
  const visibleChars = [...allChars, ...pendingChars].sort((a, b) => {
    const aOwn = String(a.userId) === String(user?.id) || String(a.requestedBy) === String(user?.id);
    const bOwn = String(b.userId) === String(user?.id) || String(b.requestedBy) === String(user?.id);
    if (aOwn !== bOwn) return aOwn ? -1 : 1;
    return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' });
  });

  // ── Filter state ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState('');
  const [raceFilter, setRaceFilter] = useState('');
  const [joueurFilter, setJoueurFilter] = useState('');
  const [detailChar, setDetailChar] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [detailPhase, setDetailPhase] = useState(null);
  const [detailTab, setDetailTab] = useState('Fiche');
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [portraitFrameEditorOpen, setPortraitFrameEditorOpen] = useState(false);
  const [portraitFrameDraft, setPortraitFrameDraft] = useState(null);
  const [portraitFrameStatus, setPortraitFrameStatus] = useState('idle');
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [pendingToastVisible, setPendingToastVisible] = useState(false);
  const detailTimersRef = useRef([]);
  const stageRef         = useRef(null);
  const prevPendingReviewCountRef = useRef(pendingReviewCount);

  useEffect(() => () => detailTimersRef.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!hasAdminAccess || errorCount <= 0) return undefined;
    setErrorToastVisible(true);
    const timer = setTimeout(() => setErrorToastVisible(false), 6200);
    return () => clearTimeout(timer);
  }, [hasAdminAccess, errorCount, user?.id]);

  // Front montant uniquement (comme CombatActivationOverlay pour "active") :
  // on ne veut prévenir que d'une fiche VIENT d'être soumise, pas rappeler
  // à chaque montage/refresh qu'il y a déjà des fiches en attente — ça,
  // c'est le rôle du badge sur la section admin, pas d'un toast.
  useEffect(() => {
    const prevCount = prevPendingReviewCountRef.current;
    prevPendingReviewCountRef.current = pendingReviewCount;
    if (!hasReviewAccess || pendingReviewCount <= prevCount) return undefined;
    setPendingToastVisible(true);
    const timer = setTimeout(() => setPendingToastVisible(false), 6200);
    return () => clearTimeout(timer);
  }, [hasReviewAccess, pendingReviewCount]);

  const allClasses = [EXPLORER_CLASS.nom, ...CLASS_NAMES.filter((classe) => classe !== EXPLORER_CLASS.nom)];
  const allRaces   = RACES;

  const liveDetailChar = detailChar?.id
    ? characters.find((c) => c.id === detailChar.id)
    : null;

  const NEW_CHAR = { __new: true };

  const allKnownPlayers = playerAccounts.map((a) => ({ id: a.id, name: a.display_name || a.username }));

  // Liste des joueurs présents dans les personnages visibles
  const availablePlayers = allKnownPlayers.filter((u) =>
    visibleChars.some((c) => String(c.userId) === String(u.id))
  );

  const filteredChars = visibleChars.filter((c) => {
    const matchClasse  = !classeFilter  || c.classe === classeFilter;
    const matchRace    = !raceFilter    || c.race   === raceFilter;
    const matchSearch  = !search || (c.nom || '').toLowerCase().includes(search.toLowerCase());
    const matchJoueur  = !joueurFilter  || String(c.userId) === joueurFilter;
    return matchClasse && matchRace && matchSearch && matchJoueur;
  });

  // La carte "nouveau personnage" apparaît toujours en dernier
  const items = [...filteredChars, NEW_CHAR];
  const hasCharacters = visibleChars.length > 0;
  const hasMultipleItems = items.length > 1;

  const { index, go, goToIndex } = useCarousel(items.length);

  const canLeft  = index > 0;
  const canRight = index < items.length - 1;

  const commitDetailPatch = (patch) => {
    if (!detailChar?.id) return;
    updateCharacter(detailChar.id, patch);
    setDetailChar((currentChar) => (currentChar ? { ...currentChar, ...patch } : currentChar));
  };

  // Calcule et injecte les CSS vars d'animation dans le stage
  const applyDetailVars = () => {
    const el = stageRef.current;
    if (!el) return;
    const W  = el.offsetWidth;
    const stageRect = el.getBoundingClientRect();
    const cardRect = el.querySelector('.select-card-col')?.getBoundingClientRect();
    const ratio = W < 800 ? 0.24 : W < 1100 ? 0.28 : W < 1300 ? 0.32 : 0.35;
    const C   = Math.min(393, Math.max(213, Math.floor(W * ratio)));
    const M   = Math.max(40, Math.min(80, Math.floor(W * 0.04))); // marge ext. responsive
    const GAP = 16; // espace uniforme card↔panel et panel↔boutons
    const B   = 32; // largeur bouton stage-controls
    const shift = Math.floor((W - C) / 2) - M;
    if (cardRect) {
      el.style.setProperty('--d-start-w', `${Math.round(cardRect.width)}px`);
      el.style.setProperty('--d-start-h', `${Math.round(cardRect.height)}px`);
      el.style.setProperty('--d-start-x', `${Math.round(cardRect.left - stageRect.left + (cardRect.width / 2))}px`);
      el.style.setProperty('--d-start-y', `${Math.round(cardRect.top - stageRect.top + (cardRect.height / 2))}px`);
    }
    el.style.setProperty('--d-card-w',  `${C}px`);
    el.style.setProperty('--d-shift',   `${shift}px`);
    el.style.setProperty('--d-panel-l', `${M + C + GAP}px`);
    el.style.setProperty('--d-margin',  `${M}px`);
    el.style.setProperty('--d-panel-r', `${M + B + GAP}px`);
  };

  const openSheet = (char) => {
    if (!char || char.__new || char.__pending) return;
    detailTimersRef.current.forEach(clearTimeout);
    detailTimersRef.current = [];
    setActive(char.id);
    setFiltersOpen(false);
    setDetailTab('Fiche');
    setDetailMode('view');
    setEditMenuOpen(false);
    setDeleteConfirmOpen(false);
    setEditMode(false);
    setPortraitFrameEditorOpen(false);
    applyDetailVars();
    setDetailChar(char);
    setDetailPhase('cleaning');
    detailTimersRef.current.push(
      setTimeout(() => setDetailPhase('resizing'), DETAIL_CLEAN_MS),
      setTimeout(() => setDetailPhase('shifting'), DETAIL_CLEAN_MS + DETAIL_RESIZE_MS),
      setTimeout(() => setDetailPhase('panel'), DETAIL_CLEAN_MS + DETAIL_RESIZE_MS + DETAIL_SHIFT_MS),
    );
  };

  const openCreateSheet = () => {
    detailTimersRef.current.forEach(clearTimeout);
    detailTimersRef.current = [];
    setFiltersOpen(false);
    setDetailTab('Identité');
    setEditMenuOpen(false);
    setDeleteConfirmOpen(false);
    setEditMode(false);
    setPortraitFrameEditorOpen(false);
    setDetailMode('create');
    setDetailChar(makeBlankCharacter(user?.id));
    applyDetailVars();
    setDetailPhase('cleaning');
    detailTimersRef.current.push(
      setTimeout(() => setDetailPhase('resizing'), DETAIL_CLEAN_MS),
      setTimeout(() => setDetailPhase('shifting'), DETAIL_CLEAN_MS + DETAIL_RESIZE_MS),
      setTimeout(() => setDetailPhase('panel'), DETAIL_CLEAN_MS + DETAIL_RESIZE_MS + DETAIL_SHIFT_MS),
    );
  };

  const closeSheet = () => {
    detailTimersRef.current.forEach(clearTimeout);
    detailTimersRef.current = [];
    setEditMenuOpen(false);
    setDeleteConfirmOpen(false);
    setEditMode(false);
    setPortraitFrameEditorOpen(false);
    setDetailPhase('closing-panel');
    detailTimersRef.current.push(
      setTimeout(() => setDetailPhase('closing-shift'), DETAIL_PANEL_MS),
      setTimeout(() => setDetailPhase('closing-resize'), DETAIL_PANEL_MS + DETAIL_SHIFT_MS),
      setTimeout(() => setDetailPhase('closing-clean'), DETAIL_PANEL_MS + DETAIL_SHIFT_MS + DETAIL_RESIZE_MS),
      setTimeout(() => setDetailPhase('release'), DETAIL_PANEL_MS + DETAIL_SHIFT_MS + DETAIL_RESIZE_MS + DETAIL_CLEAN_MS),
      setTimeout(() => {
        setDetailChar(null);
        setDetailMode('view');
        setDetailPhase(null);
        setDetailTab('Fiche');
      }, DETAIL_PANEL_MS + DETAIL_SHIFT_MS + DETAIL_RESIZE_MS + DETAIL_CLEAN_MS + 80),
    );
  };

  const confirmDeleteSheet = () => {
    if (!detailChar?.id) return;
    deleteCharacter(detailChar.id);
    closeSheet();
  };

  const openFramePortraitEditor = (char) => {
    const draft = normalizePortrait(char?.portrait);
    setPortraitFrameDraft(draft);
    setPortraitFrameStatus(draft.url ? 'ready' : 'idle');
    setPortraitFrameEditorOpen(true);
  };

  const cancelFramePortraitEditor = () => {
    setPortraitFrameEditorOpen(false);
    setPortraitFrameDraft(null);
    setPortraitFrameStatus('idle');
  };

  const saveFramePortraitEditor = () => {
    if (!detailChar?.id || portraitFrameStatus !== 'ready') return;
    const portrait = normalizePortrait(portraitFrameDraft);
    commitDetailPatch({ portrait });
    cancelFramePortraitEditor();
  };

  const removeFramePortrait = () => {
    if (!detailChar?.id) return;
    commitDetailPatch({ portrait: { ...DEFAULT_PORTRAIT } });
    cancelFramePortraitEditor();
  };

  useEffect(() => {
    if (!editMode && detailMode !== 'edit') cancelFramePortraitEditor();
  }, [editMode, detailMode]);

  useEffect(() => {
    if (!liveDetailChar || detailMode === 'create') return;
    setDetailChar((currentChar) => (
      currentChar?.id === liveDetailChar.id ? { ...currentChar, ...liveDetailChar } : currentChar
    ));
  }, [liveDetailChar, detailMode]);

  return (
    <div className={[
      'select-screen',
      detailChar && ['cleaning', 'resizing', 'shifting', 'panel', 'closing-panel', 'closing-shift', 'closing-resize', 'closing-clean'].includes(detailPhase) ? 'detail-active' : '',
      detailChar && ['resizing', 'shifting', 'panel', 'closing-panel', 'closing-shift'].includes(detailPhase) ? 'detail-resized' : '',
      detailChar && ['cleaning', 'resizing', 'shifting', 'panel', 'closing-panel', 'closing-shift', 'closing-resize'].includes(detailPhase) ? 'detail-clean' : '',
      detailChar && ['shifting', 'panel', 'closing-panel'].includes(detailPhase) ? 'detail-shifted' : '',
      detailPhase ? `detail-${detailPhase}` : '',
    ].filter(Boolean).join(' ')}>
      <Header />
      <div className="app-toast-stack">
        {errorToastVisible && (
          <button className="app-error-toast" onClick={() => navigate('/admin')}>
            Il y a eu {errorCount} erreur{errorCount > 1 ? 's' : ''}
          </button>
        )}
        {pendingToastVisible && (
          <button
            className="app-pending-toast"
            onClick={() => navigate('/admin', { state: { section: 'createur-fiche' } })}
          >
            Une fiche vient d'être créée et est en attente de validation
          </button>
        )}
      </div>

      {/* ── Stage ── */}
      <div className="select-stage" ref={stageRef}>

        {/* Left arrow */}
        {hasMultipleItems && (
          <button
            className="select-arrow arrow-left select-chrome"
            onClick={() => go('left')}
            disabled={!canLeft || !!detailChar}
            aria-label="Précédent"
          >
            ‹
          </button>
        )}

        {/* GM — voir tous les joueurs toggle */}
        {canSeeAllCharacters && (hasCharacters || characters.length > 0) && !detailChar && (
          <button
            className={`gm-view-toggle${gmViewAll ? ' active' : ''}`}
            onClick={() => setGmViewAll((v) => !v)}
            title={gmViewAll ? 'Voir mes personnages' : 'Voir tous les joueurs'}
          >
            {gmViewAll ? '👁 Tous les joueurs' : '👁 Mes personnages'}
          </button>
        )}

        {/* Contrôles top-right — toujours dans le même conteneur vertical */}
        {(detailChar || hasCharacters) && (
          <div className={`stage-controls${detailChar ? ' detail-controls' : ''}`}>
            <button
              className={`select-filter-toggle${detailChar ? ' close-mode' : ' select-chrome'}`}
              onClick={detailChar ? (detailMode === 'edit' ? () => { setDetailMode('view'); setDetailTab('Fiche'); } : closeSheet) : () => setFiltersOpen((v) => !v)}
              title={detailChar ? (detailMode === 'create' ? 'Fermer la création' : detailMode === 'edit' ? 'Annuler les modifications' : 'Fermer la fiche') : 'Filtres'}
              aria-label={detailChar ? (detailMode === 'create' ? 'Fermer la création' : detailMode === 'edit' ? 'Annuler les modifications' : 'Fermer la fiche') : 'Filtres'}
            >
              {detailChar ? '✕' : filtersOpen ? '✕' : '⚙'}
            </button>

            {detailChar && detailMode === 'view' && ['panel', 'closing-panel'].includes(detailPhase) && (
              <div className="char-edit-wrap">
                <button
                  className={`char-edit-btn${editMenuOpen ? ' active' : ''}`}
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setEditMenuOpen((v) => !v);
                  }}
                  aria-label="Options du personnage"
                >
                  {/* Icône crayon */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 3L11 6" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                </button>
                {editMenuOpen && (
                  <div className="char-edit-menu">
                    {!deleteConfirmOpen ? (
                      <>
                        <button
                          className="char-edit-menu-item"
                          onClick={() => { setDetailMode('edit'); setDetailTab('Identité'); setEditMenuOpen(false); }}
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                          Modifier
                        </button>
                        <button
                          className="char-edit-menu-item char-edit-menu-item--danger"
                          onClick={() => setDeleteConfirmOpen(true)}
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <div className="char-delete-confirm">
                        <strong>Supprimer la fiche ?</strong>
                        <span>{detailChar.nom}</span>
                        <div>
                          <button className="char-delete-cancel" onClick={() => setDeleteConfirmOpen(false)}>Annuler</button>
                          <button className="char-delete-confirm-btn" onClick={confirmDeleteSheet}>Confirmer</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Card column: filter panel (when open) + card */}
        <div className={`select-card-col${[
          'resizing',
          'shifting',
          'panel',
          'closing-panel',
          'closing-shift',
        ].includes(detailPhase) ? ' is-detail' : ''}`}>
          {/* Filter panel — slides above the card */}
          {hasCharacters && (
          <div className={`select-filters${filtersOpen ? ' open' : ''}`}>
            <div className="select-filters-inner">
              <div className="filter-group">
                <label className="filter-label">Race</label>
                <select
                  className="filter-select"
                  value={raceFilter}
                  onChange={(e) => setRaceFilter(e.target.value)}
                >
                  <option value="">Toutes</option>
                  {allRaces.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Classe</label>
                <select
                  className="filter-select"
                  value={classeFilter}
                  onChange={(e) => setClasseFilter(e.target.value)}
                >
                  <option value="">Toutes</option>
                  {allClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {availablePlayers.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Joueur</label>
                  <select
                    className="filter-select"
                    value={joueurFilter}
                    onChange={(e) => setJoueurFilter(e.target.value)}
                  >
                    <option value="">Tous</option>
                    {availablePlayers.map((u) => (
                      <option key={u.id} value={String(u.id)}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="filter-group filter-group--search">
                <label className="filter-label">Nom</label>
                <input
                  className="filter-search"
                  type="text"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          )}

          {/* Multi-card carousel — flat line, left cards face-down */}
          <div className="select-carousel">
            {/* La carte "+ Nouveau personnage" (dans `items`) doit toujours
                rester accessible, même quand les filtres n'excluent aucun
                personnage existant (ou qu'il n'y en a aucun) — ce message
                n'est qu'une info complémentaire, pas un remplacement. */}
            {filteredChars.length === 0 && hasCharacters && (
              <p className="select-no-results">Aucun résultat.</p>
            )}
            {items.map((item, i) => {
              const offset   = i - index;
              const abs      = Math.abs(offset);
              if (abs > 5) return null;
              const isActive = offset === 0;
              // Left pile: gap from center + tight stacking. Right: tight against active.
              const xPct    = offset < 0 ? offset * 12 - 45 : offset * 20;
              const yPx     = 0;
              const scale   = 1 - abs * 0.06;
              const opacity = 1;
              const zIndex  = 20 - abs * 5;
              const rotateY = offset < 0 ? -180 : 0;
              return (
                <div
                  key={item.id ?? `new-${i}`}
                  className={`select-card-slot${isActive ? ' is-active' : ''}${offset < 0 ? ' is-flipped' : ''}`}
                  style={{ '--slot-tx': `${xPct}%`, '--slot-ty': `${yPx}px`, '--slot-scale': scale, '--slot-opacity': opacity, '--slot-z': zIndex, '--slot-ry': `${rotateY}deg` }}
                  onClick={!isActive ? () => goToIndex(i) : undefined}
                >
                  <div className="card-face card-face--front">
                    {item.__new
                      ? <NewCharCard onOpen={isActive ? openCreateSheet : () => goToIndex(i)} />
                      : (
                        <CharCard
                          char={detailChar?.id === item.id ? detailChar : item}
                          onOpen={isActive ? () => openSheet(item) : () => goToIndex(i)}
                          ownerName={gmViewAll ? (allKnownPlayers.find((u) => String(u.id) === String(item.userId))?.name) : null}
                          portraitOverride={isActive && portraitFrameEditorOpen && portraitFrameStatus === 'ready' ? portraitFrameDraft : null}
                          portraitEditor={isActive ? {
                            enabled: !!detailChar && detailChar.id === item.id && (editMode || detailMode === 'edit') && detailPhase === 'panel',
                            open: portraitFrameEditorOpen,
                            draft: portraitFrameDraft ?? normalizePortrait(detailChar?.portrait),
                            status: portraitFrameStatus,
                            onOpen: () => openFramePortraitEditor(detailChar?.id === item.id ? detailChar : item),
                            onChange: setPortraitFrameDraft,
                            onStatus: setPortraitFrameStatus,
                            onCancel: cancelFramePortraitEditor,
                            onSave: saveFramePortraitEditor,
                            onRemove: removeFramePortrait,
                          } : undefined}
                        />
                      )
                    }
                  </div>
                  <div className="card-face card-face--back">
                    <img src={logoEindhill} className="card-back-logo" alt="" />
                    {!item.__new && (
                      <div className="card-back-label">
                        <span>{item.nom}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          {hasMultipleItems && (
          <div className="select-dots-inline select-chrome">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                className={`select-dot${i === index ? ' active' : ''}${item.__new ? ' dot-new' : ''}`}
                onClick={() => goToIndex(i)}
                disabled={i === index || !!detailChar}
                aria-label={item.__new ? 'Créer un personnage' : `Aller à la fiche ${i + 1}`}
              >{item.__new ? '+' : ''}</button>
            ))}
          </div>
          )}
        </div>

        {/* Right arrow */}
        {hasMultipleItems && (
          <button
            className="select-arrow arrow-right select-chrome"
            onClick={() => go('right')}
            disabled={!canRight || !!detailChar}
            aria-label="Suivant"
          >
              ›
            </button>
        )}

        {detailChar && ['panel', 'closing-panel'].includes(detailPhase) && (
          detailMode === 'create' ? (
            <CharacterCreatePanel
              initialChar={detailChar}
              tab={detailTab}
              onTabChange={setDetailTab}
              isClosing={detailPhase === 'closing-panel'}
              onCancel={closeSheet}
              onCreate={(character) => {
                submitCharacterCreation(character, user);
                closeSheet();
              }}
            />
          ) : detailMode === 'edit' ? (
            <CharacterCreatePanel
              initialChar={cloneEditableCharacter(detailChar)}
              editMode
              tab={detailTab}
              onTabChange={setDetailTab}
              isClosing={detailPhase === 'closing-panel'}
              onCancel={() => { setDetailMode('view'); setDetailTab('Fiche'); }}
              onSave={(data) => {
                const patch = { ...data, portrait: normalizePortrait(detailChar.portrait) };
                updateCharacter(detailChar.id, patch);
                setDetailChar((c) => (c ? { ...c, ...patch } : c));
                setDetailMode('view');
                setDetailTab('Fiche');
              }}
            />
          ) : (
            <CharacterDetailPanel
              char={detailChar}
              tab={detailTab}
              onTabChange={setDetailTab}
              editMode={editMode}
              onExitEdit={() => setEditMode(false)}
              onSave={(updated) => {
                const storedChar = characters.find((c) => c.id === detailChar.id) ?? detailChar;
                const patch = {
                  ...updated,
                  portrait: normalizePortrait(storedChar.portrait),
                };
                updateCharacter(detailChar.id, patch);
                setDetailChar((currentChar) => (currentChar ? { ...currentChar, ...patch } : currentChar));
                setEditMode(false);
              }}
              isClosing={detailPhase === 'closing-panel'}
            />
          )
        )}
      </div>

      <footer className="site-footer">
        <span>✦ &nbsp; EINDHILL &nbsp; ✦</span>
        {hasCombatAccess && (
          <button
            className={`combat-mode-toggle${combatActive ? ' active' : ''}`}
            onClick={() => (combatActive ? endCombat() : startCombat(user))}
            title={combatActive ? 'Terminer le mode combat' : 'Activer le mode combat'}
          >
            ⚔ Mode Combat {combatActive ? 'ON' : 'OFF'}
          </button>
        )}
        {hasAdminAccess && (
          <button
            className="gm-admin-link"
            onClick={() => navigate('/admin')}
          >
            ⚙ Gestion du donjon
          </button>
        )}
      </footer>
    </div>
  );
}

function CharacterDetailPanel({ char, tab, onTabChange, isClosing, editMode, onExitEdit, onSave }) {
  return (
    <aside className={`select-detail-panel${isClosing ? ' is-closing' : ''}${editMode ? ' is-editing' : ''}`}>
      {editMode && (
        <div className="detail-edit-banner">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          Mode Édition
          <button className="detail-edit-banner-close" onClick={onExitEdit}>✕ Terminer</button>
        </div>
      )}
      <div className="detail-tabs">
        {DETAIL_TABS.map((t) => (
          <button
            key={t}
            className={`detail-tab${tab === t ? ' active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="detail-panel-body">
        {editMode ? (
          <CharacterEditContent char={char} tab={tab} onCancel={onExitEdit} onSave={onSave} />
        ) : (
          <>
            {tab === 'Fiche'                   && <DetailFiche char={char} />}
            {tab === 'Infos'            && <DetailInformations char={char} />}
            {tab === 'Stats'                   && <DetailStats char={char} />}
            {tab === 'Aptitudes' && <DetailAptitudes char={char} />}
            {tab === 'Résistances'             && <DetailResistances char={char} />}
            {tab === 'Compétences'   && <DetailCompetences char={char} />}
            {tab === 'Grimoire'                && <DetailGrimoire char={char} />}
            {tab === 'Équipement'              && <EquipementPanel char={char} />}
            {tab === 'Inventaire'              && <DetailInventaire char={char} />}
          </>
        )}
      </div>
    </aside>
  );
}

function PortraitControl({ portrait, onChange }) {
  const [open, setOpen] = useState(false);
  const current = normalizePortrait(portrait);

  return (
    <>
      <button className="portrait-control" type="button" onClick={() => setOpen(true)}>
        <span className="portrait-control-preview">
          {current.url ? <PortraitFrame portrait={current} /> : <AvatarIcon />}
        </span>
        <span className="portrait-control-copy">
          <strong>Image du personnage</strong>
          <em>{current.url ? 'URL renseignée, cadrage personnalisable.' : 'Clique pour ajouter une image par URL.'}</em>
        </span>
        <span className="portrait-control-action">Modifier</span>
      </button>
      {open && (
        <PortraitEditor
          initialPortrait={current}
          onClose={() => setOpen(false)}
          onSave={(next) => {
            onChange(normalizePortrait(next));
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function PortraitEditor({ initialPortrait, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizePortrait(initialPortrait));
  const [status, setStatus] = useState(draft.url ? 'loading' : 'idle');
  const imageUrl = draft.url.trim();

  const patchDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: field === 'url' ? value : Number(value) }));
    if (field === 'url') setStatus(value.trim() ? 'loading' : 'idle');
  };

  const save = () => {
    if (imageUrl && status !== 'ready') return;
    onSave({ ...draft, url: imageUrl });
  };

  return (
    <div className="portrait-modal" role="dialog" aria-modal="true" aria-label="Modifier l'image du personnage">
      <div className="portrait-modal-card">
        <div className="portrait-modal-head">
          <strong>Image du personnage</strong>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <label className="portrait-url-field">
          <span>URL de l'image</span>
          <input
            type="url"
            value={draft.url}
            placeholder="https://..."
            onChange={(e) => patchDraft('url', e.target.value)}
          />
        </label>
        <div className="portrait-editor-grid">
          <div className="portrait-editor-preview">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Aperçu du portrait"
                style={{
                  left: `${draft.x}%`,
                  top: `${draft.y}%`,
                  transform: `translate(-50%, -50%) scale(${draft.zoom})`,
                }}
                onLoad={() => setStatus('ready')}
                onError={() => setStatus('error')}
              />
            ) : (
              <AvatarIcon />
            )}
          </div>
          <div className="portrait-editor-controls">
            <label>
              <span>Zoom</span>
              <input type="range" min="1" max="2.8" step="0.01" value={draft.zoom} onChange={(e) => patchDraft('zoom', e.target.value)} />
            </label>
            <label>
              <span>Position horizontale</span>
              <input type="range" min="0" max="100" step="1" value={draft.x} onChange={(e) => patchDraft('x', e.target.value)} />
            </label>
            <label>
              <span>Position verticale</span>
              <input type="range" min="0" max="100" step="1" value={draft.y} onChange={(e) => patchDraft('y', e.target.value)} />
            </label>
            <div className={`portrait-status is-${status}`}>
              {status === 'idle' && 'Aucune image renseignée.'}
              {status === 'loading' && "Chargement de l'image..."}
              {status === 'ready' && 'Image trouvée.'}
              {status === 'error' && 'Impossible de charger cette image.'}
            </div>
          </div>
        </div>
        <div className="portrait-modal-actions">
          <button className="btn-ghost" type="button" onClick={() => onSave(DEFAULT_PORTRAIT)}>Retirer</button>
          <button className="btn-ghost" type="button" onClick={onClose}>Annuler</button>
          <button className="btn-primary" type="button" disabled={!!imageUrl && status !== 'ready'} onClick={save}>Valider</button>
        </div>
      </div>
    </div>
  );
}

function CharacterCreatePanel({ initialChar, tab, onTabChange, isClosing, onCancel, onCreate, editMode = false, onSave }) {
  const [form, setForm] = useState(() => {
    const base = {
      ...initialChar,
      prenom: initialChar.prenom || '',
      nomFamille: initialChar.nomFamille || '',
      pointsCarac: initialChar.pointsCarac ?? 0,
    };
    if (editMode) {
      const storedAptitudes = base.aptitudes || {};
      return {
        ...base,
        creationAptitudesPlusOne: Object.entries(storedAptitudes)
          .filter(([, v]) => v?.m1).map(([nom]) => nom),
        creationAptitudesPlusTwo: Object.entries(storedAptitudes)
          .filter(([, v]) => v?.m2).map(([nom]) => nom),
      };
    }
    return {
      ...base,
      creationAptitudesPlusOne: initialChar.creationAptitudesPlusOne || [],
      creationAptitudesPlusTwo: initialChar.creationAptitudesPlusTwo || [],
    };
  });
  const [error, setError] = useState('');
  const {
    customRaces,
    customAscendances,
    customOrigins,
    customProvenances,
    customHistoriques,
    customAptitudes,
    customAptitudeCategories,
    hiddenAptitudeKeys,
    customLevelRules,
    customCaracteristiques,
  } = useAdminStore();
  const levelZeroRule = getLevelZeroRule(customLevelRules);
  const activeTab = CREATION_TABS.includes(tab) ? tab : 'Identité';
  const raceOptions = Array.from(new Map([
    ...RACE_DATA.map((race) => ({ ...race, key: race.key || normalizeLocalKey(race.nom) })),
    ...(customRaces || []).map((race) => ({ ...race, key: race.key || normalizeLocalKey(race.nom) })),
  ].map((race) => [race.nom, race])).values());
  const selectedRace = raceOptions.find((race) => race.nom === form.race);
  const provenanceOptions = (customProvenances || [])
    .filter((p) => (p.races || []).includes(form.race))
    .map((p) => ({ ...p, key: p.key || normalizeLocalKey(p.nom) }));
  const selectedProvenance = provenanceOptions.find((p) => p.nom === form.provenance);
  const ascendanceOptions = Array.from(new Map([
    ...ASCENDANCE_DATA,
    ...(customAscendances || []),
  ]
    .filter((ascendance) => {
      const parent = ascendance.race || ascendance.raceKey || ascendance.parentRace;
      return !parent || parent === form.race || parent === selectedRace?.key;
    })
    .map((ascendance) => [
      ascendance.nom,
      { ...ascendance, key: ascendance.key || normalizeLocalKey(ascendance.nom) },
    ])).values());
  const selectedAscendance = ascendanceOptions.find((ascendance) => ascendance.nom === form.ascendance);
  const aptitudeSlots = getAptitudeChoiceSlots(selectedAscendance, selectedRace);
  const hiddenAptitudeSet = new Set((hiddenAptitudeKeys || []).map(normalizeLocalKey));
  const customAptitudeKeySet = new Set((customAptitudes || []).map((aptitude) => aptitude.key || normalizeLocalKey(aptitude.nom)));
  const aptitudeOptions = [
    ...APTITUDES
      .filter((aptitude) => !hiddenAptitudeSet.has(normalizeLocalKey(aptitude.nom)) && !customAptitudeKeySet.has(normalizeLocalKey(aptitude.nom))),
    ...(customAptitudes || []),
  ].map((aptitude) => ({
    ...aptitude,
    key: aptitude.key || normalizeLocalKey(aptitude.nom),
    categoryKey: aptitude.categoryKey || aptitude.cat || 'general',
  }));
  const aptitudeCategories = [
    ...APT_CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      couleur: '#bcecff',
    })),
    ...((customAptitudeCategories || []).map((category) => ({
      key: category.key || normalizeLocalKey(category.nom),
      label: category.nom || category.label,
      couleur: category.couleur || category.tagColor || '#bcecff',
    }))),
  ];
  const aptitudesByCategory = aptitudeCategories
    .map((category) => ({
      ...category,
      items: aptitudeOptions.filter((aptitude) => aptitude.categoryKey === category.key),
    }))
    .filter((category) => category.items.length > 0);
  const plusOneLimit = numberOrFallback(aptitudeSlots.plusOne, 1);
  const plusTwoLimit = numberOrFallback(aptitudeSlots.plusTwo, 1);
  const selectedPlusOne = (form.creationAptitudesPlusOne || []).filter(Boolean);
  const selectedPlusTwo = (form.creationAptitudesPlusTwo || []).filter(Boolean);
  const originCatalog = Array.from(new Map([
    ...ORIGIN_DATA,
    ...(customOrigins || []),
  ].map((origin) => [
    origin.key || normalizeLocalKey(origin.nom),
    { ...origin, key: origin.key || normalizeLocalKey(origin.nom) },
  ])).values());
  const originByKey = new Map(originCatalog.map((origin) => [origin.key, origin]));
  const originByName = new Map(originCatalog.map((origin) => [origin.nom, origin]));
  const resolveOriginRows = (rows = []) => rows
    .map((row) => {
      const nom = typeof row === 'string' ? row : row?.nom;
      const key = typeof row === 'string' ? normalizeLocalKey(row) : row?.key || normalizeLocalKey(row?.nom);
      const found = originByKey.get(key) || originByName.get(nom);
      return found || (nom ? { key, nom } : null);
    })
    .filter(Boolean);
  const buildOriginOptions = (provenance) => {
    const provenanceKey = provenance?.key;
    if (!provenanceKey) return [];
    return originCatalog.filter((origin) => {
      const keys = origin.provenanceKeys || [];
      return keys.length === 0 || keys.includes(provenanceKey);
    });
  };
  const originOptions = buildOriginOptions(selectedProvenance);
  const historiqueOptions =[...HISTORIQUE_DATA, ...(customHistoriques || [])]
    .filter((historique, index, list) => list.findIndex((item) => item.nom === historique.nom) === index);
  const summarizeRows = (rows = [], formatter) => (Array.isArray(rows) ? rows : [])
    .map(formatter)
    .filter(Boolean)
    .slice(0, 5);
  const summarizeResources = (resources = {}) => Object.entries(resources || {})
    .map(([key, value]) => [key, Number(value) || 0])
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key.toUpperCase()} ${signed(value)}`);
  const summarizeResistance = (row) => {
    const name = row?.nom || row?.label || row?.key;
    const value = Number(row?.value ?? row?.bonus ?? row?.amount ?? row?.total ?? 0) || 0;
    return name ? `${name} ${signed(value)}` : '';
  };
  const summarizeAptitude = (row) => {
    const name = row?.nom || row?.label || row?.key;
    return name ? `${name}${row?.stat ? ` (${row.stat})` : ''}` : '';
  };
  const summarizeName = (row) => (typeof row === 'string' ? row : row?.nom || row?.label || row?.key || '');
  const toIdentityOption = (item, kind) => {
    const innate = stripIdentityLead(item?.competenceRaciale || item?.competenceAscendance || '');
    const resources = summarizeResources(item?.baseResources);
    const resistances = summarizeRows(item?.resistanceBonuses, summarizeResistance);
    const aptitudes = summarizeRows(item?.aptitudes, summarizeAptitude);
    const languages = summarizeRows(item?.langues, summarizeName);
    const origins = summarizeRows(item?.origines, summarizeName);
    const provenances = summarizeRows(item?.provenanceKeys, summarizeName);
    const aptitudeChoices = item?.aptitudeChoices
      ? [`+1 x${item.aptitudeChoices.plusOne ?? 1}`, `+2 x${item.aptitudeChoices.plusTwo ?? 1}`]
      : [];

    return {
      ...item,
      value: item?.nom || '',
      label: item?.nom || '—',
      kind,
      color: item?.tagColor || item?.couleur || (kind === 'ascendance' ? '#bcecff' : '#c8a84a'),
      description: stripIdentityLead(item?.description || item?.amelioration || innate || ''),
      meta: [
        item?.race && kind === 'ascendance' ? `Race : ${item.race}` : '',
        item?.deplacement != null ? `Déplacement ${item.deplacement}` : '',
        item?.amelioration && kind !== 'historique' && kind !== 'origine' ? item.amelioration : '',
      ].filter(Boolean),
      details: [
        innate ? { label: kind === 'race' ? 'Compétence innée' : 'Compétence', values: [innate] } : null,
        resources.length ? { label: 'Ressources', values: resources } : null,
        resistances.length ? { label: 'Résistances', values: resistances } : null,
        aptitudes.length ? { label: 'Aptitudes', values: aptitudes } : null,
        aptitudeChoices.length ? { label: 'Choix aptitude', values: aptitudeChoices } : null,
        languages.length ? { label: 'Langues', values: languages } : null,
        origins.length ? { label: 'Origines', values: origins } : null,
        provenances.length ? { label: 'Provenances', values: provenances } : null,
      ].filter(Boolean),
    };
  };
  const raceSelectOptions = raceOptions.map((item) => toIdentityOption(item, 'race'));
  const ascendanceSelectOptions = ascendanceOptions.map((item) => toIdentityOption(item, 'ascendance'));
  const provenanceSelectOptions = provenanceOptions.map((item) => toIdentityOption(item, 'provenance'));
  const originSelectOptions = originOptions.map((item) => toIdentityOption(item, 'origine'));
  const historiqueSelectOptions = historiqueOptions.map((item) => toIdentityOption(item, 'historique'));
  const creationResources = [
    { key: 'vie', label: 'Vitalité', actuel: Number(form.vie?.actuel ?? form.vie?.max ?? EXPLORER_CLASS.vie ?? 0) || 0, max: Number(form.vie?.max ?? EXPLORER_CLASS.vie ?? 0) || 0 },
    { key: 'mana', label: 'Maîtrise', actuel: Number(form.mana?.actuel ?? form.mana?.max ?? EXPLORER_CLASS.mana ?? 0) || 0, max: Number(form.mana?.max ?? EXPLORER_CLASS.mana ?? 0) || 0 },
    { key: 'endu', label: 'Endurance', actuel: Number(form.endu?.actuel ?? form.endu?.max ?? EXPLORER_CLASS.endu ?? 0) || 0, max: Number(form.endu?.max ?? EXPLORER_CLASS.endu ?? 0) || 0 },
  ].map((resource) => ({
    ...resource,
    pct: resource.max > 0 ? Math.min(100, Math.max(0, Math.round((resource.actuel / resource.max) * 100))) : 0,
  }));
  const caracsDef = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const creationCaracDefsMap = Object.fromEntries(caracsDef.map((c) => [c.cle, c]));
  const creationStats = caracsDef.map((carac) => ({
    ...getStatBreakdown(form, carac.cle, creationCaracDefsMap),
    nom: carac.nom,
    description: carac.description || '',
  }));
  const statCellClass = (value) => (value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : '');
  const renderStatCell = (value, { signedValue = false, showZero = false } = {}) => {
    const n = Number(value) || 0;
    if (!showZero && n === 0) return '';
    return signedValue ? signed(n) : n;
  };

  const patch = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const adjustCreationStat = (key, delta) => {
    setForm((current) => {
      const currentBase = Number(current.stats?.[key]) || 10;
      const remaining = Number(current.pointsCarac) || 0;
      if (delta > 0 && remaining <= 0) return current;
      if (delta < 0 && currentBase <= 10) return current;
      return {
        ...current,
        stats: {
          ...(current.stats || {}),
          [key]: currentBase + delta,
        },
        pointsCarac: remaining - delta,
      };
    });
  };

  useEffect(() => {
    if (editMode || !levelZeroRule) return;
    setForm((current) => {
      if (current._levelingApplied) return current;
      const baseClass = getLevelRuleBaseClass(levelZeroRule);
      return buildBaseCharacterDraft({
        ...current,
        classe: baseClass,
        pointsCarac: getLevelRuleCharacterPoints(levelZeroRule),
        _levelingApplied: true,
      }, { customRaces, customAscendances });
    });
  }, [
    levelZeroRule?.id,
    levelZeroRule?.baseClass,
    levelZeroRule?.classe,
    levelZeroRule?.characterPoints,
    levelZeroRule?.pointsCarac,
    levelZeroRule?.caracPoints,
    levelZeroRule?.statPoints,
    levelZeroRule?.characteristicPoints,
    customRaces,
    customAscendances,
  ]);

  const changeRace = (race) => {
    const nextRace = raceOptions.find((item) => item.nom === race);
    const nextAscendances = Array.from(new Map([
      ...ASCENDANCE_DATA,
      ...(customAscendances || []),
    ].filter((ascendance) => {
      const parent = ascendance.race || ascendance.raceKey || ascendance.parentRace;
      return !parent || parent === race || parent === nextRace?.key;
    }).map((ascendance) => [
      ascendance.nom,
      { ...ascendance, key: ascendance.key || normalizeLocalKey(ascendance.nom) },
    ])).values());
    const nextAscendance = nextAscendances[0] || null;
    setForm((f) => ({
      ...buildBaseCharacterDraft({ ...f, race, ascendance: nextAscendance?.nom || '' }, { customRaces, customAscendances }),
      race,
      ascendance: nextAscendance?.nom || '',
      provenance: '',
      origine: '',
      aptitudes: {},
      creationAptitudesPlusOne: [],
      creationAptitudesPlusTwo: [],
    }));
  };

  const changeProvenance = (provenance) => {
    const nextProvenance = provenanceOptions.find((p) => p.nom === provenance);
    const nextOrigins = buildOriginOptions(nextProvenance);
    setForm((f) => ({
      ...f,
      provenance,
      origine: nextOrigins.some((o) => o.nom === f.origine) ? f.origine : '',
    }));
  };

  const toggleAptitudePick = (kind, aptitudeName) => {
    const limit = kind === 'creationAptitudesPlusOne' ? plusOneLimit : plusTwoLimit;
    const otherKind = kind === 'creationAptitudesPlusOne' ? 'creationAptitudesPlusTwo' : 'creationAptitudesPlusOne';
    setForm((f) => {
      const current = (f[kind] || []).filter(Boolean);
      const other = new Set((f[otherKind] || []).filter(Boolean));
      if (current.includes(aptitudeName)) {
        return { ...f, [kind]: current.filter((name) => name !== aptitudeName) };
      }
      if (other.has(aptitudeName) || current.length >= limit) return f;
      return { ...f, [kind]: [...current, aptitudeName] };
    });
  };

  const changeAscendance = (ascendance) => {
    setForm((f) => ({
      ...buildBaseCharacterDraft({ ...f, ascendance }, { customRaces, customAscendances }),
      ascendance,
      aptitudes: {},
      creationAptitudesPlusOne: [],
      creationAptitudesPlusTwo: [],
    }));
  };

  const submit = () => {
    const firstName = (form.prenom || '').trim();
    const familyName = (form.nomFamille || form.nom || '').trim();
    const displayName = [firstName, familyName].filter(Boolean).join(' ');
    if (!displayName) {
      setError('Nom et prénom requis.');
      return;
    }
    setError('');
    if (editMode) {
      const { _levelingApplied, ...cleanForm } = form;
      onSave({
        ...cleanForm,
        nom: displayName,
        prenom: firstName,
        nomFamille: familyName,
      });
      return;
    }
    const plusOne = (form.creationAptitudesPlusOne || []).filter(Boolean);
    const plusTwo = (form.creationAptitudesPlusTwo || []).filter(Boolean);
    if (plusOne.length < plusOneLimit || plusTwo.length < plusTwoLimit) {
      setError("Sélectionne tous les points d'aptitude avant de soumettre.");
      return;
    }
    const uniquePicks = new Set([...plusOne, ...plusTwo]);
    if (uniquePicks.size !== plusOne.length + plusTwo.length) {
      setError("Une aptitude ne peut être choisie qu'une seule fois à la création.");
      return;
    }
    const aptitudes = {};
    plusOne.forEach((nom) => { aptitudes[nom] = { ...(aptitudes[nom] || {}), m1: true }; });
    plusTwo.forEach((nom) => { aptitudes[nom] = { ...(aptitudes[nom] || {}), m2: true }; });
    const { creationAptitudesPlusOne, creationAptitudesPlusTwo, _levelingApplied, ...cleanForm } = form;
    onCreate(buildBaseCharacterDraft({
      ...cleanForm,
      nom: displayName,
      prenom: firstName,
      nomFamille: familyName,
      classe: cleanForm.classe || EXPLORER_CLASS.nom,
      sousClasse: '',
      niveau: 0,
      pointsCarac: Number(cleanForm.pointsCarac) || 0,
      aptitudes,
    }, { customRaces, customAscendances }));
  };

  return (
    <aside className={`select-detail-panel creation-panel${isClosing ? ' is-closing' : ''}${editMode ? ' is-editing' : ''}`}>
      <div className="detail-edit-banner">
        {editMode ? 'Édition de fiche' : 'Création de fiche'}
        <button className="detail-edit-banner-close" onClick={onCancel}>✕ Annuler</button>
      </div>
      <div className="detail-tabs">
        {CREATION_TABS.map((t) => (
          <button
            key={t}
            className={`detail-tab${activeTab === t ? ' active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="detail-panel-body">
        <div className={`detail-content creation-content creation-content--${normalizeLocalKey(activeTab)}`}>
          {activeTab === 'Identité' && (
            <>
              <CreationSection title="Identité" className="creation-section--identity">
                <CreationField label="Nom" className="creation-field--name"><input value={form.nomFamille || form.nom || ''} onChange={(e) => patch('nomFamille', e.target.value)} /></CreationField>
                <CreationField label="Prénom" className="creation-field--firstname"><input value={form.prenom ?? ''} onChange={(e) => patch('prenom', e.target.value)} /></CreationField>
                <CreationField label="Poids" className="creation-field--weight"><input value={form.poids} onChange={(e) => patch('poids', e.target.value)} /></CreationField>
                <CreationField label="Taille" className="creation-field--height"><input value={form.taille} onChange={(e) => patch('taille', e.target.value)} /></CreationField>
                <CreationField label="Naissance" className="creation-field--birth"><input value={form.naissance} onChange={(e) => patch('naissance', e.target.value)} /></CreationField>
                <CreationField label="Sexe" className="creation-field--sex">
                  <select value={form.sexe} onChange={(e) => patch('sexe', e.target.value)}>
                    {SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </CreationField>
                <CreationField label="Race" className="creation-field--race">
                  <CreationInfoSelect
                    value={form.race}
                    options={raceSelectOptions}
                    placeholder="—"
                    onChange={changeRace}
                  />
                </CreationField>
                <CreationField label="Ascendance" className="creation-field--ascendance">
                  <CreationInfoSelect
                    value={form.ascendance}
                    options={ascendanceSelectOptions}
                    placeholder="—"
                    disabled={!form.race}
                    onChange={changeAscendance}
                  />
                </CreationField>
                <CreationField label="Provenance" className="creation-field--provenance">
                  <CreationInfoSelect
                    value={form.provenance}
                    options={provenanceSelectOptions}
                    placeholder="—"
                    allowEmpty
                    tooltipSide="left"
                    disabled={!form.race || !form.ascendance}
                    onChange={changeProvenance}
                  />
                </CreationField>
                <CreationField label="Origine" className="creation-field--origin">
                  <CreationInfoSelect
                    value={form.origine}
                    options={originSelectOptions}
                    placeholder="—"
                    allowEmpty
                    tooltipSide="left"
                    disabled={!form.provenance}
                    onChange={(value) => patch('origine', value)}
                  />
                </CreationField>
                <CreationField label="Historique" className="creation-field--historique">
                  <CreationInfoSelect
                    value={form.historique}
                    options={historiqueSelectOptions}
                    placeholder="—"
                    allowEmpty
                    tooltipSide="left"
                    onChange={(value) => patch('historique', value)}
                  />
                </CreationField>
              </CreationSection>
              <CreationSection title={editMode ? 'Classe' : 'Départ'} className="creation-section--start">
                <div className="creation-start-summary">
                  <div className="creation-start-card creation-start-card--main">
                    <span>{editMode ? 'Classe actuelle' : 'Classe initiale'}</span>
                    <strong>{form.classe || EXPLORER_CLASS.nom}</strong>
                  </div>
                  <div className="creation-start-card">
                    <span>Niveau</span>
                    <strong>{editMode ? (Number(form.niveau) || 0) : 0}</strong>
                  </div>
                  <div className="creation-start-card creation-start-card--resources">
                    <span>Ressources</span>
                    {creationResources.map((resource) => (
                      <div className="creation-resource-row" key={resource.key}>
                        <b>{resource.max}</b><small>{resource.label}</small>
                      </div>
                    ))}
                  </div>
                  <div className="creation-start-card">
                    <span>Caractéristiques</span>
                    <strong>{Number(form.pointsCarac) || 0}</strong>
                  </div>
                </div>
              </CreationSection>
            </>
          )}

          {activeTab === 'Stats' && (
            <>
              <CreationSection title="Ressources" className="creation-section--stats">
                <div className="creation-stats-resource-grid">
                  {creationResources.map((resource) => (
                    <div className={`creation-stats-resource-card creation-stats-resource-card--${resource.key}`} key={resource.key}>
                      <span>{resource.label}</span>
                      <strong>{resource.actuel}<em>/ {resource.max}</em></strong>
                      <div className="creation-stats-resource-bar">
                        <div style={{ width: `${resource.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CreationSection>

              <CreationSection title="Caractéristiques" className="creation-section--stats creation-section--caracs">
                <div className="creation-stats-table-wrap">
                  <table className="creation-stats-table">
                    <thead>
                      <tr>
                        <th>Carac.</th>
                        <th>Base</th>
                        <th>Mod.</th>
                        <th>Bonus</th>
                        <th>Malus</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creationStats.map((stat) => (
                        <tr key={stat.key}>
                          <td>
                            <CaracTooltipLabel carac={{ nom: stat.nom, description: stat.description }} />
                          </td>
                          <td>
                            <div className="creation-stat-base-control">
                              <button
                                type="button"
                                onClick={() => adjustCreationStat(stat.key, -1)}
                                disabled={(Number(form.stats?.[stat.key]) || 10) <= 10}
                              >
                                -
                              </button>
                              <strong>{stat.base}</strong>
                              <button
                                type="button"
                                onClick={() => adjustCreationStat(stat.key, 1)}
                                disabled={(Number(form.pointsCarac) || 0) <= 0}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className={statCellClass(stat.mod)}>
                            {renderStatCell(stat.mod, { signedValue: true })}
                          </td>
                          <td className={statCellClass(stat.bonus)}>
                            {renderStatCell(stat.bonus)}
                          </td>
                          <td className={statCellClass(stat.malus)}>
                            {renderStatCell(stat.malus)}
                          </td>
                          <td className={statCellClass(stat.total)}>
                            {renderStatCell(stat.total, { showZero: true })}
                          </td>
                        </tr>
                      ))}
                      <tr className="creation-stats-points-row">
                        <td colSpan="5">Points de carac.</td>
                        <td>{Number(form.pointsCarac) || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CreationSection>
            </>
          )}

          {activeTab === 'Aptitudes' && (
            <CreationSection title="Points d'aptitude">
              <div className="creation-aptitude-help">
                Vous pouvez sélectionner {plusOneLimit} +1 et {plusTwoLimit} +2.
                <span>
                  Sélection actuelle : {selectedPlusOne.length}/{plusOneLimit} en +1 · {selectedPlusTwo.length}/{plusTwoLimit} en +2
                </span>
              </div>
              <div className="apt-accordion creation-apt-accordion">
                {aptitudesByCategory.map((category) => (
                  <CreationAptitudeCategory
                    key={category.key}
                    category={category}
                    items={category.items}
                    selectedPlusOne={selectedPlusOne}
                    selectedPlusTwo={selectedPlusTwo}
                    plusOneLimit={plusOneLimit}
                    plusTwoLimit={plusTwoLimit}
                    onToggle={toggleAptitudePick}
                  />
                ))}
              </div>
            </CreationSection>
          )}

          {error && <div className="creation-error">{error}</div>}
          <div className="creation-actions">
            <button className="btn-ghost" onClick={onCancel}>Annuler</button>
            <button className="btn-primary creation-submit" onClick={submit}>{editMode ? 'Enregistrer les modifications' : 'Envoyer en validation'}</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CreationAptitudeCategory({ category, items, selectedPlusOne, selectedPlusTwo, plusOneLimit, plusTwoLimit, onToggle }) {
  const [open, setOpen] = useState(true);
  const activeCount = items.filter((aptitude) => (
    selectedPlusOne.includes(aptitude.nom) || selectedPlusTwo.includes(aptitude.nom)
  )).length;

  return (
    <div className={`apt-cat creation-apt-cat${activeCount > 0 ? ' apt-cat--active' : ''}`}>
      <button className="apt-cat-header" type="button" onClick={() => setOpen((value) => !value)}>
        <span className="apt-cat-title">{category.label || category.nom}</span>
        <span className="apt-cat-meta">
          {activeCount > 0 && <span className="apt-cat-badge">✦</span>}
          <span className="apt-cat-count">{items.length}</span>
          <span className="apt-cat-arrow">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="apt-table-wrap">
          <table className="apt-table creation-apt-select-table">
            <thead>
              <tr>
                <th className="apt-th-nom">Nom</th>
                <th>Mod.</th>
                <th title="Choix +2">+2</th>
                <th title="Choix +1">+1</th>
                <th className="apt-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((aptitude, index) => {
                const hasPlusOne = selectedPlusOne.includes(aptitude.nom);
                const hasPlusTwo = selectedPlusTwo.includes(aptitude.nom);
                const total = (hasPlusOne ? 1 : 0) + (hasPlusTwo ? 2 : 0);
                return (
                  <tr className={`apt-row${index % 2 === 0 ? ' apt-even' : ''}`} key={aptitude.key}>
                    <td className="apt-td-nom">
                      <SmartText text={`{aptitude.${aptitude.nom}}`} className="apt-name-tag sheet-plain-tag" plainTags />
                    </td>
                    <td className="apt-td-num">{aptitude.stat || '—'}</td>
                    <td className="apt-td-check">
                      <button
                        type="button"
                        className={hasPlusTwo ? 'apt-check apt-check--on creation-apt-check-btn' : 'apt-check apt-check--off creation-apt-check-btn'}
                        disabled={!hasPlusTwo && (hasPlusOne || selectedPlusTwo.length >= plusTwoLimit)}
                        onClick={() => onToggle('creationAptitudesPlusTwo', aptitude.nom)}
                        aria-label={`Sélectionner ${aptitude.nom} en +2`}
                      >
                        {hasPlusTwo ? '✓' : ''}
                      </button>
                    </td>
                    <td className="apt-td-check">
                      <button
                        type="button"
                        className={hasPlusOne ? 'apt-check apt-check--on creation-apt-check-btn' : 'apt-check apt-check--off creation-apt-check-btn'}
                        disabled={!hasPlusOne && (hasPlusTwo || selectedPlusOne.length >= plusOneLimit)}
                        onClick={() => onToggle('creationAptitudesPlusOne', aptitude.nom)}
                        aria-label={`Sélectionner ${aptitude.nom} en +1`}
                      >
                        {hasPlusOne ? '✓' : ''}
                      </button>
                    </td>
                    <td className={`apt-td-total${total > 0 ? ' apt-total-pos' : ''}`}>
                      {totalValue(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CharacterEditContent({ char, tab, onCancel, onSave }) {
  const [form, setForm] = useState(() => cloneEditableCharacter(char));
  const [error, setError] = useState('');
  const { customCaracteristiques } = useAdminStore();
  const editCaracs = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  useEffect(() => {
    setForm(cloneEditableCharacter(char));
    setError('');
  }, [char.id]);

  const patch = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const patchStat = (key, value) => {
    const n = Number(value) || 0;
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: n } }));
  };
  const patchPool = (key, field, value) => {
    const n = Number(value) || 0;
    setForm((f) => ({ ...f, [key]: { ...f[key], [field]: n } }));
  };
  const addRow = (group, row) => setForm((f) => ({ ...f, [group]: [...(f[group] ?? []), row] }));
  const patchRow = (group, index, field, value) => {
    setForm((f) => ({
      ...f,
      [group]: (f[group] ?? []).map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };
  const removeRow = (group, index) => {
    setForm((f) => ({ ...f, [group]: (f[group] ?? []).filter((_, i) => i !== index) }));
  };

  const changeRace = (race) => {
    setForm((f) => ({
      ...f,
      race,
      ascendance: ASCENDANCES[race]?.includes(f.ascendance)
        ? f.ascendance
        : ASCENDANCES[race]?.[0] || '',
    }));
  };

  const changeClasse = (classe) => {
    setForm((f) => ({
      ...f,
      classe,
      sousClasse: SOUS_CLASSES[classe]?.includes(f.sousClasse)
        ? f.sousClasse
        : SOUS_CLASSES[classe]?.[0] || '',
    }));
  };

  const submit = () => {
    if (!form.nom.trim()) {
      setError('Nom requis pour enregistrer la fiche.');
      return;
    }
    setError('');
    onSave({
      ...form,
      nom: form.nom.trim(),
      niveau: Number(form.niveau) || 1,
      chance: Number(form.chance) || 0,
    });
  };

  return (
    <div className="detail-content creation-content edit-content">
      {tab === 'Fiche' && (
        <>
          <CreationSection title="Informations générales">
            <CreationField label="Nom"><input value={form.nom} onChange={(e) => patch('nom', e.target.value)} /></CreationField>
            <CreationField label="Race">
              <select value={form.race} onChange={(e) => changeRace(e.target.value)}>
                {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </CreationField>
            <CreationField label="Ascendance">
              <select value={form.ascendance} onChange={(e) => patch('ascendance', e.target.value)}>
                {(ASCENDANCES[form.race] || []).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </CreationField>
            <CreationField label="Sexe">
              <select value={form.sexe} onChange={(e) => patch('sexe', e.target.value)}>
                {SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </CreationField>
            <CreationField label="Classe">
              <select value={form.classe} onChange={(e) => changeClasse(e.target.value)}>
                {CLASS_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </CreationField>
            <CreationField label="Sous-classe">
              <select value={form.sousClasse} onChange={(e) => patch('sousClasse', e.target.value)}>
                {(SOUS_CLASSES[form.classe] || ['']).map((s) => <option key={s} value={s}>{s || '—'}</option>)}
              </select>
            </CreationField>
            <CreationField label="Niveau"><input type="number" min="1" value={form.niveau} onChange={(e) => patch('niveau', e.target.value)} /></CreationField>
            <CreationField label="Chance"><input type="number" value={form.chance} onChange={(e) => patch('chance', Number(e.target.value) || 0)} /></CreationField>
          </CreationSection>

          <CreationSection title="Origine et contexte">
            {['naissance', 'provenance', 'origine', 'historique', 'maitrise', 'taille', 'poids'].map((field) => (
              <CreationField key={field} label={field}>
                <input value={form[field] ?? ''} onChange={(e) => patch(field, e.target.value)} />
              </CreationField>
            ))}
          </CreationSection>
        </>
      )}

      {tab === 'Stats' && (
        <>
          <CreationSection title="Ressources">
            {[
              ['vie', 'Vitalité'],
              ['mana', 'Maîtrise'],
              ['endu', 'Endurance'],
            ].map(([key, label]) => (
              <div className="creation-pool" key={key}>
                <strong>{label}</strong>
                <label>Actuel <input type="number" value={form[key].actuel} onChange={(e) => patchPool(key, 'actuel', e.target.value)} /></label>
                <label>Max <input type="number" value={form[key].max} onChange={(e) => patchPool(key, 'max', e.target.value)} /></label>
              </div>
            ))}
          </CreationSection>
          <CreationSection title="Caractéristiques">
            {editCaracs.map((carac) => (
              <CreationField key={carac.cle} label={<CaracTooltipLabel carac={carac} />}>
                <input type="number" value={form.stats[carac.cle] ?? 10} onChange={(e) => patchStat(carac.cle, e.target.value)} />
              </CreationField>
            ))}
          </CreationSection>
        </>
      )}

      {tab === 'Aptitudes' && (
        <>
          <CreationList title="Connaissances" rows={form.connaissances} columns={[['nom', 'Connaissance'], ['bonus', 'Bonus']]} onAdd={() => addRow('connaissances', { nom: '', bonus: '' })} onChange={(i, f, v) => patchRow('connaissances', i, f, v)} onRemove={(i) => removeRow('connaissances', i)} />
          <CreationList title="Langues" rows={form.langues} columns={[['nom', 'Langue'], ['type', 'Source'], ['bonus', 'Bonus']]} onAdd={() => addRow('langues', { nom: '', type: '', bonus: '' })} onChange={(i, f, v) => patchRow('langues', i, f, v)} onRemove={(i) => removeRow('langues', i)} />
        </>
      )}

      {tab === 'Compétences' && (
        <>
          <CreationList title="Capacités" rows={form.competences} columns={[['nom', 'Nom'], ['desc', 'Description']]} onAdd={() => addRow('competences', { nom: '', desc: '' })} onChange={(i, f, v) => patchRow('competences', i, f, v)} onRemove={(i) => removeRow('competences', i)} />
          <CreationList title="Sous-classe" rows={form.competencesSousClasse} columns={[['tag', 'Tag'], ['desc', 'Description']]} onAdd={() => addRow('competencesSousClasse', { tag: '', desc: '' })} onChange={(i, f, v) => patchRow('competencesSousClasse', i, f, v)} onRemove={(i) => removeRow('competencesSousClasse', i)} />
          <CreationList title="Actions du personnage" rows={form.actions} columns={[['nom', 'Nom'], ['cout', 'Coût'], ['desc', 'Description'], ['jet', 'Jet']]} onAdd={() => addRow('actions', { nom: '', cout: '', desc: '', jet: '' })} onChange={(i, f, v) => patchRow('actions', i, f, v)} onRemove={(i) => removeRow('actions', i)} />
        </>
      )}

      {['Informations', 'Résistances', 'Grimoire', 'Équipement', 'Inventaire'].includes(tab) && (
        <CreationSection title={tab}>
          <p className="creation-empty">Cette rubrique sera éditable dans une prochaine passe.</p>
        </CreationSection>
      )}

      {error && <div className="creation-error">{error}</div>}
      <div className="creation-actions">
        <button className="btn-ghost" onClick={onCancel}>Annuler</button>
        <button className="btn-primary creation-submit" onClick={submit}>Enregistrer les modifications</button>
      </div>
    </div>
  );
}

function CreationSection({ title, children, className = '' }) {
  return (
    <section className={`creation-section${className ? ` ${className}` : ''}`}>
      <h2>{title}</h2>
      <div className="creation-grid">{children}</div>
    </section>
  );
}

function CreationField({ label, children, className = '' }) {
  return (
    <label className={`creation-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CreationList({ title, rows, columns, onAdd, onChange, onRemove }) {
  return (
    <section className="creation-section">
      <div className="creation-list-title">
        <h2>{title}</h2>
        <button className="btn-ghost" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="creation-list">
        <div className="creation-list-row creation-list-row--head" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
          {columns.map(([, label]) => <span key={label}>{label}</span>)}
          <span />
        </div>
        {rows.map((row, index) => (
          <div className="creation-list-row" key={index} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
            {columns.map(([field]) => (
              <input key={field} value={row[field] || ''} onChange={(e) => onChange(index, field, e.target.value)} />
            ))}
            <button className="btn-danger" onClick={() => onRemove(index)}>×</button>
          </div>
        ))}
      </div>
    </section>
  );
}

const RES_COLORS = { vie: '#4ac87a', mana: '#4a7ac8', endu: '#c84a4a' };

function FicheResCard({ res, onActuelChange, onTempChange }) {
  const [open, setOpen] = useState(false);
  const pct   = Math.min(100, Math.round((res.pool.actuel / res.pool.max) * 100));
  const color = RES_COLORS[res.key] || '#c8a84a';
  // Bonus/Malus Temp. net — sans ça, une fois saisi, rien ne le montrait
  // ailleurs que dans le détail replié (voir la case à cocher "ouvrir").
  const netTemp = res.tempBonus - res.tempMalus;
  // field non-null = éditable directement (Bonus/Malus Temp.), le reste
  // reste en lecture seule (calculé). tone harmonise la couleur par sens
  // (bonus = vert, malus = rouge), y compris les variantes Temp.
  const rows  = [
    ['Max',       res.pool.max,    null,        null],
    [res.short,   res.base,        null,        null],
    ['Bonus',     res.bonus,       null,        'bonus'],
    ['B.Temp',    res.tempBonus,   'tempBonus', 'bonus'],
    ['Malus',     res.malus,       null,        'malus'],
    ['M.Temp',    res.tempMalus,   'tempMalus', 'malus'],
    ['Levelup',   res.levelup,     null,        null],
    ['Perdu',     res.lost,        null,        null],
  ];
  return (
    <div className="fiche-res-card" style={{ '--res-color': color }}>
      <div className="fiche-res-header">
        <button type="button" className="fiche-res-toggle" onClick={() => setOpen(v => !v)}>
          <span className="fiche-res-title">{res.title}</span>
          <span className="fiche-res-arrow">{open ? '▲' : '▼'}</span>
        </button>
        <span className="fiche-res-score">
          <FormulaInput
            className="fiche-res-actuel-input"
            value={res.pool.actuel}
            onCommit={(next) => onActuelChange(res.key, next)}
          />
          <em>/ {res.pool.max}</em>
          {netTemp !== 0 && (
            <span className={`fiche-res-temp-badge${netTemp < 0 ? ' is-malus' : ''}`}>
              {netTemp > 0 ? `+${netTemp}` : netTemp}
            </span>
          )}
        </span>
      </div>
      <div className="fiche-res-bar"><div className="fiche-res-fill" style={{ width: `${pct}%` }} /></div>
      {open && (
        <div className="fiche-res-breakdown">
          {rows.map(([label, value, field, tone]) => (
            <div className="fiche-res-brow" key={label}>
              <span>{label}</span>
              {field ? (
                <FormulaInput
                  className={`sheet-inline-input fiche-res-brow-input${tone === 'malus' ? ' neg' : tone === 'bonus' ? ' pos' : ''}`}
                  value={value}
                  onCommit={(next) => onTempChange(res.key, field, next)}
                />
              ) : tone ? (
                <strong className={tone === 'malus' ? 'neg' : 'pos'}>{value}</strong>
              ) : (
                <strong className={value > 0 && label === 'Perdu' ? 'neg' : ''}>{value}</strong>
              )}
            </div>
          ))}
          <div className="fiche-res-brow fiche-res-brow--total">
            <span>{res.title} restante</span>
            <strong>{Math.max(0, res.pool.actuel + res.tempBonus - res.tempMalus)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function FicheDepCard({ title, unit, movement, onTempChange }) {
  const [open, setOpen] = useState(false);
  // field non-null = éditable directement (Bonus/Malus Temp.), le reste
  // reste en lecture seule (calculé) — même principe que FicheResCard.
  // tone harmonise la couleur par sens (bonus = vert, malus = rouge),
  // y compris les variantes Temp., partout, peu importe la valeur.
  const cols = [
    ['Base',   movement.base,         null, null],
    ['Bonus',  movement.bonus ?? 0,   null, 'bonus'],
    ['B.Obj',  movement.objectBonus ?? 0, null, 'bonus'],
    ['B.Temp', movement.tempBonus ?? 0,   'tempBonus', 'bonus'],
    ['Malus',  movement.malus ?? 0,   null, 'malus'],
    ['M.Obj',  movement.objectMalus ?? 0, null, 'malus'],
    ['M.Temp', movement.tempMalus ?? 0,   'tempMalus', 'malus'],
  ];
  const total = cols.slice(0,4).reduce((s,[,v])=>s+v,0) - cols.slice(4).reduce((s,[,v])=>s+v,0);
  return (
    <div className="fiche-dep">
      <button className="fiche-dep-btn" onClick={() => setOpen(v => !v)}>
        <div className="fiche-dep-main">
          <span className="fiche-dep-label">{title}</span>
          <span className="fiche-dep-total">{total}</span>
          <span className="fiche-dep-unit">{unit}</span>
        </div>
        <span className="fiche-dep-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="fiche-dep-breakdown">
          {cols.map(([label, value, field, tone]) => (
            <div className="fiche-res-brow" key={label}>
              <span>{label}</span>
              {field ? (
                <FormulaInput
                  className={`sheet-inline-input fiche-res-brow-input${tone === 'malus' ? ' neg' : tone === 'bonus' ? ' pos' : ''}`}
                  value={value}
                  onCommit={(next) => onTempChange(field, next)}
                />
              ) : (
                <strong className={tone === 'malus' ? 'neg' : tone === 'bonus' ? 'pos' : ''}>{value}</strong>
              )}
            </div>
          ))}
          <div className="fiche-res-brow fiche-res-brow--total">
            <span>Total</span>
            <strong>{total} cases</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function FicheResourcesSection({ resources, onActuelChange, onTempChange }) {
  return (
    <section className="detail-section">
      <h2>Ressources</h2>
      <div className="fiche-res-grid">
        {resources.map((res) => (
          <FicheResCard key={res.key} res={res} onActuelChange={onActuelChange} onTempChange={onTempChange} />
        ))}
      </div>
    </section>
  );
}

// ── Level Up Modal ────────────────────────────────────────────
const LEVEL_RESOURCE_OPTIONS = [
  { key: 'vie', label: 'Vitalité', icon: '❤', color: '#4ac87a' },
  { key: 'mana', label: 'Mana', icon: '✦', color: '#5f8dff' },
  { key: 'endu', label: 'Endurance', icon: '⚡', color: '#ff7060' },
];

const normalizeLevelDieFormula = (value = '') => {
  const clean = String(value || '').trim().replace(/\s+/g, '').toLowerCase();
  if (!clean) return '';
  if (/^\d+([+-]\d+)?$/.test(clean)) return `1d${clean}`;
  if (/^d\d+([+-]\d+)?$/.test(clean)) return `1${clean}`;
  if (/^\d+d\d+([+-]\d+)?$/.test(clean)) return clean;
  return clean.replace(/^1D/, '1d');
};

const getLevelDieFallback = (source, key) => {
  const legacy = Number(source?.[key] || 0);
  return legacy > 0 ? `1d${legacy}` : '1d6';
};

function normalizeLevelResourceDice(source = {}) {
  const dice = source.resourceDice || {};
  return Object.fromEntries(LEVEL_RESOURCE_OPTIONS.map(({ key }) => {
    const explicit = Array.isArray(dice[key]) ? dice[key].find(Boolean) : dice[key];
    return [key, normalizeLevelDieFormula(explicit || getLevelDieFallback(source, key))];
  }));
}

function hasLevelResourceDice(source = {}) {
  return LEVEL_RESOURCE_OPTIONS.some(({ key }) => Boolean(source?.resourceDice?.[key]));
}

function getCombinedClassDefinition(char, customClasses = []) {
  const base = getClassDefinition(char) || {};
  const custom = (customClasses || []).find((entry) =>
    normalizeLocalKey(entry.nom) === normalizeLocalKey(char?.classe),
  );
  return custom ? { ...base, ...custom } : base;
}

function getCombinedClassDefinitionByName(className, customClasses = []) {
  if (normalizeLocalKey(className) === normalizeLocalKey(EXPLORER_CLASS.nom)) return EXPLORER_CLASS;
  const base = getClassDefinition({ classe: className }) || {};
  const custom = (customClasses || []).find((entry) =>
    normalizeLocalKey(entry.nom) === normalizeLocalKey(className),
  );
  return custom ? { ...base, ...custom } : base;
}

function getCombinedSubclassDefinition(char, customSubclasses = []) {
  const base = getSubclassDefinition(char) || {};
  const custom = (customSubclasses || []).find((entry) =>
    normalizeLocalKey(entry.nom) === normalizeLocalKey(char?.sousClasse),
  );
  return custom ? { ...base, ...custom } : base;
}

function getCombinedSubclassDefinitionByName(className, subclassName, customSubclasses = []) {
  const base = getSubclassDefinition({ classe: className, sousClasse: subclassName }) || {};
  const custom = (customSubclasses || []).find((entry) =>
    normalizeLocalKey(entry.nom) === normalizeLocalKey(subclassName),
  );
  return custom ? { ...base, ...custom } : base;
}

function getLevelUpDice(classDef = {}, subclassDef = {}) {
  const classDice = normalizeLevelResourceDice(classDef);
  const subclassDice = normalizeLevelResourceDice(subclassDef);
  const useSubclass = Boolean(subclassDef?.replaceClassResourceDice && hasLevelResourceDice(subclassDef));
  const source = useSubclass ? 'Sous-classe' : 'Classe';
  const dice = Object.fromEntries(LEVEL_RESOURCE_OPTIONS.map(({ key }) => [
    key,
    useSubclass ? (subclassDice[key] || classDice[key]) : classDice[key],
  ]));
  return { dice, source };
}

function getLevelUpSpellCounts(classDef = {}, subclassDef = {}) {
  const useSubclass = Boolean(subclassDef?.replaceClassSpellCounts);
  const source = useSubclass ? subclassDef : classDef;
  return {
    sortsMagiques: getLevelGainNumber(source?.nombreSortsMagiques),
    sortsPhysiques: getLevelGainNumber(source?.nombreSortsPhysiques),
  };
}

const getLevelGainNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value ?? '').match(/-?\d+/);
  return match ? Number(match[0]) : 0;
};

const getNextLevelRule = (rules = [], currentLevel = 0) => {
  const nextLevel = (currentLevel ?? 0) + 1;
  return (rules || []).find((rule) => Number(rule.level) === nextLevel) || null;
};

const isEntryAllowedForRace = (entry = {}, raceName = '') => {
  const locks = entry.allowedRaces || entry.raceLocks || entry.racesAutorisees || [];
  if (!Array.isArray(locks) || locks.length === 0) return true;
  const raceKey = normalizeLocalKey(raceName);
  return locks.some((lock) => {
    const value = typeof lock === 'string' ? lock : lock?.key || lock?.nom;
    return normalizeLocalKey(value) === raceKey;
  });
};

const getAvailableLevelClasses = (char, customClasses = []) => {
  const customKeys = new Set((customClasses || []).map((entry) => entry.key || normalizeLocalKey(entry.nom)));
  const entries = [
    ...CLASSES
      .map((entry) => ({ ...entry, key: entry.key || normalizeLocalKey(entry.nom) }))
      .filter((entry) => !customKeys.has(entry.key)),
    ...(customClasses || []),
  ];
  return entries
    .filter((entry) => entry.nom && entry.nom !== EXPLORER_CLASS.nom)
    .filter((entry) => isEntryAllowedForRace(entry, char?.race));
};

const getAvailableLevelSubclasses = (char, selectedClass, customSubclasses = []) => {
  const customKeys = new Set((customSubclasses || []).map((entry) => entry.key || normalizeLocalKey(`${entry.classe}-${entry.nom}`)));
  const entries = [
    ...Object.entries(SOUS_CLASSES).flatMap(([classe, names]) =>
      names.filter(Boolean).map((nom) => ({ nom, classe, key: normalizeLocalKey(`${classe}-${nom}`) }))
    ).filter((entry) => !customKeys.has(entry.key)),
    ...(customSubclasses || []),
  ];
  return entries
    .filter((entry) => entry.nom && entry.classe === selectedClass)
    .filter((entry) => isEntryAllowedForRace(entry, char?.race));
};

function parseLevelDieFormula(formula) {
  const clean = normalizeLevelDieFormula(formula || '1d6');
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { formula: clean, count: 1, faces: 6, modifier: 0 };
  return {
    formula: clean,
    count: Math.max(1, Number(match[1]) || 1),
    faces: Math.max(1, Number(match[2]) || 6),
    modifier: Number(match[3] || 0),
  };
}

function rollLevelDieFormula(formula) {
  const parsed = parseLevelDieFormula(formula);
  const { count, faces, modifier } = parsed;
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1);
  return {
    formula: parsed.formula,
    rolls,
    modifier,
    total: rolls.reduce((sum, roll) => sum + roll, 0) + modifier,
  };
}

function getLevelUpRewards(char, classDef, subclassDef, levelRule) {
  const newLevel = (char.niveau ?? 0) + 1;
  const pts = Number(levelRule?.characterPoints ?? (newLevel % 4 === 0 ? 2 : 1)) || 0;
  const { dice, source } = getLevelUpDice(classDef, subclassDef);
  const { sortsMagiques, sortsPhysiques } = getLevelUpSpellCounts(classDef, subclassDef);
  const competences = getLevelGainNumber(classDef.nombreCompetences) + getLevelGainNumber(subclassDef?.nombreCompetences);
  const list = [
    { delay: 0, icon: '⬆', label: `Point${pts > 1 ? 's' : ''} de caractéristique`, value: `+${pts}`, color: '#c8a84a' },
    { delay: 340, icon: '⚔', label: 'Sort physique', value: `+${sortsPhysiques}`, color: '#ff9b4a' },
    { delay: 680, icon: '✧', label: 'Sort magique', value: `+${sortsMagiques}`, color: '#8a7cff' },
    { delay: 1020, icon: '◆', label: 'Compétence disponible', value: `+${competences}`, color: '#64e0d0' },
  ];
  return { list, dice, diceSource: source, pointsCarac: pts, sortsPhysiques, sortsMagiques, competences };
}

function LevelUpModal({ char, classDef, subclassDef, customClasses = [], customSubclasses = [], customMaitriseEntries = [], levelRules = [], onClose, onConfirm, onDraftChange }) {
  const newLevel = (char.niveau ?? 0) + 1;
  const levelRule = getNextLevelRule(levelRules, char.niveau ?? 0);
  const savedDraft = char.levelUpDraft?.level === newLevel ? char.levelUpDraft : null;
  const classOptions = getAvailableLevelClasses(char, customClasses);
  const needsClassChoice = Boolean(levelRule?.unlockClass);
  const [selectedClass, setSelectedClass] = useState(savedDraft?.selectedClass || (needsClassChoice ? (classOptions[0]?.nom || '') : char.classe));
  const subclassOptions = getAvailableLevelSubclasses(char, selectedClass || char.classe, customSubclasses);
  const needsSubclassChoice = Boolean(levelRule?.unlockSubclass);
  const [selectedSubclass, setSelectedSubclass] = useState(savedDraft?.selectedSubclass || (needsSubclassChoice ? (subclassOptions[0]?.nom || '') : char.sousClasse));
  const selectedSubclassDef = subclassOptions.find((sc) => sc.nom === selectedSubclass)
    || (customSubclasses || []).find((sc) => sc.nom === selectedSubclass);
  // La maîtrise se débloque comme la classe/sous-classe : un palier de
  // niveau dédié (unlockMaitrise), indépendant de celui qui débloque la
  // sous-classe — on peut très bien débloquer la sous-classe au niveau 3
  // et la maîtrise au niveau 5. Si les deux tombent au même niveau (cas le
  // plus courant), le choix reste possible dans la même modale.
  const needsMaitriseChoice = Boolean(levelRule?.unlockMaitrise) || needsSubclassChoice;
  // Une maîtrise se déclare enfant d'une ou plusieurs sous-classes à sa
  // création (voir MaitriseDefPanel, champ sousClasses) — sousClasses vide
  // = disponible pour toutes les sous-classes (sert aux maîtrises par
  // défaut, génériques/non rattachées). selectedSubclassDef retombe déjà
  // sur la sous-classe ACTUELLE du personnage (char.sousClasse) quand on ne
  // choisit pas une nouvelle sous-classe ce niveau-ci (voir plus haut).
  const selectedSubclassKey = selectedSubclassDef?.key || slugifyKey(selectedSubclassDef?.nom || '');
  const maitriseOptions = needsMaitriseChoice
    ? (customMaitriseEntries || []).filter((m) => {
        const scope = Array.isArray(m.sousClasses) ? m.sousClasses : [];
        return scope.length === 0 || scope.includes(selectedSubclassKey);
      })
    : [];
  const [selectedMaitrise, setSelectedMaitrise] = useState(savedDraft?.selectedMaitrise || '');
  const effectiveClassDef = needsClassChoice
    ? getCombinedClassDefinitionByName(selectedClass, customClasses)
    : classDef;
  const effectiveSubclassDef = needsSubclassChoice
    ? getCombinedSubclassDefinitionByName(selectedClass || char.classe, selectedSubclass, customSubclasses)
    : subclassDef;
  const data = getLevelUpRewards(char, effectiveClassDef, effectiveSubclassDef, levelRule);
  const [selectedResource, setSelectedResource] = useState(savedDraft?.selectedResource || '');
  const [rollResult, setRollResult] = useState(savedDraft?.rollResult || null);
  const [previousRoll, setPreviousRoll] = useState(savedDraft?.previousRoll || null);
  const [rolling, setRolling] = useState(false);
  const [rollingFaces, setRollingFaces] = useState([]);
  const [hasRerolled, setHasRerolled] = useState(Boolean(savedDraft?.hasRerolled));
  const [visible, setVisible] = useState([]);
  const [btnVisible, setBtnVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const [confirming, setConfirming] = useState(false); // animation de confirmation
  const rollTimers = useRef({ interval: null, timeout: null });
  const selectionReady = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setEntering(true), 50));
    data.list.forEach((r, i) => {
      setTimeout(() => setVisible(v => [...v, i]), 700 + r.delay);
    });
    // Bouton apparaît avec délai
    setTimeout(() => setBtnVisible(true), 700 + data.list.length * 400 + 100);
  }, []);

  useEffect(() => () => {
    if (rollTimers.current.interval) clearInterval(rollTimers.current.interval);
    if (rollTimers.current.timeout) clearTimeout(rollTimers.current.timeout);
  }, []);

  useEffect(() => {
    if (!selectionReady.current) {
      selectionReady.current = true;
      return;
    }
    setSelectedResource('');
    setSelectedMaitrise('');
    setRollResult(null);
    setPreviousRoll(null);
    setRollingFaces([]);
    setHasRerolled(false);
    onDraftChange?.({
      level: newLevel,
      selectedClass,
      selectedSubclass,
      selectedMaitrise: '',
      selectedResource: '',
      hasRerolled: false,
      previousRoll: null,
      rollResult: null,
    });
  }, [selectedClass, selectedSubclass]);

  const rollResource = (resource, reroll = false) => {
    if (!resource) return;
    if (confirming || rolling) return;
    if (selectedResource && selectedResource !== resource.key) return;
    if (selectedResource && !reroll) return;
    if (reroll && hasRerolled) return;

    const parsed = parseLevelDieFormula(data.dice[resource.key]);
    const makePreview = () => Array.from(
      { length: parsed.count },
      () => Math.floor(Math.random() * parsed.faces) + 1,
    );

    setSelectedResource(resource.key);
    if (reroll) setPreviousRoll(rollResult);
    setRolling(true);
    setRollingFaces(makePreview());

    if (rollTimers.current.interval) clearInterval(rollTimers.current.interval);
    if (rollTimers.current.timeout) clearTimeout(rollTimers.current.timeout);
    rollTimers.current.interval = setInterval(() => {
      setRollingFaces(makePreview());
    }, 78);
    rollTimers.current.timeout = setTimeout(() => {
      const rolled = rollLevelDieFormula(data.dice[resource.key]);
      clearInterval(rollTimers.current.interval);
      rollTimers.current.interval = null;
      setRollingFaces(rolled.rolls);
      setRollResult({
        ...rolled,
        resourceKey: resource.key,
        resourceLabel: resource.label,
        color: resource.color,
        rerolled: reroll,
      });
      onDraftChange?.({
        level: newLevel,
        selectedClass,
        selectedSubclass,
        selectedResource: resource.key,
        hasRerolled: reroll ? true : hasRerolled,
        previousRoll: reroll ? rollResult : previousRoll,
        rollResult: {
          ...rolled,
          resourceKey: resource.key,
          resourceLabel: resource.label,
          color: resource.color,
          rerolled: reroll,
        },
      });
      setRolling(false);
    }, reroll ? 920 : 820);

    if (reroll) setHasRerolled(true);
  };

  const handleConfirm = () => {
    const resource = LEVEL_RESOURCE_OPTIONS.find((option) => option.key === selectedResource);
    if (!resource || !rollResult || rolling) return;
    setConfirming(true);
    onConfirm({
      vie: resource.key === 'vie' ? rollResult.total : 0,
      mana: resource.key === 'mana' ? rollResult.total : 0,
      endu: resource.key === 'endu' ? rollResult.total : 0,
      resourceKey: resource.key,
      resourceLabel: resource.label,
      formula: rollResult.formula,
      roll: rollResult,
      pointsCarac: data.pointsCarac,
      sortsPhysiques: data.sortsPhysiques,
      sortsMagiques: data.sortsMagiques,
      competences: data.competences,
      classe: needsClassChoice ? selectedClass : '',
      sousClasse: needsSubclassChoice ? selectedSubclass : '',
      maitrise: needsMaitriseChoice ? selectedMaitrise : '',
    });
    // Flash doré puis fermeture
    setTimeout(() => onClose(), 900);
  };

  return (
    <div className={`levelup-overlay${entering ? ' levelup-overlay--in' : ''}${confirming ? ' levelup-overlay--confirm' : ''}`}>
      <div className={`levelup-panel${entering ? ' levelup-panel--in' : ''}${confirming ? ' levelup-panel--confirm' : ''}`}>

        <div className="levelup-badge">
          <div className="levelup-badge-ring" />
          <svg className="levelup-leaf-wreath" viewBox="0 0 120 120" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <g
                key={index}
                transform={`rotate(${index * 20} 60 60) translate(60 -1)`}
              >
                <path
                  d="M0 0 C6 7 7 15 0 23 C-7 15 -6 7 0 0Z"
                  className="levelup-leaf"
                />
                <path
                  d="M0 4 L0 19"
                  className="levelup-leaf-vein"
                />
              </g>
            ))}
          </svg>
          <span className="levelup-lv-num">Lv {newLevel}</span>
        </div>

        <h2 className="levelup-title">Vous avez gagné un niveau</h2>
        <p className="levelup-subtitle">{char.classe} · {char.race}</p>
        <div className="levelup-sep"><span>✦</span></div>

        {(needsClassChoice || needsSubclassChoice || needsMaitriseChoice) && (
          <div className="levelup-choice-block">
            <div className="levelup-resource-kicker">Déblocage du niveau {newLevel}</div>
            {needsClassChoice && (
              <label className="levelup-select-field">
                <span>Classe disponible pour {char.race}</span>
                <select value={selectedClass} onChange={(event) => {
                  const nextClass = event.target.value;
                  setSelectedClass(nextClass);
                  const nextSubclasses = getAvailableLevelSubclasses(char, nextClass, customSubclasses);
                  setSelectedSubclass(nextSubclasses[0]?.nom || '');
                }}>
                  {classOptions.length === 0 ? (
                    <option value="">Aucune classe disponible</option>
                  ) : classOptions.map((entry) => (
                    <option key={entry.key || entry.nom} value={entry.nom}>{entry.nom}</option>
                  ))}
                </select>
              </label>
            )}
            {needsSubclassChoice && (
              <label className="levelup-select-field">
                <span>Sous-classe disponible pour {char.race}</span>
                <select value={selectedSubclass} onChange={(event) => setSelectedSubclass(event.target.value)}>
                  {subclassOptions.length === 0 ? (
                    <option value="">Aucune sous-classe disponible</option>
                  ) : subclassOptions.map((entry) => (
                    <option key={entry.key || `${entry.classe}-${entry.nom}`} value={entry.nom}>{entry.nom}</option>
                  ))}
                </select>
              </label>
            )}
            {needsMaitriseChoice && maitriseOptions.length > 0 && (
              <label className="levelup-select-field">
                <span>Maîtrise</span>
                <select value={selectedMaitrise} onChange={(event) => setSelectedMaitrise(event.target.value)}>
                  <option value="">— Choisir une maîtrise</option>
                  {maitriseOptions.map((m) => (
                    <option key={m.key} value={m.label}>{m.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="levelup-resource-block">
          <div className="levelup-resource-kicker">Choisis le dé de ressource · {data.diceSource}</div>
          <div className="levelup-resource-grid">
            {LEVEL_RESOURCE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`levelup-resource-choice${selectedResource === option.key ? ' is-selected' : ''}${selectedResource && selectedResource !== option.key ? ' is-locked' : ''}`}
                onClick={() => rollResource(option)}
                disabled={confirming || rolling || Boolean(selectedResource)}
                style={{ '--levelup-resource-color': option.color }}
              >
                <span className="levelup-resource-icon">{option.icon}</span>
                <span className="levelup-resource-name">{option.label}</span>
                <strong>{data.dice[option.key]}</strong>
              </button>
            ))}
          </div>
          {(rolling || rollResult) && (
            <div className={`levelup-roll-result${rolling ? ' is-rolling' : ''}`} style={{ '--levelup-roll-color': rollResult?.color || LEVEL_RESOURCE_OPTIONS.find((option) => option.key === selectedResource)?.color }}>
              <div className="levelup-roll-copy">
                <span className="levelup-roll-kicker">
                  {rolling ? 'Le dé roule...' : rollResult.rerolled ? 'Relance conservée' : 'Jet effectué'}
                </span>
                <strong>
                  {rollResult?.resourceLabel || LEVEL_RESOURCE_OPTIONS.find((option) => option.key === selectedResource)?.label} maximum{' '}
                  {rolling ? '...' : signed(rollResult.total)}
                </strong>
                <div className="levelup-dice-line">
                  {(rolling ? rollingFaces : rollResult.rolls).map((face, index) => (
                    <span key={`${face}-${index}`} className="levelup-die-face">{face}</span>
                  ))}
                  {Boolean((rollResult?.modifier ?? parseLevelDieFormula(data.dice[selectedResource]).modifier)) && (
                    <span className="levelup-die-modifier">
                      {signed(rollResult?.modifier ?? parseLevelDieFormula(data.dice[selectedResource]).modifier)}
                    </span>
                  )}
                </div>
                <small>
                  {rollResult?.formula || data.dice[selectedResource]}
                  {!rolling && previousRoll ? ` · ancien jet ${signed(previousRoll.total)}` : ''}
                </small>
              </div>
              <button
                type="button"
                className="levelup-reroll-btn"
                onClick={() => rollResource(LEVEL_RESOURCE_OPTIONS.find((option) => option.key === selectedResource), true)}
                disabled={confirming || rolling || hasRerolled || !rollResult}
              >
                {rolling ? 'Lancer...' : hasRerolled ? 'Relance utilisée' : 'Relancer une fois'}
              </button>
            </div>
          )}
        </div>

        <div className="levelup-rewards">
          {data.list.map((r, i) => (
            <div key={i} className={`levelup-reward${visible.includes(i) ? ' levelup-reward--in' : ''}`}>
              <span className="levelup-reward-icon" style={{ color: r.color }}>{r.icon}</span>
              <span className="levelup-reward-label">{r.label}</span>
              <span className="levelup-reward-value" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Bouton avec sa propre animation d'apparition */}
        <div className={`levelup-btn-wrap${btnVisible ? ' levelup-btn-wrap--in' : ''}`}>
          <button
            className={`levelup-confirm-btn${confirming ? ' levelup-confirm-btn--flash' : ''}`}
            onClick={handleConfirm}
            disabled={
              confirming
              || rolling
              || !rollResult
              || (needsClassChoice && !selectedClass)
              || (needsSubclassChoice && !selectedSubclass)
              || (needsMaitriseChoice && maitriseOptions.length > 0 && !selectedMaitrise)
            }
          >
            {confirming
              ? '✦ Niveau confirmé !'
              : rolling
                ? 'Jet en cours...'
                : rollResult
                ? `✦ Confirmer — Niveau ${newLevel}`
                : 'Choisis une ressource'}
          </button>
          {!confirming && (
            <button className="levelup-skip-btn" onClick={onClose}>Annuler</button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailFiche({ char }) {
  const { levelUp, updateCharacter } = useCharacterStore();
  const { customClasses, customSubclasses, customLevelRules, customMaitriseEntries } = useAdminStore();
  const classDef = getCombinedClassDefinition(char, customClasses);
  const subclassDef = getCombinedSubclassDefinition(char, customSubclasses);
  const masteryStat = classDef.magique || 'CHA';
  const [showLevelUp, setShowLevelUp] = useState(false);

  const chance = getChance(char);

  return (
    <div className="detail-content detail-content-sheet">

      {/* ── Bloc identité unique ── */}
      <section className="detail-section">
        <h2>Identité du personnage</h2>

        <div className="fiche-id-card">

          {/* En-tête : nom + titre */}
          <div className="fiche-id-header">
            <div className="fiche-id-name">{char.nom ?? '—'}</div>
            <div className="fiche-id-subtitle-row">
              <div className="fiche-id-subtitle">
                <span>{char.race ?? '—'}</span>
                <span className="fiche-id-sep">·</span>
                <span>Niveau {char.niveau ?? '—'}</span>
              </div>
              <button
                className="fiche-niveau-btn fiche-niveau-btn--active"
                onClick={() => setShowLevelUp(true)}
                title={`Passer au niveau ${(char.niveau ?? 0) + 1}`}
              >
                Niveau +
              </button>
              {showLevelUp && createPortal(
                <LevelUpModal
                  char={char}
                  classDef={classDef}
                  subclassDef={subclassDef}
                  customClasses={customClasses}
                  customSubclasses={customSubclasses}
                  customMaitriseEntries={customMaitriseEntries || []}
                  levelRules={customLevelRules}
                  onClose={() => setShowLevelUp(false)}
                  onConfirm={(rewards) => levelUp(char.id, rewards)}
                  onDraftChange={(draft) => updateCharacter(char.id, { levelUpDraft: draft })}
                />,
                document.body
              )}
            </div>
          </div>

          {/* Grille d'identité 3 colonnes */}
          <div className="fiche-id-grid">
            {/* Colonne 1 — Origine */}
            <div className="fiche-id-col">
              <div className="fiche-id-col-title">Origine</div>
              {[
                ['Sexe',        char.sexe],
                ['Ascendance',  char.ascendance],
                ['Naissance',   char.naissance],
                ['Provenance',  char.provenance],
              ].map(([label, value]) => (
                <div className="fiche-id-row" key={label}>
                  <span className="fiche-id-label">{label}</span>
                  <span className="fiche-id-value">{value ?? '—'}</span>
                </div>
              ))}
            </div>

            {/* Colonne 2 — Contexte */}
            <div className="fiche-id-col">
              <div className="fiche-id-col-title">Contexte</div>
              {[
                ['Classe',      char.classe],
                ['Sous-Classe', char.sousClasse],
                ['Origine',     char.origine],
                ['Historique',  char.historique],
                ['Maîtrise',    char.maitrise || ''],
                ['Chance',      chance],
              ].map(([label, value]) => (
                <div className="fiche-id-row" key={label}>
                  <span className="fiche-id-label">{label}</span>
                  <span className="fiche-id-value">{value ?? '—'}</span>
                </div>
              ))}
            </div>

            {/* Colonne 3 — Physique */}
            <div className="fiche-id-col">
              <div className="fiche-id-col-title">Physique</div>
              {[
                ['Taille',  char.taille],
                ['Poids',   char.poids],
                ['Âge',     char.age],
              ].map(([label, value]) => (
                <div className="fiche-id-row" key={label}>
                  <span className="fiche-id-label">{label}</span>
                  <span className="fiche-id-value">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SheetTotalRow({ title, base, bonus, objectBonus, tempBonus, malus, objectMalus, tempMalus, totalText }) {
  return (
    <div className="sheet-total-block">
      <h3>{title}</h3>
      <div className="sheet-total-head">
        {['Base', 'Bonus', 'B.Obj', 'B.Temp', 'Malus', 'M.Obj', 'M.Temp'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="sheet-total-values">
        {[base, bonus, objectBonus, tempBonus, malus, objectMalus, tempMalus].map((value, index) => (
          <strong key={index}>{value}</strong>
        ))}
      </div>
      <p>{totalText}</p>
    </div>
  );
}

const STAT_FULL = { FOR: 'Force', DEX: 'Dextérité', CON: 'Constitution', INT: 'Intelligence', SAG: 'Sagesse', CHA: 'Charisme' };

function detailValue(value, { signedValue = false } = {}) {
  const n = Number(value || 0);
  if (n === 0) return '';
  return signedValue ? signed(n) : n;
}

function totalValue(value) {
  const n = Number(value || 0);
  return n > 0 ? `+${n}` : n;
}

function valueToneClass(value, { malus = false } = {}) {
  const n = Number(value || 0);
  if (n === 0) return '';
  if (malus) return ' is-neg';
  return n > 0 ? ' is-pos' : ' is-neg';
}

function CaracTooltipLabel({ carac }) {
  const [rect, setRect] = useState(null);
  const hasDesc = Boolean(carac.description);
  return (
    <>
      <span
        style={hasDesc ? { cursor: 'help' } : undefined}
        onMouseEnter={hasDesc ? (e) => setRect(e.currentTarget.getBoundingClientRect()) : undefined}
        onMouseLeave={hasDesc ? () => setRect(null) : undefined}
      >
        {carac.nom}
      </span>
      {hasDesc && rect && createPortal(
        <div
          className="creation-info-floating-tooltip"
          style={{
            top: Math.round(rect.top + rect.height / 2),
            left: rect.right,
            '--info-option-color': 'var(--gold)',
            width: 240,
            opacity: 1,
            animation: 'none',
            transform: 'translate(12px, -50%)',
          }}
        >
          <strong>{carac.nom}</strong>
          <span className="creation-info-tooltip-sep" />
          <span className="creation-info-tooltip-desc">{carac.description}</span>
        </div>,
        document.body,
      )}
    </>
  );
}

function CaracNameCell({ carac }) {
  const [rect, setRect] = useState(null);
  const hasDesc = Boolean(carac.description);
  return (
    <td
      className="carac-td-nom"
      style={hasDesc ? { cursor: 'help' } : undefined}
      onMouseEnter={hasDesc ? (e) => setRect(e.currentTarget.getBoundingClientRect()) : undefined}
      onMouseLeave={hasDesc ? () => setRect(null) : undefined}
    >
      {carac.nom}
      {hasDesc && rect && createPortal(
        <div
          className="creation-info-floating-tooltip"
          style={{
            top: Math.round(rect.top + rect.height / 2),
            left: rect.right,
            '--info-option-color': 'var(--gold)',
            width: 240,
            opacity: 1,
            animation: 'none',
            transform: 'translate(12px, -50%)',
          }}
        >
          <strong>{carac.nom}</strong>
          <span className="creation-info-tooltip-sep" />
          <span className="creation-info-tooltip-desc">{carac.description}</span>
        </div>,
        document.body,
      )}
    </td>
  );
}

function DetailStats({ char }) {
  const { customRaces, customAscendances, customCaracteristiques } = useAdminStore();
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const movementBase = resolveMovementBase(char, customRaces, customAscendances);
  const movementChar = {
    ...char,
    deplacement: {
      ...(char.deplacement || {}),
      base: movementBase,
    },
  };
  const combatStats   = getCombatStats(char);
  const movement      = getMovementData(movementChar);
  const resources     = getResourceData(char);
  const pointsCarac   = char.pointsCarac ?? 0;
  // "actuel" éditable directement depuis la fiche, sans passer par le mode
  // "Modifier" — même champ (char.vie/mana/endu) que celui lu/écrit par le
  // mode combat (voir CombatActivationOverlay.setResourceActuel, même
  // logique de bornage), donc déjà synchronisé dans les deux sens : ce que
  // tu changes ici se retrouve tel quel en combat, et inversement.
  const setResourceActuel = (key, nextValue) => {
    const pool = char[key] || { actuel: 0, max: 0 };
    const clamped = Math.max(0, Math.min(pool.max, nextValue));
    updateCharacter(char.id, { [key]: { ...pool, actuel: clamped } });
  };
  // Bonus/Malus temporaire d'une ressource (vie/mana/endu) — même principe
  // que setResourceActuel juste au-dessus, mais sur un champ à part
  // (tempBonus/tempMalus) plutôt que sur actuel/max.
  const setResourceTempField = (key, field, nextValue) => {
    const pool = char[key] || { actuel: 0, max: 0 };
    updateCharacter(char.id, { [key]: { ...pool, [field]: nextValue } });
  };
  // Bonus/Malus Temp. d'une caractéristique — persisté dans
  // char.statsDetails[cle], lu par getStatBreakdown (domain/characterCalculations).
  const setStatDetail = (cle, field, nextValue) => {
    updateCharacter(char.id, {
      statsDetails: {
        ...(char.statsDetails || {}),
        [cle]: { ...(char.statsDetails?.[cle] || {}), [field]: nextValue },
      },
    });
  };
  // Bonus/Malus d'une stat de combat — persisté dans
  // char.combatStatsDetails[key], lu par getCombatStats.
  const setCombatStatDetail = (key, field, nextValue) => {
    updateCharacter(char.id, {
      combatStatsDetails: {
        ...(char.combatStatsDetails || {}),
        [key]: { ...(char.combatStatsDetails?.[key] || {}), [field]: nextValue },
      },
    });
  };
  // Bonus/Malus Temp. du déplacement — persisté dans char.deplacement,
  // lu par getMovementData (getLinearTotal).
  const setMovementTempField = (field, nextValue) => {
    updateCharacter(char.id, {
      deplacement: { ...(char.deplacement || {}), [field]: nextValue },
    });
  };
  const classDef      = getClassDefinition(char) || {};
  const masteryStat   = classDef.magique || 'CHA';
  const enduranceStat = classDef.physique || 'DEX';
  const caracs = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const caracDefsMap = Object.fromEntries(caracs.map((c) => [c.cle, c]));

  const masteryMod    = masteryStat === 'VAR' ? null : getStatBreakdown(char, masteryStat, caracDefsMap).total;
  const enduranceMod  = enduranceStat === 'VAR' ? null : getStatBreakdown(char, enduranceStat, caracDefsMap).total;

  return (
    <div className="detail-content stats-content">

      {/* ── Tableau Caractéristiques ── */}
      <section className="detail-section">
        <h2>Caractéristiques</h2>
        <div className="carac-table-wrap">
          <table className="carac-table">
            <thead>
              <tr>
                <th className="carac-th-nom">Carac.</th>
                <th>Base</th>
                <th>Mod.</th>
                <th className="carac-bonus">Bonus</th>
                <th className="carac-malus">Malus</th>
                <th className="carac-bonus">Bonus Objet</th>
                <th className="carac-malus">Malus Objet</th>
                <th className="carac-bonus">Bonus Temp.</th>
                <th className="carac-malus">Malus Temp.</th>
                <th className="carac-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {caracs.map((carac, i) => {
                const {
                  base,
                  mod,
                  bonus,
                  malus,
                  bonusObjet,
                  malusObjet,
                  bonusTemp,
                  malusTemp,
                  total,
                } = getStatBreakdown(char, carac.cle, caracDefsMap);
                return (
                  <tr key={carac.cle} className={i % 2 !== 0 ? 'carac-odd' : ''}>
                    <CaracNameCell carac={carac} />
                    <td className="carac-td-base">{base}</td>
                    <td className={`carac-td-mod${valueToneClass(mod)}`}>{detailValue(mod, { signedValue: true })}</td>
                    <td className="carac-td-val carac-pos">{detailValue(bonus)}</td>
                    <td className="carac-td-val carac-neg">{detailValue(malus)}</td>
                    <td className="carac-td-val carac-pos">{detailValue(bonusObjet)}</td>
                    <td className="carac-td-val carac-neg">{detailValue(malusObjet)}</td>
                    <td className="carac-td-val carac-pos">
                      <FormulaInput className="sheet-inline-input" value={bonusTemp} onCommit={(next) => setStatDetail(carac.cle, 'bonusTemp', next)} />
                    </td>
                    <td className="carac-td-val carac-neg">
                      {/* Le total additionne malusTemp tel quel (comme autoMalus, cf.
                          getStatBreakdown), donc il doit rester négatif en interne — ici
                          on affiche/saisit une magnitude positive, plus intuitif, et on
                          la stocke en négatif pour que le total soustraie bien. */}
                      <FormulaInput
                        className="sheet-inline-input"
                        value={Math.abs(malusTemp)}
                        onCommit={(next) => setStatDetail(carac.cle, 'malusTemp', -Math.abs(next))}
                      />
                    </td>
                    <td className={`carac-td-total${total > 0 ? ' carac-pos' : total < 0 ? ' carac-neg' : ''}`}>{total}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="carac-footer">
                <td className="carac-td-nom" colSpan={9}>Points de Carac.</td>
                <td className="carac-td-total">{pointsCarac}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="main-carac-panel">
          <div className="main-carac-panel-head">
            <h3>Mes carac. principales</h3>
          </div>
          <div className="main-carac-panel-sep" />
          <div className="main-carac-card-grid">
            <div className="main-carac-card">
              <div className="main-carac-card-kicker">Mod. de Maîtrise</div>
              <div className="main-carac-card-stat">{statLabel(masteryStat)}</div>
              <div className="main-carac-card-foot">
                <span>Modificateur</span>
                <strong>{masteryMod === null ? '—' : masteryMod}</strong>
              </div>
            </div>

            <div className="main-carac-card">
              <div className="main-carac-card-kicker">Mod. d'Endurance</div>
              <div className="main-carac-card-stat">{statLabel(enduranceStat)}</div>
              <div className="main-carac-card-foot">
                <span>Modificateur</span>
                <strong>{enduranceMod === null ? '—' : enduranceMod}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FicheResourcesSection resources={resources} onActuelChange={setResourceActuel} onTempChange={setResourceTempField} />

      {/* ── Stats de combat ── */}
      <section className="detail-section">
        <h2>Stats de combat</h2>
        {[
          { rows: combatStats.filter((r) => r.label === 'Initiative') },
          { label: 'Attaque', rows: combatStats.filter((r) => r.label.startsWith('Att.')) },
          { label: 'Défense', rows: combatStats.filter((r) => r.label.startsWith('Déf.') || r.label === 'Esquive') },
        ].map(({ label, rows }) => (
          <div key={label ?? 'initiative'} className="combat-stat-group">
            {label && <div className="combat-stat-group-label">{label}</div>}
            <div className="carac-table-wrap">
              <table className="carac-table">
                <thead>
                  <tr>
                    <th className="carac-th-nom">Stat</th>
                    <th>Base</th>
                    <th>Mod.</th>
                    <th className="carac-bonus">Bonus</th>
                    <th className="carac-malus">Malus</th>
                    <th className="carac-bonus">Bonus Temp.</th>
                    <th className="carac-malus">Malus Temp.</th>
                    <th className="carac-th-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.label} className={i % 2 !== 0 ? 'carac-odd' : ''}>
                      <td className="carac-td-nom">{row.label}</td>
                      <td className="carac-td-base">{row.base}</td>
                      <td className={`carac-td-mod${valueToneClass(row.mod)}`}>{detailValue(row.mod, { signedValue: true })}</td>
                      {/* Bonus/Malus : en lecture seule — alimentés par l'équipement porté
                          (voir getCombatStats/getEquippedItemEffectSum), pas de saisie ici. */}
                      <td className="carac-td-val carac-pos">{detailValue(row.bonus)}</td>
                      <td className="carac-td-val carac-neg">{detailValue(row.malus)}</td>
                      <td className="carac-td-val carac-pos">
                        <FormulaInput className="sheet-inline-input" value={row.bonusTemp} onCommit={(next) => setCombatStatDetail(row.key, 'bonusTemp', next)} />
                      </td>
                      <td className="carac-td-val carac-neg">
                        <FormulaInput className="sheet-inline-input" value={row.malusTemp} onCommit={(next) => setCombatStatDetail(row.key, 'malusTemp', next)} />
                      </td>
                      <td className={`carac-td-total${row.total > 0 ? ' carac-pos' : row.total < 0 ? ' carac-neg' : ''}`}>
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className="detail-section">
        <h2>Déplacement</h2>
        <FicheDepCard title="Déplacements" unit="cases / action" movement={movement} onTempChange={setMovementTempField} />
      </section>
    </div>
  );
}

// ── Onglet Informations ───────────────────────────────────────
function cleanInfoDescription(desc, tag) {
  if (!desc) return 'À renseigner.';
  if (!tag) return desc;
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return desc
    .replace(new RegExp(`^\\[\\s*${escaped}\\s*\\]\\s*[–—-]\\s*`, 'i'), '')
    .trim();
}

function findByName(rows = [], name) {
  const key = normalizeLocalKey(name);
  return (rows || []).find((row) => normalizeLocalKey(row?.nom) === key) || null;
}

function mergeDefinition(baseRows = [], customRows = [], name) {
  const base = findByName(baseRows, name) || {};
  const custom = findByName(customRows, name) || {};
  return base.nom || custom.nom ? { ...base, ...custom } : null;
}

function compactList(rows = [], formatter = (row) => row?.nom || row?.label || row?.key || row) {
  return (Array.isArray(rows) ? rows : [])
    .map(formatter)
    .filter(Boolean)
    .slice(0, 8);
}

function infoResourceValues(resources = {}, dice = {}) {
  const base = Object.entries(resources || {})
    .map(([key, value]) => [key, Number(value) || 0])
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key.toUpperCase()} ${signed(value)}`);
  const formulas = Object.entries(dice || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${key.toUpperCase()} ${value}`);
  return [...base, ...formulas];
}

function infoResistanceValue(row) {
  const name = row?.nom || row?.label || row?.key;
  const value = Number(row?.value ?? row?.bonus ?? row?.amount ?? row?.total ?? 0) || 0;
  return name ? `${name} ${signed(value)}` : '';
}

function infoAptitudeValue(row) {
  const name = row?.nom || row?.label || row?.key;
  return name ? `${name}${row?.stat ? ` (${row.stat})` : ''}` : '';
}

function infoNameValue(row) {
  return typeof row === 'string' ? row : row?.nom || row?.label || row?.key || '';
}

function buildInfoDetails(defInput, kind = '', context = {}) {
  // Même piège que definitionInfoText : mergeDefinition peut renvoyer
  // `null`, que le paramètre par défaut (= {}) ne rattrape pas.
  const def = defInput || {};
  const { classCategories = [], itemCategories = [] } = context;
  const classTypeLabel = classCategories.find((c) => c.key === def.type)?.nom || def.type;
  const armuresLabel = Array.isArray(def.armures)
    ? def.armures.map((id) => itemCategories.find((c) => String(c.id) === String(id))?.nom).filter(Boolean).join(', ')
    : def.armures;
  const innate = stripIdentityLead(def.competenceRaciale || def.competenceAscendance || '');
  const resources = infoResourceValues(def.baseResources, def.resourceDice);
  const resistances = compactList(def.resistanceBonuses, infoResistanceValue);
  const aptitudes = compactList(def.aptitudes, infoAptitudeValue);
  const languages = compactList(def.langues, infoNameValue);
  const origins = compactList(def.origines, infoNameValue);
  const provenances = compactList(def.provenanceKeys, infoNameValue);
  const aptitudeChoices = def.aptitudeChoices
    ? [`+1 x${def.aptitudeChoices.plusOne ?? 1}`, `+2 x${def.aptitudeChoices.plusTwo ?? 1}`]
    : [];
  const classSetup = [
    def.type ? `Type : ${classTypeLabel}` : '',
    armuresLabel ? `Armures : ${armuresLabel}` : '',
    def.physique ? `Sort physique : ${def.physique}` : '',
    def.magique ? `Sort magique : ${def.magique}` : '',
    def.nombreSortsMagiques != null ? `${def.nombreSortsMagiques} sort(s) magique(s) / niveau` : '',
    def.nombreSortsPhysiques != null ? `${def.nombreSortsPhysiques} sort(s) physique(s) / niveau` : '',
    def.nombreCompetences != null ? `${def.nombreCompetences} compétence(s) de départ` : '',
  ].filter(Boolean);

  return [
    innate ? { label: kind === 'race' ? 'Compétence innée' : 'Compétence', values: [innate] } : null,
    classSetup.length ? { label: 'Paramètres', values: classSetup } : null,
    resources.length ? { label: 'Ressources', values: resources } : null,
    resistances.length ? { label: 'Résistances', values: resistances } : null,
    aptitudes.length ? { label: 'Aptitudes', values: aptitudes } : null,
    aptitudeChoices.length ? { label: 'Choix aptitude', values: aptitudeChoices } : null,
    languages.length ? { label: 'Langues', values: languages } : null,
    origins.length ? { label: 'Origines', values: origins } : null,
    provenances.length ? { label: 'Provenances', values: provenances } : null,
  ].filter(Boolean);
}

function definitionInfoText(def, fallback = '') {
  // mergeDefinition renvoie `null` (pas `undefined`) quand rien ne
  // correspond — un paramètre par défaut (`def = {}`) ne rattrape que
  // `undefined`, jamais `null`, d'où le crash sur def.description.
  const safeDef = def || {};
  return stripIdentityLead(
    fallback ||
      safeDef.description ||
      safeDef.amelioration ||
      safeDef.competenceRaciale ||
      safeDef.competenceAscendance ||
      '',
  );
}

function InfoBlock({ title, tag, desc, details = [] }) {
  if (!desc && !tag) return null;
  const body = desc ? cleanInfoDescription(desc, tag) : (details.length > 0 ? '' : 'À renseigner.');
  return (
    <div className="info-block">
      <div className="info-block-top">
        <span className="info-block-header">{title}</span>
        {tag && <span className="info-block-tag">{tag}</span>}
      </div>
      {body && <p className="info-block-body">{body}</p>}
      {details.length > 0 && (
        <div className="info-block-details">
          {details.map((section) => (
            <div className="info-block-detail" key={section.label}>
              <span>{section.label}</span>
              <div>
                {section.values.map((value) => <em key={value}>{value}</em>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailInformations({ char }) {
  const {
    customRaces,
    customAscendances,
    customOrigins,
    customProvenances,
    customHistoriques,
    customClasses,
    customSubclasses,
    customMaitriseEntries,
    customClassCategories,
    customItemCategories,
  } = useAdminStore();
  const raceDef = mergeDefinition(RACE_DATA, customRaces, char.race);
  const ascendanceDef = mergeDefinition(ASCENDANCE_DATA, customAscendances, char.ascendance);
  const classDef = getCombinedClassDefinition(char, customClasses);
  const classInfoContext = { classCategories: customClassCategories || [], itemCategories: customItemCategories || [] };
  const subclassDef = getCombinedSubclassDefinition(char, customSubclasses);
  const provenanceDef = mergeDefinition(PROVENANCE_DATA, customProvenances, char.provenance);
  const originDef = mergeDefinition(ORIGIN_DATA, customOrigins, char.origine);
  const historiqueDef = mergeDefinition(HISTORIQUE_DATA, customHistoriques, char.historique);
  const maitriseDef = (customMaitriseEntries || []).find((m) => m.label === char.maitrise);
  const items = [
    ['Ma Race', char.race, definitionInfoText(raceDef, char.descRace), buildInfoDetails(raceDef, 'race')],
    ['Mon Ascendance', char.ascendance, definitionInfoText(ascendanceDef, char.descAscendance), buildInfoDetails(ascendanceDef, 'ascendance')],
    ['Ma Classe', char.classe, definitionInfoText(classDef, char.descClasse), buildInfoDetails(classDef, 'classe', classInfoContext)],
    ['Ma Sous-Classe', char.sousClasse, definitionInfoText(subclassDef, char.descSousClasse), buildInfoDetails(subclassDef, 'sous-classe')],
    ['Ma Provenance', char.provenance, definitionInfoText(provenanceDef, char.descProvenance), buildInfoDetails(provenanceDef, 'provenance')],
    ['Mon Origine', char.origine, definitionInfoText(originDef, char.descOrigine), buildInfoDetails(originDef, 'origine')],
    ['Mon Historique', char.historique, definitionInfoText(historiqueDef, char.descHistorique), buildInfoDetails(historiqueDef, 'historique')],
    ['Ma Maîtrise', char.maitrise, definitionInfoText(maitriseDef, char.descMaitrise), []],
  ];

  return (
    <div className="detail-content info-content">
      <section className="detail-section info-section">
        <h2>Mon Personnage</h2>
        <div className="info-grid">
          {items.map(([title, tag, desc, details]) => (
            <InfoBlock key={title} title={title} tag={tag} desc={desc} details={details} />
          ))}
        </div>
      </section>

      {char.biographie && (
        <section className="detail-section info-section">
          <h2>Ma Biographie</h2>
          <div className="info-block info-block--wide">
            <p className="info-block-body info-block-body--bio">{char.biographie}</p>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Accordion section aptitudes par catégorie ────────────────
function AptRow({ apt, char, index, onDetailChange }) {
  const {
    statMod,
    m2,
    m1,
    raciaux,
    classes,
    historique: historiq,
    origine,
    malus,
    bonus,
    total,
  } = getAptitudeBreakdown(char, apt);
  const hasMaitrise = m2 || m1;
  return (
    <tr className={`apt-row${apt.meta ? ' apt-meta' : ''}${index % 2 === 0 ? ' apt-even' : ''}`}>
      <td className="apt-td-nom">
              <SmartText text={`{aptitude.${apt.nom}}`} className="apt-name-tag sheet-plain-tag" plainTags />
        {apt.meta ? '*' : ''}
      </td>
      <td className={`apt-td-num${valueToneClass(statMod)}`}>{detailValue(statMod, { signedValue: true })}</td>
      <td className="apt-td-check">
        <span className={m2 ? 'apt-check apt-check--on' : 'apt-check apt-check--off'}>{m2 ? '✓' : ''}</span>
      </td>
      <td className="apt-td-check">
        <span className={m1 ? 'apt-check apt-check--on' : 'apt-check apt-check--off'}>{m1 ? '✓' : ''}</span>
      </td>
      <td className={`apt-td-num${valueToneClass(raciaux)}`}>{detailValue(raciaux)}</td>
      <td className={`apt-td-num${valueToneClass(classes)}`}>{detailValue(classes)}</td>
      <td className={`apt-td-num${valueToneClass(historiq)}`}>{detailValue(historiq)}</td>
      <td className={`apt-td-num${valueToneClass(origine)}`}>{detailValue(origine)}</td>
      <td className="apt-td-num carac-pos">
        <FormulaInput className="sheet-inline-input" value={bonus} onCommit={(next) => onDetailChange(apt.nom, 'bonus', next)} />
      </td>
      <td className="apt-td-num carac-neg">
        <FormulaInput className="sheet-inline-input" value={malus} onCommit={(next) => onDetailChange(apt.nom, 'malus', next)} />
      </td>
      <td className={`apt-td-total${hasMaitrise ? ' apt-maitrise' : ''}${total > 0 ? ' apt-total-pos' : total < 0 ? ' apt-total-neg' : ''}`}>
        {totalValue(total)}
      </td>
    </tr>
  );
}

function AptCategorySection({ cat, apts, aptData, char, hasActive, onDetailChange }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`apt-cat${hasActive ? ' apt-cat--active' : ''}`}>
      <button className="apt-cat-header" onClick={() => setOpen((v) => !v)}>
        <span className="apt-cat-title">{cat.label || cat.nom}</span>
        <span className="apt-cat-meta">
          {hasActive && <span className="apt-cat-badge">✦</span>}
          <span className="apt-cat-count">{apts.length}</span>
          <span className="apt-cat-arrow">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="apt-table-wrap">
          <table className="apt-table">
            <thead>
              <tr>
                <th className="apt-th-nom">Nom</th>
                <th>Mod.</th>
                <th title="Maîtrise +2">1×+2</th>
                <th title="Maîtrise +1">1×+1</th>
                <th>Raciaux</th>
                <th>Classes</th>
                <th>Historique</th>
                <th>Origine</th>
                <th className="carac-bonus">Bonus</th>
                <th className="carac-malus">Malus</th>
                <th className="apt-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {apts.map((apt, i) => (
                <AptRow key={apt.nom} apt={apt} char={char} index={i} onDetailChange={onDetailChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseKnowledgeBonusLine(line) {
  if (!line) return [];
  const matches = [...line.matchAll(/\[([^\]]+)\]\s*([+-]\s*\d+)?/g)];
  return matches.map((match) => ({
    nom: match[1].trim(),
    bonus: match[2]?.replace(/\s+/g, '') || '—',
  }));
}

function mergeKnowledgeRows(connaissances, bonusLine) {
  const rows = [...connaissances];
  const known = new Set(rows.map((c) => c.nom?.toLowerCase()));
  parseKnowledgeBonusLine(bonusLine).forEach((item) => {
    if (!known.has(item.nom.toLowerCase())) rows.push(item);
  });
  return rows;
}

function mergeLanguageRows(langues, bonusLine) {
  const rows = [...langues];
  const known = new Set(rows.map((l) => l.nom?.toLowerCase()));
  parseKnowledgeBonusLine(bonusLine).forEach((item) => {
    if (!known.has(item.nom.toLowerCase())) {
      rows.push({ nom: item.nom, type: 'Bonus', bonus: item.bonus });
    }
  });
  return rows;
}

function mergeComputedLanguageRows(langues, bonusLine, computedRows) {
  const rows = mergeLanguageRows(langues, bonusLine);
  const known = new Set(rows.map((l) => l.nom?.toLowerCase()));
  computedRows.forEach((item) => {
    if (!known.has(item.nom.toLowerCase())) {
      rows.push(item);
      known.add(item.nom.toLowerCase());
    }
  });
  return rows;
}

const fallbackCategory = (label) => ({ key: 'autres', nom: label, label, couleur: '#c8a84a' });

function buildCategoryList(categories, fallbackLabel) {
  const seen = new Set();
  const result = [];
  (categories || []).forEach((category) => {
    const key = category.key || normalizeLocalKey(category.nom || category.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push({
      ...category,
      key,
      nom: category.nom || category.label || key,
      label: category.label || category.nom || key,
      couleur: category.couleur || '#c8a84a',
    });
  });
  result.push(fallbackCategory(fallbackLabel));
  return result;
}

function buildEntryCatalog(entries) {
  const catalog = new Map();
  (entries || []).forEach((entry) => {
    const keys = [entry.key, entry.nom, entry.label, entry.title].filter(Boolean);
    keys.forEach((key) => catalog.set(normalizeLocalKey(key), entry));
  });
  return catalog;
}

function enrichRowsByCatalog(rows, catalog, fallbackKey = 'autres') {
  return (rows || []).map((row) => {
    const match = catalog.get(normalizeLocalKey(row.key || row.nom || row.label));
    return {
      ...match,
      ...row,
      nom: row.nom || match?.nom || match?.label || match?.title || row.key,
      key: row.key || match?.key || normalizeLocalKey(row.nom || match?.nom),
      categoryKey: row.categoryKey || match?.categoryKey || match?.cat || fallbackKey,
      couleur: row.couleur || match?.couleur || match?.color,
      description: row.description || match?.description,
    };
  });
}

function groupedRows(rows, categories, fallbackLabel) {
  const categoryList = buildCategoryList(categories, fallbackLabel);
  return categoryList
    .map((category) => ({
      category,
      rows: (rows || []).filter((row) => (row.categoryKey || 'autres') === category.key),
    }))
    .filter((group) => group.rows.length > 0);
}

function KnowledgeCategorySection({ category, rows }) {
  return (
    <details className="sheet-ref-category" open>
      <summary>
        <span className="sheet-ref-dot" style={{ '--sheet-ref-color': category.couleur || '#c8a84a' }} />
        <strong>{category.nom || category.label}</strong>
        <em>{rows.length}</em>
      </summary>
      <div className="apt-knowledge-table">
        <div className="apt-knowledge-head">
          <span>Connaissance</span>
          <span>Bonus</span>
        </div>
        {rows.map((c, i) => (
          <div className="apt-knowledge-row" key={`${c.key || c.nom}-${i}`}>
            <strong>
              <SmartText text={`{knowledge.${c.nom || c.key}}`} className="sheet-plain-tag" plainTags />
            </strong>
            <em>{c.bonus ?? '—'}</em>
          </div>
        ))}
      </div>
    </details>
  );
}

function LanguageCategorySection({ category, rows }) {
  return (
    <details className="sheet-ref-category" open>
      <summary>
        <span className="sheet-ref-dot" style={{ '--sheet-ref-color': category.couleur || '#bcecff' }} />
        <strong>{category.nom || category.label}</strong>
        <em>{rows.length}</em>
      </summary>
      <div className="apt-language-table">
        <div className="apt-language-head">
          <span>Langue</span>
          <span>Source</span>
          <span>Bonus</span>
        </div>
        {rows.map((l, i) => (
          <div className="apt-language-row" key={`${l.key || l.nom}-${i}`}>
            <strong>
              <SmartText text={`{language.${l.nom || l.key}}`} className="sheet-plain-tag" plainTags />
            </strong>
            <span>{l.type ?? '—'}</span>
            <em>{l.bonus ?? '—'}</em>
          </div>
        ))}
      </div>
    </details>
  );
}

// ── Onglet Aptitudes & Connaissances ─────────────────────────
function DetailAptitudes({ char }) {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const aptData     = char.aptitudes ?? {};
  // Bonus/Malus d'une aptitude — à saisir à la main, sans passer par
  // "Modifier" (persisté dans char.aptitudes[nom], lu par getAptitudeBreakdown).
  const setAptitudeDetail = (nom, field, nextValue) => {
    updateCharacter(char.id, {
      aptitudes: {
        ...(char.aptitudes || {}),
        [nom]: { ...(char.aptitudes?.[nom] || {}), [field]: nextValue },
      },
    });
  };
  const computedApts = getComputedAptitudeBonuses(char);
  const customAptitudeCategories = useAdminStore((state) => state.customAptitudeCategories);
  const customAptitudes = useAdminStore((state) => state.customAptitudes);
  const hiddenAptitudeKeys = useAdminStore((state) => state.hiddenAptitudeKeys);
  const customKnowledgeCategories = useAdminStore((state) => state.customKnowledgeCategories);
  const customKnowledge = useAdminStore((state) => state.customKnowledge);
  const customLanguageCategories = useAdminStore((state) => state.customLanguageCategories);
  const customLanguages = useAdminStore((state) => state.customLanguages);
  const connaissances = enrichRowsByCatalog(
    mergeKnowledgeRows(char.connaissances ?? [], char.connaissancesBonus),
    buildEntryCatalog(customKnowledge),
  );
  const langues       = enrichRowsByCatalog(
    mergeComputedLanguageRows(char.langues ?? [], char.languesBonus, getComputedLanguageRows(char)),
    buildEntryCatalog(customLanguages),
  );
  const knowledgeGroups = groupedRows(connaissances, customKnowledgeCategories, 'Autres connaissances');
  const languageGroups = groupedRows(langues, customLanguageCategories, 'Autres langues');
  const historique    = char.historiquePerso ?? null;
  const hiddenAptitudeSet = new Set((hiddenAptitudeKeys || []).map(normalizeLocalKey));
  const customAptitudeKeySet = new Set((customAptitudes || []).map((aptitude) => aptitude.key || normalizeLocalKey(aptitude.nom)));
  const aptitudeCategories = [
    ...APT_CATEGORIES.map((cat) => ({ ...cat, nom: cat.label, couleur: '#bcecff', isDefault: true })),
    ...(customAptitudeCategories || []).map((cat) => ({ ...cat, label: cat.nom || cat.label })),
  ];
  const aptitudeList = [
    ...APTITUDES
      .map((aptitude) => ({
        ...aptitude,
        key: normalizeLocalKey(aptitude.nom),
        categoryKey: aptitude.cat,
        couleur: '#bcecff',
        isDefault: true,
      }))
      .filter((aptitude) => !hiddenAptitudeSet.has(aptitude.key) && !customAptitudeKeySet.has(aptitude.key)),
    ...(customAptitudes || []).map((aptitude) => ({
      ...aptitude,
      key: aptitude.key || normalizeLocalKey(aptitude.nom),
      cat: aptitude.categoryKey || aptitude.cat || 'general',
      categoryKey: aptitude.categoryKey || aptitude.cat || 'general',
      couleur: aptitude.couleur || aptitude.tagColor || '#bcecff',
    })),
  ];

  return (
    <div className="detail-content">

      {/* ── Accordion par catégorie ── */}
      <section className="detail-section">
        <h2>Mes Aptitudes</h2>
        <div className="apt-accordion">
          {aptitudeCategories.map((cat) => {
            const catApts = aptitudeList.filter((a) => (a.categoryKey || a.cat) === cat.key);
            if (catApts.length === 0) return null;
            const hasActive = catApts.some((apt) => {
              const d = aptData[apt.nom] ?? {};
              return d.m2 || d.m1 || (d.bonus ?? 0) !== 0 || (d.malus ?? 0) !== 0
                || (computedApts.raciaux[apt.nom] ?? d.raciaux ?? 0) !== 0
                || (computedApts.classes[apt.nom] ?? d.classes ?? 0) !== 0
                || (computedApts.historique[apt.nom] ?? d.historique ?? 0) !== 0
                || (computedApts.origine[apt.nom] ?? d.origine ?? 0) !== 0;
            });
            return (
              <AptCategorySection
                key={cat.key}
                cat={cat}
                apts={catApts}
                aptData={aptData}
                char={char}
                hasActive={hasActive}
                onDetailChange={setAptitudeDetail}
              />
            );
          })}
        </div>
      </section>

      {/* ── Historique ── */}
      {historique && (
        <section className="detail-section">
          <h2>Mon Historique</h2>
          <div className="histo-layout">

            {/* Gauche : une seule card avec tag + citation + description */}
            <div className="histo-card">
              <div className="histo-tag">[ {historique.titre} ]</div>
              {historique.citation && (
                <p className="histo-citation">— {historique.citation}</p>
              )}
              {historique.description && (
                <p className="histo-desc">{historique.description}</p>
              )}
            </div>

            {/* Droite : Innée + Jet de Métier */}
            {(historique.innee || historique.jetMetier) && (
              <div className="histo-aside">
                {historique.innee && (
                  <div className="histo-aside-block">
                    <span className="histo-aside-label">Innée</span>
                    <strong className="histo-aside-val">{historique.innee}</strong>
                  </div>
                )}
                {historique.jetMetier && (
                  <div className="histo-aside-block histo-aside-block--jet">
                    <span className="histo-aside-label">Jet de Métier</span>
                    <strong className="histo-aside-val histo-jet-val">
                      [ {historique.jetMetier.competence} ]
                      <em>{historique.jetMetier.formule}</em>
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Connaissances ── */}
      <section className="detail-section">
        <SectionTitleWithCount title="Mes Connaissances" count={connaissances.length} />
        {connaissances.length > 0 ? (
          <div className="apt-list-panel">
            {knowledgeGroups.map(({ category, rows }) => (
              <KnowledgeCategorySection key={category.key} category={category} rows={rows} />
            ))}
          </div>
        ) : (
          <p className="apt-empty">Aucune connaissance renseignée.</p>
        )}
      </section>

      {/* ── Langues ── */}
      <section className="detail-section">
        <SectionTitleWithCount title="Mes Langues" count={langues.length} />
        {langues.length > 0 ? (
          <div className="apt-list-panel">
            {languageGroups.map(({ category, rows }) => (
              <LanguageCategorySection key={category.key} category={category} rows={rows} />
            ))}
          </div>
        ) : (
          <p className="apt-empty">Aucune langue renseignée.</p>
        )}
      </section>
    </div>
  );
}

function SectionTitleWithCount({ title, count }) {
  return (
    <div className="apt-section-header">
      <h2>{title}</h2>
      <span className="apt-count-badge">{count}</span>
    </div>
  );
}

// ── Onglet Résistances ────────────────────────────────────────
function resistanceDetail(value, { malus = false } = {}) {
  const n = Number(value || 0);
  if (n === 0) return { text: '', className: 'res3-empty' };
  return {
    text: malus ? `-${Math.abs(n)}` : signed(n),
    className: malus || n < 0 ? 'res3-neg' : 'res3-pos',
  };
}

// tone: 'bonus' | 'malus' | undefined — colore systématiquement en vert/rouge
// (harmonisation demandée : bonus = vert, malus = rouge, partout, y compris
// temporaire), plutôt que seulement quand la valeur est non nulle/positive.
// Raciaux/Classes (tone absent) gardent l'ancien rendu conditionnel.
function ResValue({ value, tone, onCommit }) {
  const n = Number(value || 0);
  const toneClass = tone === 'malus' ? 'res3-neg' : tone === 'bonus' ? 'res3-pos' : '';
  // onCommit fourni = case éditable directement (B.Temp/M.Temp), sans
  // passer par "Modifier".
  if (onCommit) {
    return (
      <FormulaInput
        className={`sheet-inline-input res3-value-input ${toneClass}`}
        value={n}
        onCommit={onCommit}
      />
    );
  }
  if (tone) {
    if (n === 0) return <span className="res3-empty" />;
    return <span className={toneClass}>{tone === 'malus' ? `-${Math.abs(n)}` : signed(n)}</span>;
  }
  const cell = resistanceDetail(value, {});
  return <span className={cell.className}>{cell.text}</span>;
}

function ResGroup({ groupKey, label, items, data, compact = false, onDetailChange }) {
  return (
    <div className={`res3-group${compact ? ' res3-group--compact' : ''}`}>
      {label && <div className="res3-title">{label}</div>}
      <div className="res3-head">
        <span className="res3-head-nom">Nom</span>
        <span>Raciaux</span>
        <span>Classes</span>
        <span className="carac-bonus">Bonus</span>
        <span className="carac-malus">Malus</span>
        <span className="carac-bonus">B.Temp</span>
        <span className="carac-malus">M.Temp</span>
        <span className="res3-head-total">Total</span>
      </div>
      {items.map((nom, i) => {
        const { raciaux, classes, malus, bonus, mtemp, btemp, total } = getResistanceBreakdown(data, groupKey, nom);
        const active  = total !== 0;
        return (
          <div key={nom} className={`res3-row${i % 2 !== 0 ? ' res3-row--alt' : ''}${active ? ' res3-row--active' : ''}`}>
            <span className="res3-nom">{nom}</span>
            <ResValue value={raciaux} />
            <ResValue value={classes} />
            <ResValue value={bonus} tone="bonus" />
            <ResValue value={malus} tone="malus" />
            <ResValue value={btemp} tone="bonus" onCommit={onDetailChange ? (next) => onDetailChange(groupKey, nom, 'btemp', next) : undefined} />
            <ResValue value={mtemp} tone="malus" onCommit={onDetailChange ? (next) => onDetailChange(groupKey, nom, 'mtemp', next) : undefined} />
            <span className={`res3-total${total > 0 ? ' res3-pos' : total < 0 ? ' res3-neg' : ' res3-zero'}`}>
              {total > 0 ? `+${total}` : total === 0 ? '0' : total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Ordre logique demandé
const RES_ORDER = [
  'armes',
  'elementaires',
  'concentration',
  'etatsElementaires',
  'etatsPhysiques',
  'etatsPsychiques',
  'etatsMalediction',
];

function resistanceGroupLabel(groupKey, group) {
  return group?.label || group?.nom || String(groupKey || 'Résistances');
}

function buildResistanceGroups(char, computed, definitions) {
  const keys = new Set([
    ...RES_ORDER,
    ...Object.keys(definitions || {}),
    ...Object.keys(char?.resistances || {}),
    ...Object.keys(computed || {}),
  ]);

  return [...keys]
    .map((key) => {
      const def = definitions?.[key];
      const items = new Set([
        ...(Array.isArray(def?.items) ? def.items : []),
        ...Object.keys(char?.resistances?.[key] || {}),
        ...Object.keys(computed?.[key] || {}),
      ]);

      return {
        key,
        label: resistanceGroupLabel(key, def),
        items: [...items].filter(Boolean),
      };
    })
    .filter((group) => group.items.length > 0);
}

function ResAccordionSection({ groupKey, label, items, data, onDetailChange }) {
  const [open, setOpen] = useState(false);
  const hasActive = items.some((nom) => getResistanceBreakdown(data, groupKey, nom).total !== 0);

  return (
    <div className={`apt-cat${hasActive ? ' apt-cat--active' : ''}`}>
      <button className="apt-cat-header" onClick={() => setOpen(v => !v)}>
        <span className="apt-cat-title">{label}</span>
        <span className="apt-cat-meta">
          {hasActive && <span className="apt-cat-badge">✦</span>}
          <span className="apt-cat-count">{items.length}</span>
          <span className="apt-cat-arrow">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="apt-table-wrap">
          <ResGroup groupKey={groupKey} label={null} items={items} data={data} onDetailChange={onDetailChange} />
        </div>
      )}
    </div>
  );
}

function DetailResistances({ char }) {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const data = char;
  // M.Temp/B.Temp d'une résistance — à saisir à la main, sans passer par
  // "Modifier" (persisté dans char.resistances[groupKey][nom], lu par
  // getResistanceBreakdown).
  const setResistanceDetail = (groupKey, nom, field, nextValue) => {
    updateCharacter(char.id, {
      resistances: {
        ...(char.resistances || {}),
        [groupKey]: {
          ...(char.resistances?.[groupKey] || {}),
          [nom]: { ...(char.resistances?.[groupKey]?.[nom] || {}), [field]: nextValue },
        },
      },
    });
  };
  const computed = getComputedResistanceBonuses(char);
  const customResistanceCategories = useAdminStore((s) => s.customResistanceCategories || []);
  const customResistanceEntries = useAdminStore((s) => s.customResistanceEntries || []);
  const storeDefinitions = {};
  for (const cat of customResistanceCategories) {
    storeDefinitions[cat.key] = {
      label: cat.label,
      items: customResistanceEntries.filter((e) => e.categoryKey === cat.key).map((e) => e.key),
    };
  }
  const definitions = { ...RESISTANCES_DEF, ...storeDefinitions };
  const groups = buildResistanceGroups(char, computed, definitions);

  return (
    <div className="detail-content">
      <section className="detail-section">
        <h2>Mes Résistances</h2>
        <div className="apt-accordion">
          {groups.map((group) => (
            <ResAccordionSection
              key={group.key}
              groupKey={group.key}
              label={group.label}
              items={group.items}
              data={data}
              onDetailChange={setResistanceDetail}
            />
          ))}
          {groups.length === 0 && (
            <p className="comp-empty">Aucune résistance configurée.</p>
          )}
        </div>
        {Object.keys(computed).length > 0 && <p className="res3-note">Bonus automatiques inclus depuis la race, l'ascendance et les passifs.</p>}
      </section>
    </div>
  );
}

// ── Onglet Compétences & Actions ─────────────────────────────

function CompEntry({ typeLabel, item, showMode = false }) {
  const mode = item.mode || 'Passif';
  return (
    <article className="comp-entry">
      <div className="comp-entry-head">
        <span className="comp-entry-type">{typeLabel}</span>
        {item.tag && <strong className="comp-entry-tag">{item.tag}</strong>}
        {item.suffixe && <em className="comp-entry-suffix">{item.suffixe}</em>}
      </div>
      {item.desc && (
        <p className="comp-entry-desc">{item.desc}</p>
      )}
      {showMode && (
        <span className={`comp-entry-mode comp-entry-mode--${mode.toLowerCase()}`}>
          {mode}
        </span>
      )}
    </article>
  );
}

function compRows(items, typeLabel, options = {}) {
  return (items ?? [])
    .filter((item) => item?.desc || item?.tag)
    .map((item, i) => (
      <CompEntry key={`${typeLabel}-${i}`} typeLabel={typeLabel} item={item} showMode={options.showMode} />
    ));
}

function CompGroup({ title, children, emptyText = 'Aucune entrée renseignée.', alwaysVisible = false }) {
  const rows = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  if (!rows.length && !alwaysVisible) return null;
  return (
    <section className="comp-group">
      <div className="comp-group-head">
        <h3>{title}</h3>
        <span>{rows.length}</span>
      </div>
      {rows.length > 0 ? (
        <div className="comp-group-body">{rows}</div>
      ) : (
        <p className="comp-empty">{emptyText}</p>
      )}
    </section>
  );
}

function parseCompetenceText(text, fallbackTag = '') {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const bracket = raw.match(/^\s*\[\s*([^\]]+?)\s*\]\s*(?:\(([^)]*)\))?\s*[-–:]?\s*([\s\S]*)$/);
  if (bracket) {
    return {
      tag: bracket[1].trim(),
      suffixe: bracket[2]?.trim() || undefined,
      desc: bracket[3]?.trim() || '',
    };
  }

  const dash = raw.match(/^\s*([^–-]{3,70})\s*[–-]\s*([\s\S]+)$/);
  if (dash) {
    return { tag: dash[1].trim(), desc: dash[2].trim() };
  }

  return { tag: fallbackTag, desc: raw };
}

function compWithMode(item, mode) {
  return item ? { ...item, mode } : null;
}

function mergeCompEntries(...groups) {
  const seen = new Set();
  return groups.flat().filter(Boolean).filter((item) => {
    const key = String(item.tag || item.desc || '').trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCompTags(items) {
  return new Set(items.filter(Boolean).map((item) => String(item.tag || '').trim().toLowerCase()).filter(Boolean));
}

function getComputedCompetenceGroups(char) {
  const race = getRaceDefinition(char);
  const ascendance = getAscendanceDefinition(char);
  const classDef = getClassDefinition(char);
  const subclass = getSubclassDefinition(char);

  return {
    specialeClasse: compWithMode(parseCompetenceText(classDef?.competenceInnee, 'Compétence innée'), 'Actif'),
    classe: [
      ...(classDef?.competencesActives ?? []).map((text) => compWithMode(parseCompetenceText(text, 'Active'), 'Actif')),
      ...(classDef?.competencesPassives ?? []).map((text) => compWithMode(parseCompetenceText(text, 'Passive'), 'Passif')),
    ],
    race: [compWithMode(parseCompetenceText(race?.competenceRaciale, 'Race'), 'Passif')],
    ascendance: [compWithMode(parseCompetenceText(ascendance?.competenceAscendance, 'Ascendance'), 'Passif')],
    sousClasse: [
      compWithMode(parseCompetenceText(subclass?.passifsSousClasse, 'Passif de sous-classe'), 'Passif'),
      ...(subclass?.competencesActives ?? []).map((text) => compWithMode(parseCompetenceText(text, 'Active'), 'Actif')),
      ...(subclass?.competencesPassives ?? []).map((text) => compWithMode(parseCompetenceText(text, 'Passive'), 'Passif')),
    ],
  };
}

function ActionCard({ action }) {
  return (
    <article className="comp-action-card">
      <h4>{action.nom || 'Action sans nom'}</h4>
      <div className="comp-action-meta">
        <strong>Coût : <span>{action.cout || '—'}</span></strong>
      </div>
      {action.desc && <p>{action.desc}</p>}
      <div className="comp-action-jet">
        <strong>Jet :</strong>
        <span>{action.jet || action.nom2 || 'Pas de Jets'}</span>
      </div>
    </article>
  );
}

function DetailCompetences({ char }) {
  const ci = char.competencesInnees ?? {};
  const computed = getComputedCompetenceGroups(char);
  const sc = mergeCompEntries(computed.sousClasse, char.competencesSousClasse ?? []);
  const computedTags = getCompTags(mergeCompEntries(
    computed.specialeClasse ? [computed.specialeClasse] : [],
    computed.classe,
    computed.race,
    computed.ascendance,
    sc,
  ));
  const manualCapacities = (char.competences ?? [])
    .map((item) => ({ tag: item.nom, desc: item.desc }))
    .filter((item) => !computedTags.has(String(item.tag || '').trim().toLowerCase()));
  const actions = [...(char.actions ?? []), ...(char.actionsRapide ?? [])].filter((action) => action?.nom || action?.desc);

  return (
    <div className="detail-content comp-content">
      <div className="comp-page-head">
        <h2>Compétences & Actions</h2>
      </div>

      <div className="comp-groups">
        <CompGroup title="Compétences innées">
          {compRows(mergeCompEntries(computed.specialeClasse ? [computed.specialeClasse] : [], ci.spécialeClasse ? [compWithMode(ci.spécialeClasse, 'Actif')] : []), 'Spéciale de classe', { showMode: true })}
          {compRows(mergeCompEntries(computed.classe, (ci.classe ?? []).map((item) => compWithMode(item, 'Passif'))), 'Classe', { showMode: true })}
          {compRows(mergeCompEntries(computed.race, (ci.race ?? []).map((item) => compWithMode(item, 'Passif'))), 'Race', { showMode: true })}
          {compRows(mergeCompEntries(computed.ascendance, (ci.ascendance ?? []).map((item) => compWithMode(item, 'Passif'))), 'Ascendance', { showMode: true })}
          {compRows((ci.origine ?? []).map((item) => compWithMode(item, 'Passif')), 'Origine', { showMode: true })}
          {compRows((ci.historique ?? []).map((item) => compWithMode(item, 'Passif')), 'Historique', { showMode: true })}
        </CompGroup>

        <CompGroup title="Armement & équipement">
          {compRows(ci.armement, 'Armement')}
          {compRows(ci.equipement, 'Équipement')}
        </CompGroup>

        <CompGroup title="Sous-classe">
          {compRows(sc, 'Sous-classe', { showMode: true })}
        </CompGroup>

        <CompGroup
          title="Capacités personnalisées"
          emptyText="Aucune capacité personnalisée associée."
          alwaysVisible
        >
          {compRows(manualCapacities, 'Personnage')}
        </CompGroup>
      </div>

      <section className="comp-actions-panel">
        <div className="comp-group-head">
          <h3>Actions du personnage</h3>
          <span>{actions.length}</span>
        </div>
        <div className="comp-action-head">
          <span>Action</span>
          <span>Coût</span>
          <span>Effet</span>
          <span>Jet</span>
        </div>
        {actions.length > 0 ? (
          <div className="comp-action-card-list">
            {actions.map((action, i) => (
              <ActionCard action={action} key={`${action.nom ?? 'action'}-${i}`} />
            ))}
          </div>
        ) : (
          <div className="comp-action-empty">
            <strong>Aucune action associée.</strong>
            <span>Les actions ajoutées au personnage apparaîtront ici avec leur coût, leur effet et leur jet.</span>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Onglet Grimoire ───────────────────────────────────────────
function DetailGrimoire({ char }) {
  const { addSpell, updateSpell, removeSpell } = useCharacterStore();
  const admin = useAdminStore();
  const { spellTypes, spellZones, spellRanks, remainingSlots } = getGrimoireContext(char, admin);
  const characterName = char.nom || [char.prenom, char.nomFamille].filter(Boolean).join(' ') || 'Nom du personnage';

  return (
    <div className="detail-content grimoire-content">
      <Suspense fallback={<div style={{ color: 'var(--dim)', padding: 24 }}>Ouverture du grimoire…</div>}>
        <GrimoireBook
          spells={char.sorts ?? []}
          characterName={characterName}
          spellTypes={spellTypes}
          spellZones={spellZones}
          spellRanks={spellRanks}
          remainingSlots={remainingSlots}
          onAddSpell={(spell) => addSpell(char.id, spell)}
          onUpdateSpell={(spellId, patch) => updateSpell(char.id, spellId, patch)}
          onDeleteSpell={(spellId) => removeSpell(char.id, spellId)}
        />
      </Suspense>
    </div>
  );
}

// ── Inventaire picker — données & helpers ─────────────────────
// Aucun objet/catégorie de démo — tous créés depuis l'admin.
const INVENTORY_PICKER_TEMP_CATEGORIES = [];
const INVENTORY_PICKER_TEMP_ITEMS = [];

const normalizeInventoryCategoryId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
};

const mergeInventoryPickerRows = (temporaryRows, customRows = []) => [
  ...temporaryRows,
  ...(customRows || []).filter((row) =>
    !temporaryRows.some((t) => String(t.id) === String(row.id))
  ),
];

const getInventoryCategoryChildren = (categories, parentId) =>
  categories.filter((c) => normalizeInventoryCategoryId(c.parentId) === normalizeInventoryCategoryId(parentId));

const getInventoryRootCategories = (categories) =>
  categories.filter((c) => !normalizeInventoryCategoryId(c.parentId));

const getInventoryCategoryBranchIds = (categories, categoryId) => {
  const normalizedId = normalizeInventoryCategoryId(categoryId);
  if (!normalizedId) return [];
  const children = getInventoryCategoryChildren(categories, normalizedId);
  return [normalizedId, ...children.flatMap((child) => getInventoryCategoryBranchIds(categories, child.id))];
};

const getInventoryCategoryById = (categories, categoryId) => {
  const normalizedId = normalizeInventoryCategoryId(categoryId);
  return categories.find((c) => normalizeInventoryCategoryId(c.id) === normalizedId);
};

const inventoryPickerIncludesText = (value, search) =>
  String(value || '').toLowerCase().includes(String(search || '').trim().toLowerCase());

const RESOURCE_EFFECT_KEYS = { vitalite: 'vie', mana: 'mana', endurance: 'endu' };

// Un objet créé depuis l'admin porte toujours un flag `usable` explicite
// (voir ItemPanel.jsx) — pas de déduction par catégorie nécessaire.
const isConsumableItem = (item) => item.usable === true;

// ── Onglet Inventaire ─────────────────────────────────────────
function DetailInventaire({ char }) {
  const { updateCharacter } = useCharacterStore();
  const { customAptitudes, customResistanceEntries, customItemCategories, customItems } = useAdminStore();
  const itemEffectOptions = getItemEffectLookupOptions(customAptitudes, customResistanceEntries);
  const itemCategories = mergeInventoryPickerRows(INVENTORY_PICKER_TEMP_CATEGORIES, customItemCategories);
  const itemCatalog = mergeInventoryPickerRows(INVENTORY_PICKER_TEMP_ITEMS, customItems);
  const rootItemCategories = getInventoryRootCategories(itemCategories);
  const inventaire = char.inventaire ?? [];
  const bourse     = char.bourse ?? 0;

  // Popup générique (bourse + quantité)
  const [popup, setPopup] = useState(null); // { type: 'gold'|'qte', itemId?, value, anchorRef }
  const [popupVal, setPopupVal] = useState(0);
  const [useItemPopup, setUseItemPopup] = useState(null); // item just consumed, shown for its useText
  const [picker, setPicker] = useState(null); // { slotIndex }
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerSubcategory, setPickerSubcategory] = useState('all');
  const [draggedInventoryItemId, setDraggedInventoryItemId] = useState(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);

  const pickerSubcategories = pickerCategory === 'all'
    ? []
    : getInventoryCategoryChildren(itemCategories, pickerCategory);

  const filteredPickerItems = itemCatalog.filter((item) => {
    const categoryId = normalizeInventoryCategoryId(item.categoryId);
    const categoryOk = pickerCategory === 'all'
      ? true
      : getInventoryCategoryBranchIds(itemCategories, pickerCategory).includes(categoryId);
    const subcategoryOk = pickerSubcategory === 'all'
      ? true
      : getInventoryCategoryBranchIds(itemCategories, pickerSubcategory).includes(categoryId);
    const searchOk = !pickerSearch.trim()
      || inventoryPickerIncludesText(item.nom, pickerSearch)
      || inventoryPickerIncludesText(item.description, pickerSearch)
      || inventoryPickerIncludesText(item.desc, pickerSearch);
    return categoryOk && subcategoryOk && searchOk;
  });

  const openPopup = (type, currentVal, itemId = null) => {
    setPopupVal(currentVal);
    setPopup({ type, itemId });
  };
  const closePopup = () => setPopup(null);
  const closePicker = () => setPicker(null);

  const openItemPicker = (slotIndex) => {
    setPicker({ slotIndex });
    setPickerSearch('');
    setPickerCategory('all');
    setPickerSubcategory('all');
  };

  const addItemToSlot = (catalogItem) => {
    if (!picker) return;
    const now = Date.now();
    const itemToPlace = {
      ...catalogItem,
      id: `inv-${now}-${picker.slotIndex}`,
      sourceItemId: catalogItem.id,
      slotIndex: picker.slotIndex,
      qte: catalogItem.qte ?? 1,
      desc: catalogItem.desc ?? catalogItem.description ?? '',
    };
    updateCharacter(char.id, { inventaire: [...inventaire, itemToPlace] });
    closePicker();
  };

  const removeItemFromSlot = (itemId) => {
    updateCharacter(char.id, { inventaire: inventaire.filter((i) => i.id !== itemId) });
  };

  const consumeItem = (item) => {
    const simple = item.effects?.simple || {};
    const resourcePatch = {};
    Object.entries(RESOURCE_EFFECT_KEYS).forEach(([effectKey, resourceKey]) => {
      const amount = Number(simple[effectKey]) || 0;
      if (!amount) return;
      const current = char[resourceKey] ?? { actuel: 0, max: 0 };
      resourcePatch[resourceKey] = {
        ...current,
        actuel: Math.max(0, Math.min(current.max, current.actuel + amount)),
      };
    });

    const remainingQte = (item.qte ?? 1) - 1;
    const newInventaire = remainingQte > 0
      ? inventaire.map((i) => (i.id === item.id ? { ...i, qte: remainingQte } : i))
      : inventaire.filter((i) => i.id !== item.id);

    updateCharacter(char.id, { ...resourcePatch, inventaire: newInventaire });
  };

  const confirmPopup = () => {
    const val = Math.max(0, parseInt(popupVal, 10) || 0);
    if (popup.type === 'gold') {
      updateCharacter(char.id, { bourse: val });
    } else if (popup.type === 'qte') {
      const newInv = inventaire.map(i => i.id === popup.itemId ? { ...i, qte: Math.max(1, val) } : i);
      updateCharacter(char.id, { inventaire: newInv });
    }
    closePopup();
  };

  // Calcul emplacements dynamique depuis char.emplacements
  const e = char.emplacements ?? { base: 50, bonus: 0, objectBonus: 0, tempBonus: 0, malus: 0, objectMalus: 0, tempMalus: 0 };
  const totalSlots = Math.max(1,
    (e.base ?? 50) +
    (e.bonus ?? 0) + (e.objectBonus ?? 0) + (e.tempBonus ?? 0) -
    (e.malus ?? 0) - (e.objectMalus ?? 0) - (e.tempMalus ?? 0)
  );
  // 1 item = 1 case, quelle que soit la quantité
  const usedSlots = inventaire.length;

  // 1 item = 1 case (plus de logique de taille par quantité)
  const placeItems = (items) => {
    const occupied = Array(totalSlots).fill(null);
    const firstFree = () => occupied.findIndex(s => s === null);

    items.forEach((item) => {
      const wanted = Number.isFinite(Number(item.slotIndex)) ? Number(item.slotIndex) : -1;
      const start  = (wanted >= 0 && wanted < totalSlots && !occupied[wanted]) ? wanted : firstFree();
      if (start < 0) return;
      occupied[start] = { item, start, offset: 0, size: 1 };
    });

    return occupied;
  };

  const occupiedSlots = placeItems(inventaire);

  const moveInventoryItem = (itemId, targetSlotIndex) => {
    const sourceItem = inventaire.find((item) => String(item.id) === String(itemId));
    if (!sourceItem || targetSlotIndex < 0 || targetSlotIndex >= totalSlots) return;

    const sourceSlotIndex = Number.isFinite(Number(sourceItem.slotIndex))
      ? Number(sourceItem.slotIndex)
      : occupiedSlots.findIndex((slot) => String(slot?.item?.id) === String(itemId));
    const targetSlot = occupiedSlots[targetSlotIndex];
    if (sourceSlotIndex === targetSlotIndex) return;

    const newInv = inventaire.map((item) => {
      if (String(item.id) === String(itemId)) {
        return { ...item, slotIndex: targetSlotIndex };
      }
      if (targetSlot?.item && String(item.id) === String(targetSlot.item.id)) {
        return { ...item, slotIndex: sourceSlotIndex >= 0 ? sourceSlotIndex : undefined };
      }
      return item;
    });

    updateCharacter(char.id, { inventaire: newInv });
  };

  const readInventoryDragPayload = (event) => {
    const rawPayload = event.dataTransfer.getData('application/x-eindhill-inventory-item')
      || event.dataTransfer.getData('application/json');
    if (!rawPayload) return null;
    try {
      const payload = JSON.parse(rawPayload);
      return payload?.type === 'inventory-slot-item' ? payload : null;
    } catch {
      return null;
    }
  };

  const handleInventoryCellDragOver = (event, slotIndex) => {
    if (!draggedInventoryItemId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSlotIndex(slotIndex);
  };

  const handleInventoryCellDrop = (event, slotIndex) => {
    event.preventDefault();
    const payload = readInventoryDragPayload(event);
    const itemId = payload?.itemId ?? draggedInventoryItemId;
    if (itemId) moveInventoryItem(itemId, slotIndex);
    setDraggedInventoryItemId(null);
    setDragOverSlotIndex(null);
  };

  return (
    <div className="detail-content inv2-content">

      <div className="inv2-page-head">
        <h2>Inventaire</h2>
        <button className="inv2-wallet" title="Modifier l'or" onClick={() => openPopup('gold', bourse)}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M10 6h12l-2.4 4.2h-7.2L10 6Z" fill="currentColor" opacity=".65" />
            <path d="M8.8 11.5h14.4c2.6 2.5 4 5.5 4 9.1 0 5.1-3.9 8.4-11.2 8.4S4.8 25.7 4.8 20.6c0-3.6 1.4-6.6 4-9.1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M11 12h10M13 18.2h6M13 22.2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <strong>{bourse}</strong>
          <span>or</span>
        </button>

        {/* Popup édition */}
        {popup && createPortal(
          <div className="inv-popup-backdrop" onClick={closePopup}>
            <div className="inv-popup" onClick={e => e.stopPropagation()}>
              <div className="inv-popup-label">
                {popup.type === 'gold' ? '◈ Bourse d\'or' : '× Quantité'}
              </div>
              <div className="inv-popup-controls">
                <button className="inv-popup-btn" onClick={() => setPopupVal(v => Math.max(0, Number(v) - 1))}>−</button>
                <input
                  type="number"
                  className="inv-popup-input"
                  value={popupVal}
                  onChange={e => setPopupVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmPopup(); if (e.key === 'Escape') closePopup(); }}
                  autoFocus
                  min={0}
                />
                <button className="inv-popup-btn" onClick={() => setPopupVal(v => Number(v) + 1)}>+</button>
              </div>
              <button className="inv-popup-confirm" onClick={confirmPopup}>Confirmer</button>
            </div>
          </div>,
          document.body
        )}

        {/* Texte narratif affiché à l'utilisation d'un item consommable */}
        {useItemPopup && createPortal(
          <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setUseItemPopup(null)}>
            <div className="index-confirm-modal">
              <div className="index-modal-header">
                <h3>{useItemPopup.nom}</h3>
                <button className="admin-btn" onClick={() => setUseItemPopup(null)}>✕ Fermer</button>
              </div>
              <div className="index-confirm-body">
                <SmartText text={useItemPopup.useText} />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      <div className="inv2-emplacements">
        <div className="inv2-emp-title">Mes Emplacements</div>
        <table className="inv2-emp-table">
          <thead>
            <tr>
              <th>Base</th>
              <th>Bonus</th>
              <th>B.Obj</th>
              <th>B.Temp</th>
              <th>Malus</th>
              <th>M.Obj</th>
              <th>M.Temp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="inv2-emp-base">{e.base ?? 50}</td>
              <td className={`inv2-emp-val${(e.bonus ?? 0) > 0 ? ' inv2-pos' : ''}`}>{e.bonus ?? 0}</td>
              <td className={`inv2-emp-val${(e.objectBonus ?? 0) > 0 ? ' inv2-pos' : ''}`}>{e.objectBonus ?? 0}</td>
              <td className={`inv2-emp-val${(e.tempBonus ?? 0) > 0 ? ' inv2-pos' : ''}`}>{e.tempBonus ?? 0}</td>
              <td className={`inv2-emp-val${(e.malus ?? 0) > 0 ? ' inv2-neg' : ''}`}>{e.malus ?? 0}</td>
              <td className={`inv2-emp-val${(e.objectMalus ?? 0) > 0 ? ' inv2-neg' : ''}`}>{e.objectMalus ?? 0}</td>
              <td className={`inv2-emp-val${(e.tempMalus ?? 0) > 0 ? ' inv2-neg' : ''}`}>{e.tempMalus ?? 0}</td>
            </tr>
          </tbody>
        </table>
        <div className="inv2-emp-summary">
          <span><strong>{usedSlots}</strong> cases occupées sur <strong>{totalSlots}</strong>.</span>
        </div>
      </div>

      <div className="inv2-board" style={{ '--inv-columns': 3 }}>
        {Array.from({ length: totalSlots }, (_, index) => {
          const slot = occupiedSlots[index];
          const isStart = slot?.offset === 0;
          return (
            <div
              key={index}
              className={[
                'inv2-cell',
                slot ? 'is-occupied' : '',
                isStart ? 'is-item-start' : '',
                slot && !isStart ? 'is-item-tail' : '',
                draggedInventoryItemId && dragOverSlotIndex === index ? 'is-drop-ok' : '',
              ].filter(Boolean).join(' ')}
              onDragOver={(event) => handleInventoryCellDragOver(event, index)}
              onDragLeave={() => setDragOverSlotIndex((current) => current === index ? null : current)}
              onDrop={(event) => handleInventoryCellDrop(event, index)}
            >
              <span className="inv2-cell-num">{index + 1}</span>
              {!slot && (
                <button
                  className="inv2-empty-add"
                  type="button"
                  onClick={() => openItemPicker(index)}
                  title={`Ajouter un item dans la case ${index + 1}`}
                >
                  <span>+</span>
                </button>
              )}
              {isStart && (
                (() => {
                  const category = getInventoryItemCategory(slot.item);
                  const usable = isConsumableItem(slot.item);
                  return (
                    <div
                      className="inv2-item"
                      draggable
                      onDragStart={(event) => {
                        const payload = {
                          type: 'inventory-slot-item',
                          itemId: slot.item.id,
                          sourceSlotIndex: index,
                        };
                        setDraggedInventoryItemId(slot.item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('application/x-eindhill-inventory-item', JSON.stringify(payload));
                        event.dataTransfer.setData('application/json', JSON.stringify(payload));
                      }}
                      onDragEnd={() => {
                        setDraggedInventoryItemId(null);
                        setDragOverSlotIndex(null);
                      }}
                      style={{ '--item-rarity-color': getItemRarityColor(slot.item) }}
                      title={slot.item.desc || slot.item.nom}
                    >
                      <button
                        type="button"
                        className="inv2-item-del"
                        onClick={(ev) => { ev.stopPropagation(); removeItemFromSlot(slot.item.id); }}
                        title="Supprimer l'objet"
                      >✕</button>
                      <span className="inv2-item-head">
                        <span className="inv2-item-cat" title={category.label}>
                          <CatSVG catKey={category.key} color={category.color} />
                        </span>
                        <strong>{slot.item.nom}</strong>
                      </span>
                      <span className="inv2-item-desc">
                        {slot.item.desc || 'Aucune description renseignée.'}
                      </span>
                      <ItemEffectSummary item={slot.item} {...itemEffectOptions} mode="compact" />
                      {usable && (
                        <button
                          type="button"
                          className="inv2-item-use"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            consumeItem(slot.item);
                            if (slot.item.useText) setUseItemPopup(slot.item);
                          }}
                          title="Utiliser (consomme 1 unité)"
                        >Utiliser</button>
                      )}
                      <span
                        className="inv2-item-count"
                        onClick={ev => { ev.stopPropagation(); openPopup('qte', slot.item.qte ?? 1, slot.item.id); }}
                        title="Modifier la quantité"
                      >
                        {slot.item.qte ?? 1}
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
      {picker && createPortal(
        <div className="inv-picker-backdrop" onClick={closePicker}>
          <div className="inv-picker-panel" onClick={(event) => event.stopPropagation()}>
            <div className="inv-picker-head">
              <div>
                <span className="inv-picker-eyebrow">Case {picker.slotIndex + 1}</span>
                <h3>Ajouter un item</h3>
              </div>
              <button className="inv-picker-close" type="button" onClick={closePicker}>
                × Fermer
              </button>
            </div>

            <div className="inv-picker-filters">
              <label className="inv-picker-field inv-picker-field--search">
                <span>Recherche</span>
                <input
                  type="search"
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  placeholder="Rechercher..."
                  autoFocus
                />
              </label>
              <label className="inv-picker-field">
                <span>Catégorie</span>
                <select
                  value={pickerCategory}
                  onChange={(event) => {
                    setPickerCategory(event.target.value);
                    setPickerSubcategory('all');
                  }}
                >
                  <option value="all">Toutes</option>
                  {rootItemCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.nom}</option>
                  ))}
                </select>
              </label>
              <label className="inv-picker-field">
                <span>Sous-catégorie</span>
                <select
                  value={pickerSubcategory}
                  onChange={(event) => setPickerSubcategory(event.target.value)}
                  disabled={pickerCategory === 'all' || pickerSubcategories.length === 0}
                >
                  <option value="all">Toutes</option>
                  {pickerSubcategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.nom}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inv-picker-list">
              {filteredPickerItems.length === 0 ? (
                <p className="inv-picker-empty">Aucun item ne correspond à ces filtres.</p>
              ) : filteredPickerItems.map((item) => {
                const category = getInventoryCategoryById(itemCategories, item.categoryId);
                const parentCategory = category?.parentId
                  ? getInventoryCategoryById(itemCategories, category.parentId)
                  : category;
                return (
                  <button
                    key={`${item.id}-${item.categoryId}`}
                    className="inv-picker-item"
                    type="button"
                    onClick={() => addItemToSlot(item)}
                    style={{ '--picker-item-color': category?.couleur || parentCategory?.couleur || 'var(--gold)' }}
                  >
                    <span className="inv-picker-item-icon">
                      <CatSVG catKey={getItemEquipType(item) || 'objet'} color={category?.couleur || parentCategory?.couleur || 'var(--gold)'} />
                    </span>
                    <span className="inv-picker-item-main">
                      <strong>{item.nom}</strong>
                      <em>
                        {[parentCategory?.nom, category?.parentId ? category?.nom : null].filter(Boolean).join(' · ') || 'Item'}
                      </em>
                      <span>{item.desc || item.description || 'Aucune description renseignée.'}</span>
                      <ItemEffectSummary item={item} {...itemEffectOptions} mode="compact" />
                    </span>
                    <span className="inv-picker-item-add">Ajouter</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
