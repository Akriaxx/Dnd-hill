import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';
import { useAdminStore } from '../../store/adminStore';
import { useCharacterStore } from '../../store/characterStore';
import { useCombatStore } from '../../store/combatStore';
import { canManageCombat } from '../../auth/permissions';
import CombatCharacterPicker from './CombatCharacterPicker';
import CombatResourceGauges from './CombatResourceGauges';
import CombatStatBlock from './CombatStatBlock';
import CombatPanelSlot from './CombatPanelSlot';

function DeathSkullIcon() {
  return (
    <svg className="death-overlay-skull" viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 4C17.9 4 7 14.6 7 27.4c0 8 4.2 14.6 9.6 19V54c0 2.2 1.8 4 4 4h4v-7h3v7h9v-7h3v7h4c2.2 0 4-1.8 4-4v-7.6c5.4-4.4 9.6-11 9.6-19C57 14.6 46.1 4 32 4Z"
      />
      <ellipse cx="21" cy="28" rx="6" ry="8" fill="#000" />
      <ellipse cx="43" cy="28" rx="6" ry="8" fill="#000" />
      <path fill="#000" d="M32 34l-4 8h8l-4-8Z" />
      <path
        fill="none"
        stroke="#000"
        strokeWidth="2"
        d="M22 48h20M26 48v6M30 48v6M34 48v6M38 48v6"
      />
    </svg>
  );
}

// Affiche d'abord la valeur au moment de la mort, marque une pause "pulse",
// puis bascule sur la nouvelle valeur (celle déjà décrémentée dans le
// store) — pour que la perte du point de Chance se voie, au lieu de
// simplement apparaître déjà à sa valeur finale.
function ChanceDeathCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [pulsing, setPulsing] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return undefined;
    setPulsing(true);
    const t = setTimeout(() => {
      setDisplayValue(value);
      setPulsing(false);
    }, 500);
    prevRef.current = value;
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="death-overlay-chance">
      <span className="death-overlay-chance-label">Chance</span>
      <span className={`death-overlay-chance-value${pulsing ? ' is-pulsing' : ''}`}>{displayValue}</span>
    </div>
  );
}

// Séquence strictement séquentielle (chaque étape attend la fin de la
// précédente) — voir styles/_combat.scss pour les transitions CSS associées :
//   1. darken     — l'écran s'assombrit seul (fade 0 → 95%)
//   2. textIn     — une fois assombri, "Mode Combat : Activation" apparaît (fade 0 → 100)
//   3. loading    — le liseré rouge grandit de l'extérieur vers l'intérieur
//   4. crossfade  — "Activation" s'efface doucement pendant qu'"Activé" apparaît
//   5. rising     — une fois le texte stabilisé sur "Activé", le bloc remonte
//   6. picker     — le sélecteur de personnage apparaît en fondu (0 → 100)
//   7. pickerOut  — une fois un personnage confirmé, le sélecteur s'efface
//   8. headerRise — "Mode Combat" remonte tout en haut de l'écran, "Activé" s'efface
//   9. active     — l'écran de combat complet (sélecteur + cadres + panneaux)
//                   apparaît et reste affiché, plein écran, tant que le combat dure
// rising doit être ≥ à la durée de la transition CSS `transform` sur
// .combat-overlay-center (voir _combat.scss) — sinon le popup "picker"
// apparaît avant que la remontée soit terminée et tout semble se couper net.
const DURATIONS = {
  darken: 2500, textIn: 600, loading: 3000, crossfade: 700, hold: 500, rising: 1000,
  pickerOut: 500, headerRise: 900,
};

