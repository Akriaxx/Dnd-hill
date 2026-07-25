import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/logo/logo-eindhill.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLeaving || isChecking) return;
    setError('');
    setIsChecking(true);
    const result = await login(username, password);
    if (result === true) {
      setIsLeaving(true);
      timerRef.current = setTimeout(() => navigate('/loading'), 520);
    } else if (result === 'pending') {
      setError('Compte en attente — validez le lien envoyé par email pour activer votre accès.');
      setIsChecking(false);
    } else if (result === 'wrong-password') {
      setError('Mauvais mot de passe.');
      setIsChecking(false);
    } else if (result === 'suspended') {
      setError('Compte suspendu suite à plusieurs tentatives — un email de déblocage vous a été envoyé.');
      setIsChecking(false);
    } else {
      setError('Identifiants invalides.');
      setIsChecking(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSending(true);
    const id = resetIdentifier.trim();
    let email = id;
    if (!id.includes('@')) {
      const { data: lookup } = await supabase
        .from('login_lookup')
        .select('email')
        .eq('username', id)
        .maybeSingle();
      if (!lookup?.email) {
        setResetError('Aucun compte associé à cet identifiant ou email.');
        setResetSending(false);
        return;
      }
      email = lookup.email;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) {
      setResetError(error.message);
      setResetSending(false);
      return;
    }
    setResetDone(true);
    setResetSending(false);
  };

  return (
    <div className={`login-page${isLeaving ? ' is-leaving' : ''}`}>
      <div className="login-box">
        <img src={logo} alt="Eindhill" className="login-logo" />
        <h2 className="login-title">Eindhill</h2>
        <div className="header-deco" style={{ margin: '8px auto 4px' }}><span>✦</span></div>
        <p className="login-sub">Fiche de Personnages</p>

        {!resetMode ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Identifiant</label>
              <input
                id="username"
                type="text"
                placeholder="Votre nom d'aventurier"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="btn-primary" type="submit" disabled={!username || !password || isLeaving || isChecking}>
              {isChecking ? 'Vérification...' : 'Entrer dans le Donjon'}
            </button>

            <button
              type="button"
              className="login-reset-link"
              onClick={() => { setResetMode(true); setError(''); }}
            >
              Mot de passe oublié ?
            </button>

          </form>
        ) : (
          <form onSubmit={handleReset}>
            {!resetDone ? (
              <>
                <p className="login-reset-desc">
                  Saisissez votre identifiant ou votre adresse email. Un lien de réinitialisation vous sera envoyé.
                </p>
                <div className="form-group">
                  <label htmlFor="reset-id">Identifiant ou email</label>
                  <input
                    id="reset-id"
                    type="text"
                    placeholder="ex: thomas ou thomas@exemple.com"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                {resetError && <p className="form-error">{resetError}</p>}
                <button className="btn-primary" type="submit" disabled={!resetIdentifier.trim() || resetSending}>
                  {resetSending ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </>
            ) : (
              <p className="login-reset-desc login-reset-desc--ok">
                Lien envoyé. Vérifiez votre boîte mail et suivez les instructions.
              </p>
            )}
            <button
              type="button"
              className="login-reset-link"
              onClick={() => { setResetMode(false); setResetDone(false); setResetIdentifier(''); setResetError(''); }}
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
