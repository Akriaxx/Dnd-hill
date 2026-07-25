import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminStore } from '../../store/adminStore';
import { useCharacterStore } from '../../store/characterStore';
import { STAT_KEYS, modifier, signed } from '../../domain/characterCalculations';

const POOL_CFG = [
  { key: 'vie',  label: 'Vie',       color: '#c84a4a' },
  { key: 'mana', label: 'Mana',      color: '#4a7ac8' },
  { key: 'endu', label: 'Endurance', color: '#4ac87a' },
];

function CaracTooltip({ carac, rect }) {
  const prefersLeft = rect.right + 260 > window.innerWidth;
  const top = Math.round(rect.top + rect.height / 2);
  const left = prefersLeft ? rect.left : rect.right;
  const side = prefersLeft ? 'left' : 'right';

  return createPortal(
    <div
      className={`creation-info-floating-tooltip creation-info-floating-tooltip--${side}`}
      style={{
        top,
        left,
        '--info-option-color': 'var(--gold)',
        width: 240,
        opacity: 1,
        animation: 'none',
        transform: `translate(${side === 'left' ? '-100%' : '12px'}, -50%)`,
      }}
    >
      <strong>{carac.nom}</strong>
      {carac.description && (
        <>
          <span className="creation-info-tooltip-sep" />
          <span className="creation-info-tooltip-desc">{carac.description}</span>
        </>
      )}
    </div>,
    document.body,
  );
}

export default function StatsTab({ char }) {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const customCaracteristiques = useAdminStore((s) => s.customCaracteristiques || []);
  const [tooltip, setTooltip] = useState(null);

  const caracs = [...customCaracteristiques].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const setPool = (poolKey, field, value) => {
    const n = Math.max(0, Number(value));
    updateCharacter(char.id, { [poolKey]: { ...char[poolKey], [field]: n } });
  };

  return (
    <>
      {tooltip && <CaracTooltip carac={tooltip.carac} rect={tooltip.rect} />}

      {/* Resource pools editor */}
      <section>
        <h2 className="section-heading">Ressources</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {POOL_CFG.map(({ key, label, color }) => (
            <div key={key} style={{ background: '#1a1608', border: '1px solid #3a2e18', borderRadius: 3, padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-caps)', fontSize: 10, letterSpacing: 3, color, marginBottom: 10 }}>{label}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                {[['actuel', 'Actuel'], ['max', 'Maximum']].map(([field, fieldLabel]) => (
                  <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                    <label>{fieldLabel}</label>
                    <input
                      type="number"
                      min={0}
                      value={char[key][field]}
                      onChange={(e) => setPool(key, field, e.target.value)}
                      style={{ width: 80 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="section-heading">Caractéristiques</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {caracs.map((carac) => {
            const val = char.stats?.[carac.cle] ?? 0;
            return (
              <div
                key={carac.cle}
                style={{
                  background: '#1a1608',
                  border: '1px solid #3a2e18',
                  borderRadius: 3,
                  padding: '20px 12px',
                  textAlign: 'center',
                  cursor: 'help',
                }}
                onMouseEnter={(e) => setTooltip({ carac, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className="stat-val" style={{ fontSize: 36 }}>{val}</div>
                <div className="stat-key" style={{ fontSize: 12, marginTop: 4 }}>{carac.cle}</div>
                <div style={{ fontFamily: 'var(--font-caps)', fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {carac.nom !== carac.cle ? carac.nom : ''}
                </div>
                <div style={{
                  fontFamily: 'var(--font-caps)',
                  fontSize: 16,
                  color: 'var(--gold)',
                  marginTop: 6,
                  letterSpacing: 1,
                }}>
                  {signed(modifier(val, carac.pointsParModificateur ?? 2))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
