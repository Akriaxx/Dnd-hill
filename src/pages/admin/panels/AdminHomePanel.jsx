import { useRef, useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { useCharacterStore } from '../../../store/characterStore';
import { supabase } from '../../../lib/supabaseClient';
import { asArray } from '../adminUtils';

// ── Constellation canvas ──────────────────────────────────────

function ParticleCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const N = 60;
    const pts = Array.from({ length: N }, () => ({
      x:  Math.random(),
      y:  Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      r:  Math.random() * 1.2 + 0.3,
      o:  Math.random() * 0.45 + 0.08,
    }));

    let raf;
    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = (pts[i].x - pts[j].x) * W;
          const dy = (pts[i].y - pts[j].y) * H;
          const d  = Math.hypot(dx, dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200,168,74,${(1 - d / 140) * 0.065})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(pts[i].x * W, pts[i].y * H);
            ctx.lineTo(pts[j].x * W, pts[j].y * H);
            ctx.stroke();
          }
        }
      }

      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,168,74,${p.o})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      });

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="admin-home-canvas" />;
}

// ── Animated counter ──────────────────────────────────────────

function Counter({ to, delay = 0 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (to === 0) return;
    const t = setTimeout(() => {
      const dur = 900;
      const t0  = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [to, delay]);

  return <>{val}</>;
}

// ── Stat card with 3-D tilt ───────────────────────────────────

function Card({ label, value, sub, onClick, index }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translateZ(12px)`;
    el.style.setProperty('--sx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--sy', `${(y + 0.5) * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className={`ahc${onClick ? ' ahc--link' : ''}`}
      style={{ '--i': index }}
      onClick={onClick}
      onMouseMove={onClick ? onMove : undefined}
      onMouseLeave={onClick ? onLeave : undefined}
      disabled={!onClick}
    >
      <span className="ahc-shine" />
      <span className="ahc-corner ahc-tl" />
      <span className="ahc-corner ahc-br" />
      <span className="ahc-value"><Counter to={value} delay={180 + index * 50} /></span>
      <span className="ahc-label">{label}</span>
      {sub && <span className="ahc-sub">{sub}</span>}
    </button>
  );
}

// ── Status bar ────────────────────────────────────────────────

function StatusBar({ pending, dbStatus }) {
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const dbDotClass = dbStatus === 'error' ? 'ah-dot--error' : dbStatus === 'checking' ? 'ah-dot--warn' : 'ah-dot--ok';
  const dbLabel = dbStatus === 'error' ? 'Base de données injoignable' : dbStatus === 'checking' ? 'Base de données…' : 'Base de données';
  return (
    <div className="ah-status">
      <span className="ah-status-item"><span className="ah-dot ah-dot--ok" />Système opérationnel</span>
      <span className="ah-status-item"><span className={`ah-dot ${dbDotClass}`} />{dbLabel}</span>
      {pending > 0 && (
        <span className="ah-status-item">
          <span className="ah-dot ah-dot--warn" />
          {pending} activation{pending > 1 ? 's' : ''} en attente
        </span>
      )}
      <span className="ah-status-date">{date}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function AdminHomePanel({ onNavigate }) {
  const admin = useAdminStore();
  const n = (key) => asArray(admin[key]).length;
  const characters = useCharacterStore((s) => asArray(s.characters));

  const [playerAccounts, setPlayerAccounts] = useState([]);
  const [dbStatus, setDbStatus] = useState('checking');
  useEffect(() => {
    supabase.from('profiles').select('disabled')
      .then(({ data, error }) => {
        setDbStatus(error ? 'error' : 'ok');
        setPlayerAccounts(data || []);
      })
      .catch(() => setDbStatus('error'));
  }, []);
  const active = playerAccounts.filter((a) => !a.disabled).length;

  const GROUPS = [
    {
      key: 'identites', label: 'Origines & Identités',
      cards: [
        { label: 'Races',        value: n('customRaces'),        sub: 'créées', nav: 'races' },
        { label: 'Ascendances',  value: n('customAscendances'),  sub: 'créées', nav: 'ascendances' },
        { label: 'Origines',     value: n('customOrigins'),      sub: 'créées', nav: 'origines' },
        { label: 'Historiques',  value: n('customHistoriques'),  sub: 'créés',  nav: 'historiques' },
        { label: 'Provenances',  value: n('customProvenances'),  sub: 'créées', nav: 'provenances' },
      ],
    },
    {
      key: 'references', label: 'Références & Savoirs',
      cards: [
        { label: 'Connaissances', value: n('customKnowledge'),  sub: 'créées', nav: 'connaissances' },
        { label: 'Aptitudes',     value: n('customAptitudes'),  sub: 'créées', nav: 'aptitudes' },
        { label: 'Langues',       value: n('customLanguages'),  sub: 'créées', nav: 'langues' },
      ],
    },
    {
      key: 'gameplay', label: 'Gameplay',
      cards: [
        { label: 'Caractéristiques', value: n('customCaracteristiques'), sub: 'créées', nav: 'caracteristiques' },
        { label: 'Index',            value: n('gameplayIndex'),          sub: 'créées', nav: 'index' },
        { label: 'Leveling',         value: n('customLevelRules'),       sub: 'paliers', nav: 'leveling' },
        { label: 'Archétypes',       value: n('customArchetypes'),       sub: 'créés',  nav: 'archetypes' },
        { label: 'Classes',          value: n('customClasses'),          sub: 'créées', nav: 'classes' },
        { label: 'Sous-classes',     value: n('customSubclasses'),       sub: 'créées', nav: 'sous-classes' },
        { label: 'Compétences',      value: n('customCompetences'),      sub: 'créées', nav: 'competences' },
        { label: 'Résistances',      value: n('customResistanceEntries'), sub: 'créées', nav: 'resistances' },
        { label: 'Maîtrise',         value: n('customMaitriseEntries'),  sub: 'créées', nav: 'maitrise' },
        { label: 'États',            value: n('customEtats'),            sub: 'créés',  nav: 'etats' },
      ],
    },
    {
      key: 'grimoire', label: 'Grimoire',
      cards: [
        { label: 'Rangs',            value: n('customSpellRanks'),   sub: 'créés', nav: 'grimoire-rangs' },
        { label: 'Types',            value: n('customSpellTypes'),   sub: 'créés', nav: 'grimoire-types' },
        { label: 'Zones',            value: n('customSpellZones'),   sub: 'créées', nav: 'grimoire-zones' },
        { label: "Types d'action",   value: n('customActionTypes'),  sub: 'créés', nav: 'grimoire-actions' },
        { label: 'Spécialités',      value: n('customSpecialites'),  sub: 'créées', nav: 'grimoire-specialites' },
      ],
    },
    {
      key: 'items', label: 'Économie & Équipement',
      cards: [
        { label: "Catégories d'objet", value: n('customItemCategories'), sub: 'créées', nav: 'item-categorie' },
        { label: 'Classes',            value: n('customItemClasses'),    sub: 'créées', nav: 'item-classe' },
        { label: 'Raretés',            value: n('customItemRarities'),   sub: 'créées', nav: 'item-rarete' },
        { label: 'Items',              value: n('customItems'),          sub: 'créés',  nav: 'item' },
      ],
    },
    {
      key: 'joueurs', label: 'Joueurs',
      cards: [
        { label: 'Comptes',      value: playerAccounts.length,                     sub: `${active} actifs`,                      nav: 'joueurs' },
        { label: 'Personnages',  value: characters.length,                          sub: 'fiches créées',                         nav: 'createur-fiche' },
      ],
    },
  ];

  let cardIndex = 0;

  return (
    <div className="admin-home-v2">
      <ParticleCanvas />

      <div className="ah-inner">
        <StatusBar pending={0} dbStatus={dbStatus} />

        <header className="ah-hero">
          <p className="ah-kicker">Panneau Maître du Jeu</p>
          <h1 className="ah-title">
            <span data-text="Gestion du Donjon">Gestion du Donjon</span>
          </h1>
          <p className="ah-desc">Vue d'ensemble de la base de données du monde d'Eindhill.</p>
        </header>

        <div className="ah-groups">
          {GROUPS.map((group) => (
            <section key={group.key} className="ah-group">
              <div className="ah-group-hd">
                <span className="ah-group-line" />
                <h3 className="ah-group-title">{group.label}</h3>
                <span className="ah-group-line ah-group-line--r" />
              </div>
              <div className="ah-grid">
                {group.cards.map((card) => {
                  const i = cardIndex++;
                  return (
                    <Card
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      sub={card.sub}
                      index={i}
                      onClick={card.nav ? () => onNavigate(card.nav) : undefined}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
