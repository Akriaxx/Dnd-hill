import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  RACE_DATA, ASCENDANCE_DATA, CLASS_DATA, SUBCLASS_DATA,
  ORIGIN_DATA, HISTORIQUE_DATA, KNOWLEDGE_DATA, APTITUDES,
} from '../data/gameData';
import { isDevServerNoise, useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import { canAccessAdminSection } from '../auth/permissions';
import Header from '../components/layout/Header';

// ── Panels ────────────────────────────────────────────────────
import CaracteristiquesPanel from './admin/panels/CaracteristiquesPanel';
import GameplayIndexPanel from './admin/panels/GameplayIndexPanel';
import ResistancesDefPanel from './admin/panels/ResistancesDefPanel';
import MaitriseDefPanel from './admin/panels/MaitriseDefPanel';
import PlaceholderPanel from './admin/panels/PlaceholderPanel';
import TicketsPanel from './admin/panels/TicketsPanel';
import TerminalPanel from './admin/panels/TerminalPanel';
import StorageJsonPanel from './admin/panels/StorageJsonPanel';
import OriginesPanel from './admin/panels/OriginesPanel';
import HistoriquesPanel from './admin/panels/HistoriquesPanel';
import ProvenancesPanel from './admin/panels/ProvenancesPanel';
import ConnaissancesPanel from './admin/panels/ConnaissancesPanel';
import LanguesPanel from './admin/panels/LanguesPanel';
import AptitudesPanel from './admin/panels/AptitudesPanel';
import ItemCategoriePanel from './admin/panels/ItemCategoriePanel';
import ItemPanel from './admin/panels/ItemPanel';
import ItemClassePanel from './admin/panels/ItemClassePanel';
import ItemRaretePanel from './admin/panels/ItemRaretePanel';
import PlayersPanel from './admin/panels/PlayersPanel';
import RolesPanel from './admin/panels/RolesPanel';
import CharacterCreationReviewPanel from './admin/panels/CharacterCreationReviewPanel';
import SpellTypesPanel from './admin/panels/SpellTypesPanel';
import SpellZonesPanel from './admin/panels/SpellZonesPanel';
import CompetencesPanel from './admin/panels/CompetencesPanel';
import EtatsPanel from './admin/panels/EtatsPanel';
import SpellRanksPanel from './admin/panels/SpellRanksPanel';
import ActionTypesPanel from './admin/panels/ActionTypesPanel';
import SpecialitesPanel from './admin/panels/SpecialitesPanel';
import LevelingPanel from './admin/panels/LevelingPanel';
import ClassesPanel from './admin/panels/ClassesPanel';
import SousClassesPanel from './admin/panels/SousClassesPanel';
import RacesPanel from './admin/panels/RacesPanel';
import AscendancesPanel from './admin/panels/AscendancesPanel';
import AdminHomePanel from './admin/panels/AdminHomePanel';

// ── Navigation ────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    key: 'accueil', label: null,
    items: [
      { key: 'home', label: 'Accueil' },
    ],
  },
  {
    key: 'general-admin', label: 'Administration général',
    items: [
      { key: 'joueurs', label: 'Joueurs' },
      { key: 'roles', label: 'Gestion des rôles' },
      { key: 'createur-fiche', label: 'Créateur de fiche', badge: 'pendingCharacterCreations' },
      { key: 'tickets', label: 'Tickets', badge: 'openTickets' },
      { key: 'terminal', label: 'Terminal', badge: 'terminalErrors' },
      { key: 'storage', label: 'Stockage JSON' },
    ],
  },
  {
    key: 'references', label: 'Références & Savoirs',
    items: [
      { key: 'connaissances', label: 'Connaissances' },
      { key: 'aptitudes',     label: 'Aptitudes' },
      { key: 'langues',       label: 'Langues' },
    ],
  },
  {
    key: 'identites', label: 'Origines & Identités',
    items: [
      { key: 'origines',    label: 'Origines' },
      { key: 'historiques', label: 'Historiques' },
      { key: 'provenances', label: 'Provenances' },
      { key: 'races',       label: 'Races' },
      { key: 'ascendances', label: 'Ascendances' },
    ],
  },
  {
    key: 'gameplay', label: 'Gameplay',
    items: [
      { key: 'caracteristiques', label: 'Caractéristiques' },
      { key: 'index',            label: 'Index' },
      { key: 'leveling',         label: 'Leveling' },
      { key: 'classes',          label: 'Classes' },
      { key: 'sous-classes',     label: 'Sous-classes' },
      { key: 'competences',      label: 'Compétences' },
      { key: 'resistances',      label: 'Résistances' },
      { key: 'maitrise',         label: 'Maîtrise' },
      { key: 'etats',            label: 'États' },
    ],
  },
  {
    key: 'grimoire', label: 'Grimoire',
    items: [
      { key: 'grimoire-rangs', label: 'Rangs' },
      { key: 'grimoire-types', label: 'Types' },
      { key: 'grimoire-zones', label: 'Zone' },
      { key: 'grimoire-actions', label: "Types d'action" },
      { key: 'grimoire-specialites', label: 'Spécialités' },
    ],
  },
  {
    key: 'items', label: 'Économie & Équipement',
    // Ordre de création : les catégories et classes doivent exister avant
    // qu'un item puisse s'y rattacher — le menu suit ce même ordre logique.
    items: [
      { key: 'item-categorie', label: "Catégorie d'objet" },
      { key: 'item-classe',    label: 'Classe' },
      { key: 'item-rarete',    label: 'Rareté' },
      { key: 'item',           label: 'Item' },
    ],
  },
];

