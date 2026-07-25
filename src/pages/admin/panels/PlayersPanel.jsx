import { useEffect, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { supabase } from '../../../lib/supabaseClient';
import { ConfirmModal } from '../AdminShared';
import { MODERATOR_PERMISSIONS, getRoleDefinitions } from '../../../auth/permissions';
import { sendAccountActivation } from '../../../services/mailerService';

const BLANK_PLAYER = {
  username: '',
  displayName: '',
  email: '',
  role: 'player',
  permissions: {},
  password: '',
  confirmPassword: '',
};

const PLAYER_PASSWORD_RULES = [
  { key: 'length', label: '16 caractères minimum', test: (value) => value.length >= 16 },
  { key: 'upper', label: 'Au moins une majuscule', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'Au moins une minuscule', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'Au moins un chiffre', test: (value) => /\d/.test(value) },
  { key: 'special', label: 'Au moins un caractère spécial', test: (value) => /[^A-Za-z0-9\s]/.test(value) },
  { key: 'space', label: 'Aucun espace', test: (value) => value.length > 0 && !/\s/.test(value) },
];

const evaluatePassword = (password, confirmPassword, username = '') => {
  const rules = PLAYER_PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));
  const usernameRule = {
    key: 'username',
    label: "Ne contient pas l'identifiant",
    ok: !username || !password.toLowerCase().includes(username.toLowerCase()),
  };
  const matchRule = {
    key: 'match',
    label: 'Confirmation identique',
    ok: password.length > 0 && password === confirmPassword,
  };
  return [...rules, usernameRule, matchRule];
};

const generateSecurePassword = (length = 20) => {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*+-_=?.',
  ];
  const all = groups.join('');
  const randomIndex = (max) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };
  const chars = groups.map((group) => group[randomIndex(group.length)]);
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

const getRoleLabel = (roles, key) => roles.find((role) => role.key === key)?.label || 'Joueur';

// ── Player card ───────────────────────────────────────────────

function PlayerCard({ account, roleLabel, onEdit, onDelete, onToggleDisabled }) {
  const name   = account.display_name || account.username;
  const showAt = account.display_name && account.display_name !== account.username;
  const date   = account.created_at
    ? new Date(account.created_at).toLocaleDateString('fr-FR')
    : null;

  const statusClass = account.disabled ? 'is-suspended' : 'is-active';
  const statusLabel = account.disabled ? 'Suspendu' : 'Actif';

  return (
    <div className={`player-card${account.disabled ? ' is-suspended' : ''}`}>
      <div className="player-card-head">
        <div className="player-card-id">
          <span className="player-card-name">{name}</span>
          {showAt && <span className="player-card-at">@{account.username}</span>}
        </div>
        <span className="player-card-role">{roleLabel}</span>
      </div>

      <div className="player-card-body">
        <span className="player-card-email">{account.email || '—'}</span>
        <span className={`player-card-status ${statusClass}`}>
          <span className="player-card-dot" />
          {statusLabel}
        </span>
      </div>

      <div className="player-card-foot">
        <span className="player-card-foot-meta">{date}</span>
        <div className="player-card-foot-actions">
          <button className="player-card-btn player-card-btn--unlock" onClick={onToggleDisabled}>
            {account.disabled ? 'Débloquer' : 'Suspendre'}
          </button>
          <button className="player-card-btn" onClick={onEdit}>Modifier</button>
          <button className="player-card-btn player-card-btn--del" onClick={onDelete}>✕</button>
        </div>
      </div>
    </div>
  );
}

