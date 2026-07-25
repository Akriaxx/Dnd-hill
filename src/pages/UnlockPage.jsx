import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sendUnlockCode } from '../services/mailerService';
import logo from '../assets/logo/logo-eindhill.png';

export default function UnlockPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const token = params.get('token');

  const [step, setStep] = useState('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (!token) { setStep('invalid'); return; }

    supabase.rpc('request_unlock_code', { p_token: token }).then(({ data, error: rpcError }) => {
      const result = data?.[0];
      if (rpcError || !result?.email) { setStep('invalid'); return; }
      sendUnlockCode({ to: result.email, username: result.username || result.email, code: result.code }).catch(() => {});
      setStep('code');
    });
  }, [token]);

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || confirming) return;
    setConfirming(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('confirm_unlock_code', { p_token: token, p_code: code });
    if (rpcError || !data) {
      setError('Code incorrect ou expiré. Vérifiez votre boîte mail.');
      setConfirming(false);
      return;
    }
    setStep('success');
  };

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

        {step === 'code' && (
          <form onSubmit={submitCode}>
            <p className="login-reset-desc">
              Un code à 6 chiffres a été envoyé à votre adresse email. Saisissez-le pour débloquer votre compte.
            </p>
            <div className="form-group">
              <label htmlFor="unlock-code">Code de déblocage</label>
              <input
                id="unlock-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className="verify-code-input"
                autoComplete="one-time-code"
                autoFocus
              />
              {error && <p className="form-error">{error}</p>}
            </div>
            <button className="btn-primary" type="submit" disabled={code.length !== 6 || confirming}>
              {confirming ? 'Vérification...' : 'Débloquer mon compte'}
            </button>
          </form>
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
