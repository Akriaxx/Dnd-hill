import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SmartText } from './SmartDescEditor';

const SIMPLE_EFFECT_GROUPS = [
  {
    title: 'Ressources',
    keys: [
      ['vitalite', 'Vie', 'cost.vie'],
      ['mana', 'Mana', 'cost.mana'],
      ['endurance', 'Endurance', 'cost.endurance'],
    ],
  },
  {
    title: 'Combat',
    keys: [
      ['initiative', 'Initiative', 'stat.Initiative'],
      ['attaquePhysique', 'Attaque physique', 'stat.Att.Phys'],
      ['attaqueMagique', 'Attaque magique', 'stat.Att.Mag'],
      ['attaqueDistance', 'Attaque à distance', 'stat.Att.Dist'],
      ['resistancePhysique', 'Résistance physique', 'resistance.physique'],
      ['resistanceMagique', 'Résistance magique', 'resistance.magique'],
      ['esquive', 'Esquive', 'stat.Esquive'],
    ],
  },
  // ITEM_SIMPLE_EFFECTS (itemUtils.js) inclut aussi emplacements/déplacement
  // (ex: un sac +15 emplacements) — absents ici jusqu'à présent, donc jamais
  // affichés dans aucun badge "Confère" malgré un bonus bien appliqué.
  {
    title: 'Autres',
    keys: [
      ['emplacements', 'Emplacements'],
      ['deplacement', 'Déplacement'],
    ],
  },
];

const STAT_TAGS = {
  FOR: 'stat.FOR',
  DEX: 'stat.DEX',
  CON: 'stat.CON',
  INT: 'stat.INT',
  SAG: 'stat.SAG',
  CHA: 'stat.CHA',
};

const STAT_LABELS = {
  FOR: 'Force',
  DEX: 'Dextérité',
  CON: 'Constitution',
  INT: 'Intelligence',
  SAG: 'Sagesse',
  CHA: 'Charisme',
};

const ITEM_EFFECT_STAT_KEYS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const signed = (value) => {
  const number = asNumber(value);
  return number > 0 ? `+${number}` : String(number);
};

const normalizeEffects = (effects) => {
  const source = effects && typeof effects === 'object' ? effects : {};
  return {
    simple: source.simple && typeof source.simple === 'object' ? source.simple : {},
    stats: source.stats && typeof source.stats === 'object' ? source.stats : {},
    aptitudes: Array.isArray(source.aptitudes) ? source.aptitudes : [],
    resistances: Array.isArray(source.resistances) ? source.resistances : [],
  };
};

const findOption = (options, key) =>
  options.find((option) => String(option.key) === String(key));

const entryTone = (value) => {
  const number = asNumber(value);
  if (number > 0) return ' item-confers-entry--bonus';
  if (number < 0) return ' item-confers-entry--malus';
  return '';
};

function SmartEffectLabel({ tag, fallback }) {
  return tag ? <SmartText text={`{${tag}}`} plainTags /> : <span>{fallback}</span>;
}

function EffectEntry({ value, tag, fallback }) {
  return (
    <span className={`item-confers-entry${entryTone(value)}`}>
      <strong>{signed(value)}</strong>
      <SmartEffectLabel tag={tag} fallback={fallback} />
    </span>
  );
}