function getSectionMeta(key) {
  const meta = {
    joueurs: { title: 'Joueurs', sub: 'Comptes privés distribués par le MJ' },
    roles: { title: 'Gestion des rôles', sub: 'Création des rangs et droits liés' },
    'createur-fiche': { title: 'Créateur de fiche', sub: 'Validation des fiches proposées par les joueurs' },
    tickets: { title: 'Tickets', sub: 'Suivi des erreurs et incidents applicatifs' },
    terminal: { title: 'Terminal', sub: 'Journal local des erreurs capturées' },
    storage: { title: 'Stockage JSON', sub: 'Sauvegarde temporaire des données gameplay' },
    index: { title: 'Index', sub: 'Références gameplay et règles communes' },
    leveling: { title: 'Leveling', sub: "Progression, niveaux et règles d'évolution" },
    races: { title: 'Races', sub: `${RACE_DATA.length} races de base` },
    ascendances: { title: 'Ascendances', sub: `${ASCENDANCE_DATA.length} ascendances` },
    origines: { title: 'Origines', sub: `${ORIGIN_DATA.length} origines` },
    historiques: { title: 'Historiques', sub: `${HISTORIQUE_DATA.length} historiques` },
    classes: { title: 'Classes', sub: `${CLASS_DATA.length} classes` },
    'sous-classes': { title: 'Sous-classes', sub: `${SUBCLASS_DATA.length} sous-classes` },
    competences: { title: 'Compétences', sub: 'Créateur de compétences avec tags dynamiques' },
    etats: { title: 'États', sub: 'Altérations appliquées aux personnages' },
    'grimoire-rangs': { title: 'Rangs', sub: 'Paliers et puissance des sorts du grimoire' },
    'grimoire-types': { title: 'Types', sub: 'Familles, écoles et natures de sorts' },
    'grimoire-zones': { title: 'Zone', sub: 'Portées, zones et formes d\'effet des sorts' },
    'grimoire-actions': { title: "Types d'action", sub: 'Coût en action des sorts au combat' },
    'grimoire-specialites': { title: 'Spécialités', sub: 'Sous-catégories rattachées aux types de sorts' },
    connaissances: { title: 'Connaissances', sub: `${KNOWLEDGE_DATA.length} entrées` },
    aptitudes: { title: 'Aptitudes', sub: `${APTITUDES.length} aptitudes` },
    langues: { title: 'Langues', sub: 'Langues du monde' },
    item: { title: 'Item', sub: "Items rangés par catégorie d'objet" },
    'item-categorie': { title: "Catégories d'objets", sub: 'Sections utilisées par les items' },
    'item-classe': { title: "Classes d'équipement", sub: "Lourde, Intermédiaire, Finesse… rattachées à Armure/Arme, autorisées ou non par classe de personnage" },
    'item-rarete': { title: 'Rareté', sub: "Niveaux de rareté attribuables aux objets" },
    caracteristiques: { title: 'Caractéristiques', sub: 'Stats de base des personnages' },
    resistances: { title: 'Résistances', sub: 'Catégories et entrées de résistance' },
    maitrise: { title: 'Maîtrise', sub: 'Types de maîtrise disponibles' },
    provenances: { title: 'Provenances', sub: 'Origines géographiques et culturelles' },
  };
  return meta[key] || { title: key, sub: '' };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const customRoles = useAdminStore((s) => s.customRoles || []);
  const systemRoleOverrides = useAdminStore((s) => s.systemRoleOverrides || {});
  const pendingCount = useCharacterStore((s) => (s.pendingCharacterCreations || []).length);
  const openTickets = useAdminStore((s) => (s.appTickets || []).filter((ticket) => !isDevServerNoise(ticket) && ticket.status !== 'closed').length);
  const terminalErrors = useAdminStore((s) => (s.terminalLogs || []).filter((log) => log.level === 'error').length);
  // Permet au toast "nouvelle fiche en attente" (CharacterListPage) d'ouvrir
  // directement la section de validation via navigate('/admin', { state }),
  // au lieu d'atterrir sur l'accueil et forcer un clic de plus.
  const [activeSection, setActiveSection] = useState(location.state?.section || 'home');
  const visibleGroups = useMemo(() => (
    NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessAdminSection(user, item.key, customRoles, systemRoleOverrides)),
      }))
      .filter((group) => group.items.length > 0)
  ), [user, customRoles, systemRoleOverrides]);
  const firstVisibleSection = visibleGroups[0]?.items[0]?.key || 'home';
  const badgeCounts = {
    pendingCharacterCreations: pendingCount,
    openTickets,
    terminalErrors,
  };

  useEffect(() => {
    if (activeSection !== 'home' && !canAccessAdminSection(user, activeSection, customRoles, systemRoleOverrides)) {
      setActiveSection(firstVisibleSection);
    }
  }, [activeSection, user, firstVisibleSection, customRoles, systemRoleOverrides]);

  const meta = getSectionMeta(activeSection);

  const renderPanel = () => {
    switch (activeSection) {
      case 'home':             return <AdminHomePanel onNavigate={setActiveSection} />;
      case 'joueurs':          return <PlayersPanel />;
      case 'roles':            return <RolesPanel />;
      case 'createur-fiche':   return <CharacterCreationReviewPanel />;
      case 'tickets':          return <TicketsPanel />;
      case 'terminal':         return <TerminalPanel />;
      case 'storage':          return <StorageJsonPanel />;
      case 'races':            return <RacesPanel />;
      case 'ascendances':      return <AscendancesPanel />;
      case 'origines':         return <OriginesPanel />;
      case 'historiques':      return <HistoriquesPanel />;
      case 'provenances':      return <ProvenancesPanel />;
      case 'caracteristiques': return <CaracteristiquesPanel />;
      case 'index':            return <GameplayIndexPanel />;
      case 'leveling':         return <LevelingPanel />;
      case 'classes':          return <ClassesPanel />;
      case 'sous-classes':     return <SousClassesPanel />;
      case 'competences':      return <CompetencesPanel />;
      case 'resistances':      return <ResistancesDefPanel />;
      case 'maitrise':         return <MaitriseDefPanel />;
      case 'etats':            return <EtatsPanel />;
      case 'grimoire-rangs':   return <SpellRanksPanel />;
      case 'grimoire-types':   return <SpellTypesPanel />;
      case 'grimoire-zones':   return <SpellZonesPanel />;
      case 'grimoire-actions': return <ActionTypesPanel />;
      case 'grimoire-specialites': return <SpecialitesPanel />;
      case 'connaissances':    return <ConnaissancesPanel />;
      case 'aptitudes':        return <AptitudesPanel />;
      case 'langues':          return <LanguesPanel />;
      case 'item':             return <ItemPanel />;
      case 'item-categorie':   return <ItemCategoriePanel />;
      case 'item-classe':      return <ItemClassePanel />;
      case 'item-rarete':      return <ItemRaretePanel />;
      default:                 return <PlaceholderPanel section={meta.title} />;
    }
  };

  return (
    <div className="admin-page">
      <Header title="Gestion du Donjon" subtitle="Panneau Administrateur" />
      <div className="admin-body">
        <aside className="admin-sidebar">
          {visibleGroups.map((group) => (
            <div key={group.key} className="admin-nav-group">
              {group.label && <div className="admin-sidebar-title">{group.label}</div>}
              {group.items.map((item) => (
                <button
                  key={item.key}
                  className={`admin-sidebar-btn${activeSection === item.key ? ' active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  <span>{item.label}</span>
                  {item.badge && badgeCounts[item.badge] > 0 && (
                    <span className="admin-nav-badge">{badgeCounts[item.badge]}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="admin-sidebar-divider" />
          <button className="admin-sidebar-btn admin-sidebar-btn--back" onClick={() => navigate('/')}>← Retour à la salle</button>
        </aside>
        <main className="admin-main">
          {activeSection !== 'home' && (
            <div className="admin-section-header">
              <h2 className="admin-section-title">{meta.title}</h2>
              {meta.sub && <p className="admin-section-sub">{meta.sub}</p>}
            </div>
          )}
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
