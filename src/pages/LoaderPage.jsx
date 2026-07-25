import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo-eindhill-transparent.png';

const DURATION_MS = 3500 + Math.random() * 1500;
const COMPLETE_HOLD_MS = 900;
const EXIT_MS = 1100;
const PULSE_MS = 2200;

export default function LoaderPage() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading');
  const navigate = useNavigate();
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const completedRef = useRef(false);

  useEffect(() => {
    timersRef.current = [];
    completedRef.current = false;
    startRef.current = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startRef.current) / DURATION_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!completedRef.current) {
        completedRef.current = true;
        setPhase('complete');
        const elapsed = now - startRef.current;
        const pulseRemainder = PULSE_MS - (elapsed % PULSE_MS);
        const settleDelay = pulseRemainder < 180 ? pulseRemainder + PULSE_MS : pulseRemainder;
        timersRef.current.push(
          setTimeout(() => setPhase('settled'), settleDelay),
          setTimeout(() => setPhase('leaving'), settleDelay + COMPLETE_HOLD_MS),
          setTimeout(
            () => navigate('/', { replace: true }),
            settleDelay + COMPLETE_HOLD_MS + EXIT_MS,
          ),
        );
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, [navigate]);

  const pct = Math.round(progress * 100);
  const loaderClass = [
    'loader-page',
    phase !== 'loading' ? 'is-complete' : '',
    phase === 'settled' || phase === 'leaving' ? 'is-settled' : '',
    phase === 'leaving' ? 'is-leaving' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={loaderClass} style={{ '--loader-progress': progress }}>

      <div className="loader-scene">
        <div className="loader-glow-ring" />
        <div
          className="loader-logo-shell"
          aria-label={`Chargement ${pct}%`}
        >
          <img src={logo} alt="" className="loader-logo loader-logo-base" />
          <div className="loader-logo-fill" aria-hidden="true">
            <img src={logo} alt="" className="loader-logo" />
            <span className="loader-fill-line" />
          </div>
        </div>
      </div>

      <p className="loader-text" key={phase === 'loading' ? 'loading' : 'complete'}>
        {phase === 'loading' ? 'Chargement en cours' : 'Chargement terminé'}
      </p>

      <div className="loader-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className="loader-dot" style={{ animationDelay: `${i * 0.28}s` }} />
        ))}
      </div>
    </div>
  );
}