export function buildItemEffectGroups(item, { aptitudeOptions = [], resistanceOptions = [] } = {}) {
  const effects = normalizeEffects(item?.effects);
  const groups = [];

  SIMPLE_EFFECT_GROUPS.forEach((group) => {
    // Un consommable n'a plus de montant fixe pour Vitalité/Mana/Endurance
    // (voir item.useResource) — une éventuelle valeur figée en base est une
    // donnée obsolète qu'on n'affiche plus, pour ne pas spoiler le résultat
    // du jet de dé au joueur.
    if (group.title === 'Ressources' && item?.consumable) return;
    const entries = group.keys
      .map(([key, fallback, tag]) => ({ key, value: asNumber(effects.simple[key]), fallback, tag }))
      .filter((entry) => entry.value !== 0);
    if (entries.length > 0) groups.push({ title: group.title, entries });
  });

  const statEntries = ITEM_EFFECT_STAT_KEYS
    .map((key) => ({
      key,
      value: asNumber(effects.stats[key]),
      fallback: STAT_LABELS[key] || key,
      tag: STAT_TAGS[key],
    }))
    .filter((entry) => entry.value !== 0);
  if (statEntries.length > 0) groups.push({ title: 'Caractéristiques', entries: statEntries });

  const aptitudeEntries = effects.aptitudes
    .map((entry, index) => {
      const option = findOption(aptitudeOptions, entry.key);
      const label = option?.label || entry.label || entry.key;
      return {
        key: `${entry.key || 'apt'}-${index}`,
        value: asNumber(entry.value),
        fallback: label,
        tag: label ? `aptitude.${label}` : null,
      };
    })
    .filter((entry) => entry.value !== 0 && entry.fallback);
  if (aptitudeEntries.length > 0) groups.push({ title: 'Aptitudes', entries: aptitudeEntries });

  const resistanceEntries = effects.resistances
    .map((entry, index) => {
      const option = findOption(resistanceOptions, entry.key);
      const label = option?.label || entry.label || entry.key;
      return {
        key: `${entry.key || 'res'}-${index}`,
        value: asNumber(entry.value),
        fallback: label,
        tag: label ? `resistance.${label}` : null,
      };
    })
    .filter((entry) => entry.value !== 0 && entry.fallback);
  if (resistanceEntries.length > 0) groups.push({ title: 'Résistances', entries: resistanceEntries });

  return groups;
}

function EffectGroupsList({ groups }) {
  return (
    <div className="item-confers-groups">
      {groups.map((group) => (
        <div className="item-confers-group" key={group.title}>
          <span className="item-confers-group-title">{group.title}</span>
          <span className="item-confers-list">
            {group.entries.map((entry) => (
              <EffectEntry
                key={entry.key}
                value={entry.value}
                tag={entry.tag}
                fallback={entry.fallback}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

// Panneau flottant ancré près du bouton "Effets" (voir mode="button") — même
// mécanisme que CaracTooltip (StatsTab.jsx) : position fixe calculée depuis
// getBoundingClientRect au clic, portée par un portail pour échapper aux
// conteneurs scrollables (.eqdoll-body/.eqdoll-inv-list). Un fond transparent
// plein écran capte le clic extérieur pour fermer.
function ItemEffectsPopover({ groups, anchorRect, onClose }) {
  const width = 300;
  const prefersLeft = anchorRect.left + width > window.innerWidth - 16;
  const left = prefersLeft ? Math.max(16, anchorRect.right - width) : anchorRect.left;
  const prefersUp = window.innerHeight - anchorRect.bottom < 240;
  const top = prefersUp ? anchorRect.top - 8 : anchorRect.bottom + 8;
  const transformOrigin = prefersUp ? 'translateY(-100%)' : 'none';

  return createPortal(
    <>
      {/* Portail : le clic bulle à travers l'arbre React (pas le DOM) jusqu'aux
          parents du bouton "Effets" (ex: .eqdoll-slot-filled) — stopPropagation
          impératif ici pour ne pas déclencher leurs handlers de clic. */}
      <div className="item-effects-popover-backdrop" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        className="item-effects-popover"
        style={{ top, left, width, transform: transformOrigin }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="item-confers-label">Effets</span>
        <EffectGroupsList groups={groups} />
      </div>
    </>,
    document.body
  );
}

export default function ItemEffectSummary({
  item,
  aptitudeOptions = [],
  resistanceOptions = [],
  mode = 'full',
}) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const groups = buildItemEffectGroups(item, { aptitudeOptions, resistanceOptions });
  if (groups.length === 0) return null;

  if (mode === 'button') {
    return (
      <>
        <button
          type="button"
          className="item-effects-btn"
          onClick={(e) => {
            e.stopPropagation();
            setAnchorRect(e.currentTarget.getBoundingClientRect());
            setOpen((v) => !v);
          }}
        >
          Effets
        </button>
        {open && anchorRect && (
          <ItemEffectsPopover groups={groups} anchorRect={anchorRect} onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className={`item-confers item-confers--${mode}`}>
      <span className="item-confers-label">Confère</span>
      <EffectGroupsList groups={groups} />
    </div>
  );
}
