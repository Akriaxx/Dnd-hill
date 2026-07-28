import { useMemo, useState, useRef } from 'react';
import { asArray } from '../../pages/admin/adminUtils';
import CreationInfoSelect from '../ui/CreationInfoSelect';
import { playSfx } from '../../utils/sfx';
import pageTurnSfx from '../../assets/audio/sfx-page-turn.mp3';

const SLIDE_MS = 420;
const OPEN_MS  = 1500;
const TURN_MS  = 1030; // animation is 980ms + 50ms buffer to avoid premature leaf removal
const RIFFLE_MS = 170; // per-page riffle when jumping from the index — fast flip 150ms + buffer

const isZoneChamp = (champ = '') => /zone/i.test(champ);

const EMPTY_SPELL = { nom: '', typeKey: '', rankValue: 0, zoneKey: '', champsValues: {}, description: '' };

const findTypeByKey = (spellTypes = [], typeKey) =>
  spellTypes.find((type) => (type.key || type.id) === typeKey) || null;

const findZoneByKey = (spellZones = [], zoneKey) =>
  spellZones.find((zone) => (zone.key || zone.id) === zoneKey) || null;

const spellTypeToOption = (type) => ({
  value: type.key || type.id,
  label: type.nom,
  kind: 'Type',
  color: type.couleur,
  meta: type.accroche ? [type.accroche] : [],
  description: type.description,
  details: [
    asArray(type.usages).length > 0 ? { label: 'Usages', values: asArray(type.usages) } : null,
    asArray(type.contraintes).length > 0 ? { label: 'Contraintes', values: asArray(type.contraintes) } : null,
  ].filter(Boolean),
});

const spellZoneToOption = (zone, rankLabelByValue) => ({
  value: zone.key || zone.id,
  label: `${zone.nom} (${zone.famille || 'Zone'})`,
  kind: 'Zone',
  color: zone.couleur,
  description: zone.description,
  details: [
    { label: 'Débloqué à partir de', values: [rankLabelByValue.get(Number(zone.minRank) || 1) || `Rang ${zone.minRank || 1}`] },
  ],
});

// ── Page content components ──────────────────────────────────────────────────

function InsideCover() {
  return (
    <div className="gb-page gb-page--inside">
      <div className="gb-corner gb-corner--tl" />
      <div className="gb-corner gb-corner--tr" />
      <div className="gb-corner gb-corner--bl" />
      <div className="gb-corner gb-corner--br" />
      <div className="gb-inside-hatch" />
    </div>
  );
}

function TitlePage({ name }) {
  return (
    <div className="gb-page gb-page--title">
      <div className="gb-title-rule" />
      <div className="gb-title-content">
        <p className="gb-title-word">Grimoire</p>
        <p className="gb-title-de">de</p>
        <p className="gb-title-name">{name || '—'}</p>
      </div>
      <div className="gb-title-rule" />
    </div>
  );
}

function CreateLeft({ spell, patch, err, spellTypes = [], spellZones = [], rankChoices = [], rankLabelByValue, isEditing }) {
  const selectedType = findTypeByKey(spellTypes, spell.typeKey);
  const needsZone = asArray(selectedType?.modes).includes('zone');
  const zoneChamp = needsZone ? (asArray(selectedType?.champs).find(isZoneChamp) || 'Zone') : null;
  const availableZones = spellZones.filter((zone) => (Number(zone.minRank) || 1) <= (Number(spell.rankValue) || 0));

  return (
    <div className="gb-page gb-page--create">
      <p className="gb-page-eyebrow">{isEditing ? 'Modifier le sort' : 'Nouveau sort'}</p>
      <label className="gb-field">
        <span className="gb-lbl">Nom du sort</span>
        <input className="gb-inp" value={spell.nom} onChange={(e) => patch('nom', e.target.value)} placeholder="Sans titre…" />
      </label>
      <label className="gb-field">
        <span className="gb-lbl">Type</span>
        <CreationInfoSelect
          value={spell.typeKey}
          options={spellTypes.map(spellTypeToOption)}
          placeholder={spellTypes.length === 0 ? 'Aucun type disponible' : '— Choisir un type —'}
          allowEmpty
          disabled={spellTypes.length === 0}
          onChange={(value) => patch('typeKey', value)}
        />
      </label>
      <label className="gb-field">
        <span className="gb-lbl">Rang</span>
        <select
          className="gb-sel"
          value={spell.rankValue}
          onChange={(e) => patch('rankValue', Number(e.target.value))}
          disabled={rankChoices.length === 0}
        >
          {rankChoices.length === 0 && <option value="0">Aucun rang disponible</option>}
          {rankChoices.map((rank) => (
            <option key={rank.id || rank.key || rank.value} value={rank.value}>
              {rank.label}
            </option>
          ))}
        </select>
        {rankChoices.length === 0 && <span className="gb-lbl gb-lbl--muted">Aucun rang débloqué par le niveau actuel.</span>}
      </label>
      {zoneChamp && (
        <label className="gb-field">
          <span className="gb-lbl">{zoneChamp}</span>
          <CreationInfoSelect
            value={spell.zoneKey}
            options={availableZones.map((zone) => spellZoneToOption(zone, rankLabelByValue))}
            placeholder={availableZones.length === 0 ? 'Aucune zone débloquée à ce rang' : '— Choisir une zone —'}
            allowEmpty
            disabled={availableZones.length === 0}
            onChange={(value) => patch('zoneKey', value)}
          />
        </label>
      )}
      {err && <p className="gb-err">{err}</p>}
    </div>
  );
}

