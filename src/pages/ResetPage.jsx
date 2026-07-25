import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/logo/logo-eindhill.png';

const PASSWORD_RULES = [
  { key: 'length',  label: '16 caractères minimum',        test: (v) => v.length >= 16 },
  { key: 'upper',   label: 'Au moins une majuscule',        test: (v) => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'Au moins une minuscule',        test: (v) => /[a-z]/.test(v) },
  { key: 'number',  label: 'Au moins un chiffre',           test: (v) => /\d/.test(v) },
  { key: 'special', label: 'Au moins un caractère spécial', test: (v) => /[^A-Za-z0-9\s]/.test(v) },
  { key: 'space',   label: 'Aucun espace',                  test: (v) => v.length > 0 && !/\s/.test(v) },
];

// Le lien envoyé par Supabase (resetPasswordForEmail) établit lui-même une
// session "recovery" en arrivant ici (détectée automatiquement par le SDK
// via le hash de l'URL) — pas besoin de revalider un token nous-mêmes.
export default function ResetPage() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState('loading');
  const [pwd,         setPwd]         = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');

  useEffect(() => {
    let settled = false;
    const settle = (hasSession) => {
      if (settled) return;
      settled = true;
      setStep(hasSession ? 'form' : 'invalid');
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') settle(true);
      else if (event === 'SIGNED_IN' && session) settle(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) settle(true);
    });

    const timer = setTimeout(() => settle(false), 4000);
    return () => { sub?.subscription?.unsubscribe(); clearTimeout(timer); };
  }, []);

  const checks  = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(pwd) }));
  const matchOk = pwd.length > 0 && pwd === confirm;
  const pwdOk   = checks.every((c) => c.ok) && matchOk;

  const submitPwd = async (e) => {
    e.preventDefault();
    if (!pwdOk || saving) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    await supabase.auth.signOut();
    setStep('success');
    setSaving(false);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <img src={logo} alt="Eindhill" className="login-logo" />
        <h2 className="login-title">Eindhill</h2>
        <div className="header-deco" style={{ margin: '8px auto 4px' }}><span>✦</span></div>
        <p className="login-sub">Réinitialisation du mot de passe</p>

        {step === 'loading' && (
          <p className="login-reset-desc">Vérification du lien…</p>
        )}

        {step === 'invalid' && (
          <>
            <p className="login-reset-desc" style={{ color: 'rgba(255,100,100,0.65)' }}>
              Ce lien est invalide ou a expiré. Faites une nouvelle demande depuis la page de connexion.
            </p>
            <button className="login-reset-link" onClick={() => navigate('/login')}>
              ← Retour à la connexion
            </button>
          </>
        )}

        {step === 'form' && (
          <form onSubmit={submitPwd}>
            <p className="login-reset-desc">Choisissez un nouveau mot de passe.</p>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="password-input-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="16 caractères minimum"
                  autoComplete="new-password"
                />
                <button type="button" className="password-eye-btn" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? 'Cacher' : 'Voir'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirmer</label>
              <div className="password-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répéter le mot de passe"
                  autoComplete="new-password"
                />
                <button type="button" className="password-eye-btn" onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? 'Cacher' : 'Voir'}
                </button>
              </div>
            </div>

            <div className="password-check-grid" style={{ marginBottom: 20 }}>
              {[...checks, { key: 'match', label: 'Confirmation identique', ok: matchOk }].map((c) => (
                <div key={c.key} className={`password-check${c.ok ? ' is-ok' : ''}`}>
                  <span>{c.ok ? '✓' : '×'}</span>{c.label}
                </div>
              ))}
            </div>

            {saveError && <p className="form-error">{saveError}</p>}

            <button className="btn-primary" type="submit" disabled={!pwdOk || saving}>
              {saving ? 'Mise à jour...' : 'Valider'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <>
            <p className="login-reset-desc login-reset-desc--ok">
              Mot de passe mis à jour. Vous pouvez maintenant vous connecter.
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
