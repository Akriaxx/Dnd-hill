import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/logo/logo-eindhill.png';

export default function UnlockPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const [step, setStep] = useState('checking');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const token = params.get('token');
    if (!token) { setStep('invalid'); return; }

    supabase.rpc('unlock_with_token', { p_token: token }).then(({ data, error }) => {
      setStep(error || !data ? 'invalid' : 'success');
    });
  }, [params]);

  return (
    <div className="login-page">
      <div className="login-box">
        <img src={logo} alt="Eindhill" className="login-logo" />
        <h2 className="login-title">Eindhill</h2>
        <div className="header-deco" style={{ margin: '8px auto 4px' }}><span>✦</span></div>
        <p className="login-sub">Déblocage du compte</p>

        {step === 'checking' && (
          <p className="login-reset-desc">Vérification en cours…</p>
        )}

        {step === 'invalid' && (
          <>
            <p className="login-reset-desc" style={{ color: 'rgba(255,100,100,0.65)' }}>
              Ce lien est invalide ou a déjà été utilisé.
            </p>
            <button className="login-reset-link" onClick={() => navigate('/login')}>
              ← Retour à la connexion
            </button>
          </>
        )}

        {step === 'success' && (
          <>
            <p className="login-reset-desc login-reset-desc--ok">
              Compte débloqué. Vous pouvez maintenant vous connecter.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Se connecter
            </button>
          </>
        )}
      </div>
    </div>
  );
}