function CreateRight({ spell, patch, patchChamp, onSubmit, spellTypes = [], isEditing, remainingSlots }) {
  const selectedType = findTypeByKey(spellTypes, spell.typeKey);
  const champs = asArray(selectedType?.champs).filter((champ) => !isZoneChamp(champ));

  return (
    <div className="gb-page gb-page--create">
      {champs.map((champ) => (
        <label className="gb-field" key={champ}>
          <span className="gb-lbl">{champ}</span>
          <input
            className="gb-inp"
            value={spell.champsValues?.[champ] || ''}
            onChange={(e) => patchChamp(champ, e.target.value)}
          />
        </label>
      ))}
      <label className="gb-field gb-field--grow">
        <span className="gb-lbl">Description</span>
        <textarea className="gb-ta" value={spell.description} onChange={(e) => patch('description', e.target.value)} placeholder="Décris l'effet du sort…" />
      </label>
      <p className="gb-lbl gb-lbl--muted">{remainingSlots} emplacement{remainingSlots > 1 ? 's' : ''} restant{remainingSlots > 1 ? 's' : ''}</p>
      <button className="gb-submit" onClick={onSubmit}>
        {isEditing ? '✦ Mettre à jour' : '✦ Inscrire dans le grimoire'}
      </button>
    </div>
  );
}

function BackToSommaireButton({ onClick }) {
  return (
    <button type="button" className="gb-back-sommaire" onClick={onClick} title="Retour au sommaire">
      <span className="gb-back-sommaire-line" />
      <span className="gb-back-sommaire-line" />
      <span className="gb-back-sommaire-line" />
    </button>
  );
}

function SpellPage({ spell, spellTypes = [], spellZones = [], rankLabelByValue, onBackToSommaire, onEdit, onDelete }) {
  if (!spell) {
    return (
      <div className="gb-page gb-page--blank">
        {onBackToSommaire && <BackToSommaireButton onClick={onBackToSommaire} />}
        {Array.from({ length: 14 }, (_, i) => <div key={i} className="gb-ruled-line" />)}
      </div>
    );
  }
  const type = findTypeByKey(spellTypes, spell.typeKey);
  const zone = findZoneByKey(spellZones, spell.zoneKey);
  const rankLabel = rankLabelByValue.get(Number(spell.rankValue) || 0) || `Rang ${spell.rankValue || '?'}`;
  const champsValues = spell.champsValues || {};
  return (
    <div className="gb-page gb-page--spell" style={type?.couleur ? { '--spell-type-color': type.couleur } : undefined}>
      {onBackToSommaire && <BackToSommaireButton onClick={onBackToSommaire} />}
      <div className="gb-spell-name">{spell.nom}</div>
      <div className="gb-spell-sub">{rankLabel} · {type?.nom || 'Type inconnu'}</div>
      <div className="gb-spell-tags">
        {zone && <span className="gb-tag">⟡ {zone.nom}</span>}
        {Object.entries(champsValues).filter(([, value]) => value).map(([champ, value]) => (
          <span className="gb-tag" key={champ}>{champ} : {value}</span>
        ))}
      </div>
      {spell.description && <p className="gb-spell-body">{spell.description}</p>}
      <div className="gb-spell-actions">
        <button type="button" className="gb-spell-action" onClick={() => onEdit?.(spell)}>Modifier</button>
        <button type="button" className="gb-spell-action gb-spell-action--danger" onClick={() => onDelete?.(spell)}>Supprimer</button>
      </div>
    </div>
  );
}