export default function PlayersPanel() {
  const { customRoles, systemRoleOverrides } = useAdminStore();
  const roleDefinitions = getRoleDefinitions(customRoles, systemRoleOverrides);

  const [accounts, setAccounts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_PLAYER);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, role_key, permissions, disabled, created_at')
      .order('created_at', { ascending: true });
    if (error) setLoadError(error.message);
    else { setLoadError(''); setAccounts(data || []); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const username = form.username.trim();
  const usernameExists = accounts.some((account) =>
    account.id !== editingPlayer?.id && account.username.toLowerCase() === username.toLowerCase()
  );
  const checks = evaluatePassword(form.password, form.confirmPassword, username);
  const passwordOk = checks.every((check) => check.ok);
  const emailValue = form.email.trim();
  const emailOk = emailValue.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const canSave = username.length >= 3
    && !usernameExists
    && emailOk
    && (editingPlayer || passwordOk)
    && !saving;

  const resetForm = () => {
    setForm(BLANK_PLAYER);
    setEditingPlayer(null);
    setCopied(false);
    setSaving(false);
    setFormError('');
    setShowPwd(false);
    setShowConfirmPwd(false);
  };

  const closeForm = () => { resetForm(); setShowForm(false); };

  const generatePassword = () => {
    const nextPassword = generateSecurePassword();
    setForm((current) => ({ ...current, password: nextPassword, confirmPassword: nextPassword }));
    setCopied(false);
  };

  const editPlayer = (account) => {
    setEditingPlayer(account);
    setForm({
      username: account.username || '',
      displayName: account.display_name || '',
      email: account.email || '',
      role: account.role_key || 'player',
      permissions: account.permissions || {},
      password: '',
      confirmPassword: '',
    });
    setCopied(false);
    setShowForm(true);
  };

  const copyPassword = async () => {
    if (!form.password || !navigator.clipboard) return;
    await navigator.clipboard.writeText(form.password);
    setCopied(true);
  };

  const savePlayer = async () => {
    if (!canSave) return;
    setSaving(true);
    setFormError('');

    if (editingPlayer) {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: form.displayName.trim() || username,
          role_key: form.role,
          permissions: form.permissions || {},
        })
        .eq('id', editingPlayer.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
      await loadAccounts();
      closeForm();
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('manage-player', {
      body: {
        action: 'create',
        email: emailValue,
        password: form.password,
        username,
        displayName: form.displayName.trim() || username,
        role: form.role,
        permissions: form.permissions || {},
        redirectTo: `${window.location.origin}/login`,
      },
      headers: sessionData?.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined,
    });
    if (error || data?.error) {
      setFormError(data?.error || error.message || "Échec de la création du compte.");
      setSaving(false);
      return;
    }
    if (data?.confirmationUrl) {
      sendAccountActivation({ to: emailValue, username, activationUrl: data.confirmationUrl }).catch(() => {});
    }
    await loadAccounts();
    closeForm();
  };

  const requestDelete = (account) => {
    setConfirmDelete({
      title: 'Supprimer le joueur',
      message: `Supprimer le compte "${account.username}" ?`,
      onConfirm: async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        await supabase.functions.invoke('manage-player', {
          body: { action: 'delete', userId: account.id },
          headers: sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : undefined,
        });
        await loadAccounts();
      },
    });
  };

  const toggleDisabled = async (account) => {
    await supabase.from('profiles').update({ disabled: !account.disabled }).eq('id', account.id);
    await loadAccounts();
  };

  return (
    <div className="admin-panel players-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={() => { resetForm(); setShowForm(true); }}>
          + Nouveau joueur
        </button>
      </div>

      {loadError && <p className="comp-empty">Erreur de chargement : {loadError}</p>}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel="Supprimer"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingPlayer ? 'Modifier le joueur' : 'Nouveau joueur'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Identifiant *</label>
                  <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="ex: thomas" />
                  {usernameExists && <span className="player-field-error">Identifiant déjà utilisé.</span>}
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom affiché</label>
                  <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="ex: Thomas" />
                </div>
              </div>

              <div className="comp-form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="ex: thomas@exemple.com"
                  disabled={Boolean(editingPlayer)}
                />
                {!editingPlayer && emailValue.length > 0 && !emailOk && (
                  <span className="player-field-error">Adresse email invalide.</span>
                )}
                {editingPlayer && <span className="race-form-hint">L'email de connexion ne se change pas ici.</span>}
              </div>

              <div className="comp-form-field">
                <label>Rang</label>
                <div className="account-role-grid">
                  {roleDefinitions.map((role) => (
                    <button
                      key={role.key}
                      className={`account-role-btn${form.role === role.key ? ' active' : ''}`}
                      onClick={() => setForm((current) => ({ ...current, role: role.key, permissions: role.absolute ? {} : (role.permissions || current.permissions || {}) }))}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {!roleDefinitions.find((role) => role.key === form.role)?.absolute && form.role !== 'player' && (
                <div className="moderator-permissions">
                  <span className="builder-soon-kicker">Droits du rôle</span>
                  <div className="moderator-permission-grid">
                    {MODERATOR_PERMISSIONS.map((permission) => (
                      <label key={permission.key} className="moderator-permission">
                        <input
                          type="checkbox"
                          checked={Boolean(form.permissions?.[permission.key])}
                          onChange={(e) => setForm((current) => ({
                            ...current,
                            permissions: { ...current.permissions, [permission.key]: e.target.checked },
                          }))}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!editingPlayer && (
                <>
                  <div className="player-password-tools">
                    <button className="admin-btn admin-btn--add" onClick={generatePassword}>Générer un mot de passe</button>
                    <button className="admin-btn" onClick={copyPassword} disabled={!form.password}>
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>

                  <div className="comp-form-row">
                    <div className="comp-form-field comp-form-field--grow">
                      <label>Mot de passe *</label>
                      <div className="password-input-wrap">
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => { set('password', e.target.value); setCopied(false); }}
                          placeholder="16 caractères minimum"
                        />
                        <button type="button" className="password-eye-btn" onClick={() => setShowPwd((v) => !v)}>
                          {showPwd ? 'Cacher' : 'Voir'}
                        </button>
                      </div>
                    </div>
                    <div className="comp-form-field comp-form-field--grow">
                      <label>Confirmer *</label>
                      <div className="password-input-wrap">
                        <input
                          type={showConfirmPwd ? 'text' : 'password'}
                          value={form.confirmPassword}
                          onChange={(e) => set('confirmPassword', e.target.value)}
                          placeholder="Répéter le mot de passe"
                        />
                        <button type="button" className="password-eye-btn" onClick={() => setShowConfirmPwd((v) => !v)}>
                          {showConfirmPwd ? 'Cacher' : 'Voir'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="password-check-grid">
                    {checks.map((check) => (
                      <div key={check.key} className={`password-check${check.ok ? ' is-ok' : ''}`}>
                        <span>{check.ok ? '✓' : '×'}</span>
                        {check.label}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {formError && <div className="player-field-error player-field-error--block">{formError}</div>}

            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={closeForm}>Annuler</button>
              <button className="race-form-save-btn" onClick={savePlayer} disabled={!canSave}>
                {saving ? 'Enregistrement...' : editingPlayer ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="player-grid">
        {accounts.map((account) => (
          <PlayerCard
            key={account.id}
            account={account}
            roleLabel={getRoleLabel(roleDefinitions, account.role_key)}
            onEdit={() => editPlayer(account)}
            onDelete={() => requestDelete(account)}
            onToggleDisabled={() => toggleDisabled(account)}
          />
        ))}
      </div>
    </div>
  );
}