// Monté une fois à la racine de l'app (voir App.jsx) : dès que le MJ/dev
// active le mode combat (startCombat), TOUS les écrans connectés (= tous
// les onglets/navigateurs qui partagent le même combatStore — en v1 locale,
// ça veut dire "tous ceux ouverts sur ce navigateur") jouent cette séquence,
// peu importe la page où ils se trouvent. Il n'y a pas de route /combat
// séparée : une fois un personnage confirmé, l'écran de combat complet
// s'affiche ici même, par-dessus la page en dessous, et y reste jusqu'à ce
// que le MJ désactive le mode combat — moment où on retrouve la page du
// dessous telle quelle, sans navigation.
export default function CombatActivationOverlay() {
  const user = useAuthStore((s) => s.user);
  const customRoles = useAdminStore((s) => s.customRoles || []);
  const systemRoleOverrides = useAdminStore((s) => s.systemRoleOverrides || {});
  const active = useCombatStore((s) => s.active);
  const startedAt = useCombatStore((s) => s.startedAt);
  const participants = useCombatStore((s) => s.participants);
  const setParticipantCharacter = useCombatStore((s) => s.setParticipantCharacter);
  const leaveParticipant = useCombatStore((s) => s.leaveParticipant);
  const endCombat = useCombatStore((s) => s.endCombat);
  const statOverrides = useCombatStore((s) => s.statOverrides);
  const setResourceTemp = useCombatStore((s) => s.setResourceTemp);
  const setStatBonus = useCombatStore((s) => s.setStatBonus);
  const panelSelections = useCombatStore((s) => s.panelSelections);
  const setPanelSelection = useCombatStore((s) => s.setPanelSelection);
  const getCharactersForUser = useCharacterStore((s) => s.getCharactersForUser);
  const characters = useCharacterStore((s) => s.characters);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);

  // phase: null | 'darken' | 'textIn' | 'loading' | 'crossfade' | 'rising'
  //   | 'picker' | 'pickerOut' | 'headerRise' | 'active' | 'leaving'
  const [phase, setPhase] = useState(null);
  const prevActiveRef = useRef(active);
  const seenStartedAtRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  // deathPhase: null | 'fade' (écran qui s'assombrit) | 'reveal' ("Vous êtes
  // mort" + crâne) | 'button' (le bouton "Revenir ?" apparaît en plus) |
  // 'chance' (clic sur "Revenir ?" : le message s'efface, le compteur de
  // Chance apparaît à sa place et perd 1 point). Déclenché quand la
  // Vitalité d'un personnage passe de >0 à <=0 en combat (voir
  // setResourceActuel) — jamais au montage sur un perso déjà à 0, ni sur
  // une simple re-lecture de la même valeur.
  const [deathPhase, setDeathPhase] = useState(null);
  const deathTimersRef = useRef([]);
  const clearDeathTimers = () => { deathTimersRef.current.forEach(clearTimeout); deathTimersRef.current = []; };
  useEffect(() => clearDeathTimers, []);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;

    // Front montant : une nouvelle activation qu'on n'a pas encore jouée.
    // La toute première transition passe par queueMicrotask, pas
    // setTimeout(…, 0) : un timeout, même à 0ms, laisse le navigateur
    // peindre une frame avec l'ancienne phase (parfois "active", avec le
    // titre "Mode Combat" encore affiché) avant que l'assombrissement ne
    // démarre — d'où le flash bref rapporté. Une microtâche s'exécute avant
    // le prochain paint, donc React a mis à jour l'affichage avant qu'il ne
    // soit montré à l'écran.
    if (active && !wasActive && startedAt !== seenStartedAtRef.current) {
      seenStartedAtRef.current = startedAt;
      clearTimers();
      queueMicrotask(() => setPhase('darken'));
      const t1 = DURATIONS.darken;
      const t2 = t1 + DURATIONS.textIn;
      const t3 = t2 + DURATIONS.loading;
      const t4 = t3 + DURATIONS.crossfade + DURATIONS.hold;
      const t5 = t4 + DURATIONS.rising;
      timersRef.current.push(setTimeout(() => setPhase('textIn'), t1));
      timersRef.current.push(setTimeout(() => setPhase('loading'), t2));
      timersRef.current.push(setTimeout(() => setPhase('crossfade'), t3));
      timersRef.current.push(setTimeout(() => setPhase('rising'), t4));
      timersRef.current.push(setTimeout(() => setPhase('picker'), t5));
    } else if (active && startedAt !== seenStartedAtRef.current) {
      // Le combat était déjà actif quand ce composant a commencé à
      // l'observer (ex: rechargement de page en pleine partie) — pas de
      // cinématique à rejouer, on retrouve directement l'écran de combat.
      seenStartedAtRef.current = startedAt;
      clearTimers();
      queueMicrotask(() => setPhase('active'));
    }

    // Le MJ a coupé le combat : on referme tout (que la séquence soit en
    // cours ou que l'écran de combat complet soit affiché depuis longtemps)
    // — la page en dessous, jamais quittée, redevient visible telle quelle.
    // Condition sur wasActive : au tout premier montage, `active` vaut déjà
    // `false` par défaut — sans cette garde, ce bloc tournait quand même et
    // faisait passer `phase` par 'leaving' puis null pour rien. Si une
    // vraie activation démarrait dans la foulée (clic rapide juste après le
    // chargement de la page), elle pouvait retomber sur ce 'leaving' encore
    // "en vol", d'où le titre "Mode Combat" fantôme signalé — voir aussi la
    // garde sur centerVisible plus bas, qui couvre le même cas si jamais un
    // vrai combat se termine puis redémarre très vite (< 600ms).
    if (!active && wasActive) {
      clearTimers();
      seenStartedAtRef.current = null;
      queueMicrotask(() => setPhase('leaving'));
      timersRef.current.push(setTimeout(() => setPhase(null), 600));
    }

    return clearTimers;
  }, [active, startedAt]);

  if (!user) return null;

  // L'overlay reste monté en permanence (juste invisible au repos, via la
  // classe --idle) plutôt que d'être démonté/remonté à chaque activation :
  // sinon la toute première frame apparaît déjà avec les styles finaux, et
  // le navigateur n'a rien à "transitionner" — la séquence semble brutale.
  const activePhase = phase || 'idle';
  const myCharacters = getCharactersForUser(user.id);
  const selectedCharacterId = participants[String(user.id)] ?? null;
  const hasCombatAccess = canManageCombat(user, customRoles, systemRoleOverrides);

  // Comme .combat-overlay-status : toujours monté (jamais démonté/remonté),
  // seule l'opacité change. En position absolute (voir _combat.scss), son
  // apparition n'agrandit jamais .combat-overlay-center, donc ne provoque
  // aucun recentrage brutal une fois la remontée terminée.
  const pickerCardVisible = phase === 'picker';
  const pageVisible = phase === 'active';
  // Le titre flottant (fixe à l'écran, indépendant du scroll) ne sert que
  // pendant la cinématique : une fois "active", il cède la place à un titre
  // normal en haut de la page défilable (voir .combat-page-title plus bas)
  // qui, lui, doit scroller AVEC le contenu — pas rester plaqué en haut de
  // l'écran. "Mode Combat" doit rester en haut de la PAGE, pas de l'écran.
  // 'leaving' exclu volontairement : à cette phase, aucune règle CSS ne
  // repositionne .combat-overlay-center (seules --headerRise/--active le
  // font), donc le garder "visible" ici le fait retomber au centre de
  // l'écran (sa position par défaut) avant de s'effacer — un glissement
  // perceptible au lieu d'une disparition nette. Le fondu du wrapper
  // .combat-overlay (voir _combat.scss, transition-duration 0.6s sur
  // --leaving) suffit à lui seul à effacer tout le contenu en dessous.
  const centerVisible = phase && phase !== 'darken' && phase !== 'active' && phase !== 'leaving';
  // "Activation" reste visible jusqu'au crossfade ; "Activé" prend le relais
  // à partir de là et jusqu'à la confirmation du personnage (pickerOut) —
  // au-delà (headerRise/active), les deux s'effacent, le titre devenant un
  // simple en-tête. Les textes sont toujours montés (jamais démontés/
  // remontés), seule leur opacité change, pour un vrai fondu croisé.
  const activationVisible = phase === 'textIn' || phase === 'loading';
  const activatedVisible = ['crossfade', 'rising', 'picker', 'pickerOut'].includes(phase);
  const showLoader = phase === 'textIn' || phase === 'loading';

  // Aucun personnage à engager (spectateur) : on referme complètement plutôt
  // que de forcer l'écran de combat plein écran, qui n'aurait rien à montrer.
  const dismiss = () => setPhase(null);

  // Une fois le personnage confirmé, on ne quitte plus cet écran : le
  // sélecteur s'efface, le titre remonte en en-tête, puis l'écran de combat
  // complet (sélecteur + cadres + panneaux) apparaît — jamais de navigation.
  const enterCombat = () => {
    clearTimers();
    setPhase('pickerOut');
    timersRef.current.push(setTimeout(() => setPhase('headerRise'), DURATIONS.pickerOut));
    timersRef.current.push(setTimeout(() => setPhase('active'), DURATIONS.pickerOut + DURATIONS.headerRise));
  };

  const selectedChar = characters.find((c) => c.id === selectedCharacterId) || null;
  const overrides = selectedChar
    ? (statOverrides[selectedChar.id] || { resourceTemp: { vie: 0, mana: 0, endu: 0 }, statBonus: {} })
    : null;
  const panelTypes = panelSelections[String(user.id)] || ['inventaire', 'competences', 'grimoire'];

  // Séquence de mort : assombrissement plein écran, puis "Vous êtes mort" +
  // crâne, puis (après un délai) le bouton "Revenir ?" apparaît. Cliquer
  // dessus efface le message et fait apparaître le compteur de Chance, qui
  // perd 1 point. deathContextRef capture le perso/la valeur de Chance au
  // moment du trigger (pas relu plus tard au clic) pour que le "-1" porte
  // sur la valeur au moment de la mort, même si autre chose modifiait la
  // fiche entre-temps.
  const deathContextRef = useRef({ charId: null, chanceAtDeath: 0 });
  const triggerDeathSequence = (charId, chanceAtDeath) => {
    clearDeathTimers();
    deathContextRef.current = { charId, chanceAtDeath: Number(chanceAtDeath) || 0 };
    setDeathPhase('fade');
    // Assombrissement lent (3s, voir .death-overlay-backdrop) avant que le
    // message ne commence même à apparaître — "reveal" attend la fin du
    // fade plutôt que de le chevaucher, pour que ça reste doux du début à
    // la fin au lieu de s'assombrir et d'apparaître en même temps.
    const tFade = 3000;
    const tReveal = tFade;
    const tButton = tReveal + 3000;
    deathTimersRef.current.push(setTimeout(() => setDeathPhase('reveal'), tFade));
    deathTimersRef.current.push(setTimeout(() => setDeathPhase('button'), tButton));
  };
  const confirmDeathReturn = () => {
    clearDeathTimers();
    setDeathPhase('chance');
    const { charId, chanceAtDeath } = deathContextRef.current;
    deathTimersRef.current.push(setTimeout(() => {
      updateCharacter(charId, { chance: Math.max(0, chanceAtDeath - 1) });
    }, 600));
  };

  // Bornée entre 0 et le max de la ressource — on ne veut pas de PV négatifs
  // ni d'un "actuel" qui dépasse le max en tapant une valeur au hasard.
  const setResourceActuel = (key, nextValue) => {
    const pool = selectedChar[key] || { actuel: 0, max: 0 };
    const clamped = Math.max(0, Math.min(pool.max, nextValue));
    updateCharacter(selectedChar.id, { [key]: { ...pool, actuel: clamped } });
    if (key !== 'vie') return;
    if (clamped <= 0 && pool.actuel > 0) {
      triggerDeathSequence(selectedChar.id, selectedChar.chance ?? 0);
    } else if (clamped > 0 && deathPhase) {
      // Ressuscité (soin) pendant que l'écran de mort est encore affiché.
      clearDeathTimers();
      setDeathPhase(null);
    }
  };

  // Rendu via portail directement dans <body> : n'importe quel ancêtre du
  // point de montage de <App/> qui poserait un transform/filter/perspective
  // (extension navigateur, futur composant, etc.) crée un nouveau contexte
  // de positionnement pour tout descendant en position:fixed, qui se met
  // alors à suivre le défilement de cet ancêtre au lieu de rester fixé à la
  // fenêtre — exactement le symptôme "descend quand on scroll" observé. Le
  // portail rend ce risque nul en sortant l'overlay de l'arbre du composant.
  return createPortal(
    <div className={`combat-overlay combat-overlay--${activePhase}`}>
      <div className="combat-overlay-vignette" />
      <div className={`combat-overlay-center${centerVisible ? ' is-visible' : ''}`}>
        <h2>Mode Combat</h2>
        <div className="combat-overlay-status-stack">
          <p className={`combat-overlay-status${activationVisible ? ' is-visible' : ''}`}>Activation</p>
          <p className={`combat-overlay-status${activatedVisible ? ' is-visible' : ''}`}>Activé</p>
        </div>
        <span className={`combat-overlay-loader${showLoader ? ' is-visible' : ''}`} />

        <div className={`combat-overlay-picker${pickerCardVisible ? ' is-visible' : ''}`}>
          <h3>Choisis ton personnage</h3>
          {myCharacters.length === 0 ? (
            <>
              <p>Aucun personnage disponible.</p>
              <button type="button" onClick={dismiss}>Fermer</button>
            </>
          ) : (
            <div className="combat-overlay-picker-row">
              <CombatCharacterPicker
                characters={myCharacters}
                selectedId={selectedCharacterId}
                onSelect={(id) => setParticipantCharacter(user.id, id)}
              />
              <button
                type="button"
                className="combat-overlay-picker-confirm"
                disabled={!selectedCharacterId}
                onClick={enterCombat}
              >
                Entrer en combat
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`combat-overlay-page${pageVisible ? ' is-visible' : ''}`}>
        <div className="combat-page-main">
          <h2 className="combat-page-title">Mode Combat</h2>
          <div className="combat-page-toolbar">
            <CombatCharacterPicker
              characters={myCharacters}
              selectedId={selectedCharacterId}
              onSelect={(id) => setParticipantCharacter(user.id, id)}
            />
            <span className="combat-page-toolbar-sep" />
            <button
              type="button"
              className="combat-page-toolbar-quit"
              onClick={() => leaveParticipant(user.id)}
            >
              Quitter le combat
            </button>
            {hasCombatAccess && (
              <button
                type="button"
                className="combat-mode-toggle active"
                onClick={endCombat}
                title="Terminer le mode combat"
              >
                ⚔ Mode Combat ON
              </button>
            )}
          </div>

          {selectedChar ? (
            <>
              <div className="combat-page-blocks">
                <CombatResourceGauges
                  char={selectedChar}
                  resourceTemp={overrides.resourceTemp}
                  onActuelChange={setResourceActuel}
                  onTempChange={(key, value) => setResourceTemp(selectedChar.id, key, value)}
                />
                <CombatStatBlock
                  char={selectedChar}
                  statBonus={overrides.statBonus}
                  onBonusChange={(key, value) => setStatBonus(selectedChar.id, key, value)}
                />
              </div>

              <div className="combat-page-panels">
                {panelTypes.map((type, index) => (
                  <CombatPanelSlot
                    key={index}
                    char={selectedChar}
                    type={type}
                    onTypeChange={(nextType) => setPanelSelection(user.id, index, nextType)}
                  />
                ))}
              </div>
            </>
          ) : (
            <section className="combat-page-placeholder">
              <p>Choisis un personnage ci-dessus pour rejoindre le combat.</p>
            </section>
          )}
        </div>
      </div>

      {deathPhase && (
        <div className={`death-overlay death-overlay--${deathPhase}`}>
          <div className="death-overlay-backdrop" />
          <div className="death-overlay-content">
            <div className="death-overlay-message">
              <DeathSkullIcon />
              <h2 className="death-overlay-title">Vous êtes mort</h2>
            </div>
            {/* Bouton et compteur montés dès le départ (juste invisibles,
                voir CSS) plutôt qu'au moment de leur phase : sinon leur
                apparition change la hauteur de .death-overlay-content, qui
                est centré verticalement — "Vous êtes mort" se décalerait
                vers le haut au moment même où le bouton apparaît. */}
            <div className="death-overlay-action-stack">
              <button
                type="button"
                className="death-overlay-return"
                onClick={confirmDeathReturn}
                disabled={deathPhase !== 'button'}
                tabIndex={deathPhase === 'button' ? 0 : -1}
              >
                Revenir ?
              </button>
              <ChanceDeathCounter value={selectedChar?.chance ?? 0} />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