function SommairePage() {
  return (
    <div className="gb-page gb-page--title">
      <div className="gb-title-rule" />
      <div className="gb-title-content">
        <p className="gb-title-word">Sommaire</p>
      </div>
      <div className="gb-title-rule" />
    </div>
  );
}

function IndexPage({ spells, onJump, rankLabelByValue, categories }) {
  return (
    <div className="gb-page gb-page--index">
      <p className="gb-page-eyebrow">Table des sorts</p>
      {spells.length === 0 && <p className="gb-lbl gb-lbl--muted">Aucun sort inscrit pour l'instant.</p>}
      <div className="gb-index-categories">
        {categories.map(({ typeNom, items }) => (
          <div key={typeNom} className="gb-index-category">
            <p className="gb-index-category-title">{typeNom}</p>
            <ul className="gb-index-list">
              {items.map(({ spell, idx }) => (
                <li key={idx}>
                  <button type="button" className="gb-index-item" onClick={() => onJump(idx)}>
                    <span className="gb-index-item-name">{spell.nom || 'Sans titre'}</span>
                    <span className="gb-index-item-lvl">{rankLabelByValue.get(Number(spell.rankValue) || 0) || `Rang ${spell.rankValue || '?'}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GrimoireBook({
  spells = [],
  characterName = '',
  spellTypes = [],
  spellZones = [],
  spellRanks = [],
  remainingSlots = 0,
  onAddSpell,
  onUpdateSpell,
  onDeleteSpell,
}) {
  const [phase, setPhase]     = useState('closed'); // closed | opening | open
  const [spread, setSpread]   = useState(0);        // 0=title 1=create 2=sommaire/index 3+=spells
  const [leaf, setLeaf]       = useState(null);     // { fromSpread, toSpread, dir }
  const [spell, setSpell]     = useState(EMPTY_SPELL);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr]         = useState('');
  const dragX = useRef(null);

  const spellSpreads = Math.ceil(spells.length / 2);
  const maxSpread    = 2 + spellSpreads; // 0=title, 1=create, 2=sommaire/index, 3…=spells
  const rankLabelByValue = useMemo(
    () => new Map(spellRanks.map((rank) => [Number(rank.value), rank.label || `Rang ${rank.value}`])),
    [spellRanks]
  );
  const categorizedSpells = useMemo(() => {
    const groups = new Map();
    spells.forEach((spellEntry, idx) => {
      const type = findTypeByKey(spellTypes, spellEntry.typeKey);
      const typeNom = type?.nom || 'Autre';
      if (!groups.has(typeNom)) groups.set(typeNom, []);
      groups.get(typeNom).push({ spell: spellEntry, idx });
    });
    groups.forEach((items) => items.sort((a, b) => (Number(b.spell.rankValue) || 0) - (Number(a.spell.rankValue) || 0)));
    return Array.from(groups.entries())
      .map(([typeNom, items]) => ({ typeNom, items }))
      .sort((a, b) => a.typeNom.localeCompare(b.typeNom, 'fr'));
  }, [spells, spellTypes]);

  // Si le rang choisi n'est plus valide (perso rétrogradé, rang supprimé par le MJ...),
  // on retombe sur le premier rang disponible sans passer par un effect.
  const effectiveRankValue = spellRanks.some((rank) => Number(rank.value) === Number(spell.rankValue))
    ? Number(spell.rankValue)
    : (spellRanks[0]?.value || 0);
  const effectiveSpell = { ...spell, rankValue: effectiveRankValue };

  function patch(k, v) { setSpell((s) => ({ ...s, [k]: v })); }
  function patchChamp(champ, value) {
    setSpell((s) => ({ ...s, champsValues: { ...(s.champsValues || {}), [champ]: value } }));
  }

  function submit() {
    if (!effectiveSpell.nom.trim()) { setErr('Le sort doit avoir un nom.'); return; }
    if (!effectiveSpell.typeKey) { setErr('Choisis un type de sort.'); return; }
    if (!spellRanks.length || Number(effectiveSpell.rankValue) <= 0) { setErr('Aucun rang de sort n’est débloqué pour ce personnage.'); return; }
    const type = findTypeByKey(spellTypes, effectiveSpell.typeKey);
    const needsZone = asArray(type?.modes).includes('zone');
    if (needsZone && !effectiveSpell.zoneKey) { setErr('Ce type de sort nécessite une zone.'); return; }
    if (!editingId && remainingSlots <= 0) { setErr('Aucun emplacement de sort magique disponible.'); return; }

    const payload = { ...effectiveSpell, nom: effectiveSpell.nom.trim() };
    if (editingId) onUpdateSpell?.(editingId, payload);
    else onAddSpell?.(payload);
    setSpell(EMPTY_SPELL);
    setEditingId(null);
    setErr('');
  }

  function startEdit(spellEntry) {
    setEditingId(spellEntry.id);
    setSpell({
      nom: spellEntry.nom || '',
      typeKey: spellEntry.typeKey || '',
      rankValue: Number(spellEntry.rankValue) || 0,
      zoneKey: spellEntry.zoneKey || '',
      champsValues: { ...(spellEntry.champsValues || {}) },
      description: spellEntry.description || '',
    });
    setErr('');
    riffleTo(1);
  }

  function handleDelete(spellEntry) {
    if (!window.confirm(`Supprimer "${spellEntry.nom || 'ce sort'}" du grimoire ?`)) return;
    onDeleteSpell?.(spellEntry.id);
  }

  function openBook() {
    if (phase !== 'closed') return;
    // 1. Slide the closed book to the right
    setPhase('sliding');
    setTimeout(() => {
      // 2. Cover flips open
      setPhase('opening');
      setTimeout(() => setPhase('open'), OPEN_MS);
    }, SLIDE_MS);
  }

  function turn(dir) {
    if (leaf) return;
    const ns = dir === 'fwd' ? spread + 1 : spread - 1;
    if (ns < 0 || ns > maxSpread) return;
    playSfx(pageTurnSfx, 0.4);
    setLeaf({ fromSpread: spread, toSpread: ns, dir });
    setTimeout(() => { setSpread(ns); setLeaf(null); }, TURN_MS);
  }

  function riffleTo(target) {
    if (leaf || target === spread) return;
    const dir = target > spread ? 'fwd' : 'bwd';
    const step = (current) => {
      const next = dir === 'fwd' ? current + 1 : current - 1;
      setLeaf({ fromSpread: current, toSpread: next, dir, fast: true });
      setTimeout(() => {
        setSpread(next);
        setLeaf(null);
        if (next !== target) step(next);
      }, RIFFLE_MS);
    };
    step(spread);
  }

  function jumpToSpell(spellIdx) {
    riffleTo(3 + Math.floor(spellIdx / 2));
  }

  function onPointerDown(e) {
    if (leaf) return;
    if (e.target.closest('input, textarea, select, button')) return;
    const side = e.target.closest('.gb-half--left')  ? 'left'
               : e.target.closest('.gb-half--right') ? 'right'
               : null;
    if (!side) return;
    dragX.current = { startX: e.clientX, side };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerUp(e) {
    if (!dragX.current) return;
    const { startX, side } = dragX.current;
    dragX.current = null;
    const dx = e.clientX - startX;
    if (side === 'right' && dx < -40) turn('fwd');
    else if (side === 'left'  && dx > 40)  turn('bwd');
  }

  // Returns JSX for a page given a spread index and side
  function page(sp, side) {
    if (sp === 0) return side === 'left' ? <InsideCover /> : <TitlePage name={characterName} />;
    if (sp === 1) return side === 'left'
      ? (
        <CreateLeft
          spell={effectiveSpell}
          patch={patch}
          err={err}
          spellTypes={spellTypes}
          spellZones={spellZones}
          rankChoices={spellRanks}
          rankLabelByValue={rankLabelByValue}
          isEditing={Boolean(editingId)}
        />
      )
      : (
        <CreateRight
          spell={effectiveSpell}
          patch={patch}
          patchChamp={patchChamp}
          onSubmit={submit}
          spellTypes={spellTypes}
          isEditing={Boolean(editingId)}
          remainingSlots={remainingSlots}
        />
      );
    if (sp === 2) return side === 'left'
      ? <SommairePage />
      : (
        <IndexPage
          spells={spells}
          onJump={jumpToSpell}
          rankLabelByValue={rankLabelByValue}
          categories={categorizedSpells}
        />
      );
    const base = (sp - 3) * 2;
    return (
      <SpellPage
        spell={side === 'left' ? spells[base] : spells[base + 1]}
        spellTypes={spellTypes}
        spellZones={spellZones}
        rankLabelByValue={rankLabelByValue}
        onBackToSommaire={side === 'left' ? () => riffleTo(2) : null}
        onEdit={startEdit}
        onDelete={handleDelete}
      />
    );
  }

  // During a turn, which spread shows on each half?
  const bgLeft  = leaf ? (leaf.dir === 'fwd' ? leaf.fromSpread : leaf.toSpread) : spread;
  const bgRight = leaf ? (leaf.dir === 'fwd' ? leaf.toSpread   : leaf.fromSpread) : spread;

  // ── Closed ──────────────────────────────────────────────────────────────────
  if (phase === 'closed') {
    return (
      <div className="gb-wrap">
        <div className="gb-book gb-book--closed">
          <div className="gb-closed-spine" />
          <div className="gb-closed-cover">
            <span className="gb-closed-label">Grimoire</span>
            <div className="gb-closed-rule" />
          </div>
          <button className="gb-latch" onClick={openBook} title="Ouvrir le grimoire">
            <span className="gb-latch-body">
              <span className="gb-latch-ring" />
              <span className="gb-latch-bar" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Sliding ──────────────────────────────────────────────────────────────────
  // Closed book slides right to align its spine with the open-book spine position.
  if (phase === 'sliding') {
    return (
      <div className="gb-wrap">
        <div className="gb-book gb-book--closed gb-book--sliding">
          <div className="gb-closed-spine" />
          <div className="gb-closed-cover">
            <span className="gb-closed-label">Grimoire</span>
            <div className="gb-closed-rule" />
          </div>
          <div className="gb-latch">
            <span className="gb-latch-body">
              <span className="gb-latch-ring" />
              <span className="gb-latch-bar" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Opening ──────────────────────────────────────────────────────────────────
  // Left half = plain parchment (no content yet).
  // The inside cover lives on the BACK FACE of the animated leaf,
  // so it is only revealed as the leather cover flips away.
  if (phase === 'opening') {
    return (
      <div className="gb-wrap">
        <div className="gb-book gb-book--open gb-book--opening">
          {/* Transparent spacer — no background, no border, nothing visible */}
          <div className="gb-half-spacer" />
          <div className="gb-spine" />
          {/* Title page already visible behind the cover */}
          <div className="gb-half gb-half--right"><TitlePage name={characterName} /></div>

          {/* Animated cover leaf: front = leather, back = inside cover */}
          <div className="gb-opening-leaf">
            <div className="gb-opening-front">
              <span className="gb-closed-label">Grimoire</span>
              <div className="gb-closed-rule" />
            </div>
            {/* Back face = inside cover, revealed as the cover flips over */}
            <div className="gb-opening-back">
              <InsideCover />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Open ─────────────────────────────────────────────────────────────────────
  return (
    <div className="gb-wrap">
      <div
        className="gb-book gb-book--open"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Static background pages */}
        <div className="gb-half gb-half--left">{page(bgLeft, 'left')}</div>
        <div className="gb-spine" />
        <div className="gb-half gb-half--right">{page(bgRight, 'right')}</div>

        {/* Turning leaf */}
        {leaf && (
          <div className={`gb-turn-leaf gb-turn-leaf--${leaf.fast ? 'fast-' : ''}${leaf.dir}`}>
            <div className="gb-leaf-front">
              {leaf.dir === 'fwd'
                ? page(leaf.fromSpread, 'right')
                : page(leaf.toSpread,   'right')
              }
            </div>
            <div className="gb-leaf-back">
              {leaf.dir === 'fwd'
                ? page(leaf.toSpread,   'left')
                : page(leaf.fromSpread, 'left')
              }
            </div>
          </div>
        )}

        {/* Click-to-turn arrows — always reachable even when a page's content
            (form fields, textarea…) covers most of the drag area. */}
        {spread > 0 && (
          <button
            type="button"
            className="gb-nav-btn gb-nav-btn--prev"
            onClick={() => turn('bwd')}
            disabled={!!leaf}
            title="Page précédente"
          >‹</button>
        )}
        {spread < maxSpread && (
          <button
            type="button"
            className="gb-nav-btn gb-nav-btn--next"
            onClick={() => turn('fwd')}
            disabled={!!leaf}
            title="Page suivante"
          >›</button>
        )}
      </div>
    </div>
  );
}
