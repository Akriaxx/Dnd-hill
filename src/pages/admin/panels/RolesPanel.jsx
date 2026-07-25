import { useEffect, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { supabase } from '../../../lib/supabaseClient';
import { ConfirmModal } from '../AdminShared';
import { slugifyKey } from '../adminUtils';
import { MODERATOR_PERMISSIONS, getRoleDefinitions } from '../../../auth/permissions';
import { sendVerificationCode } from '../../../services/mailerService';

const generateCode = (length = 18) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b % 10).join('');
};

const BLANK_ROLE = { label: '', permissions: {} };

export default function RolesPanel() {
  const {
    customRoles,
    systemRoleOverrides,
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    updateSystemRoleOverride,
    resetSystemRoleOverride,
  } = useAdminStore();
  const roles = getRoleDefinitions(customRoles, systemRoleOverrides);
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    supabase.from('profiles').select('id, role_key').then(({ data }) => setAccounts(data || []));
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(BLANK_ROLE);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verified, setVerified] = useState(false);

  const startVerification = async () => {
    const code = generateCode(18);
    setExpectedCode(code);
    setVerifyCode('');
    setVerifyError('');
    setVerifyOpen(true);
    setVerifySending(true);
    try {
      // TODO: récupérer l'email du compte connecté depuis le contexte auth
      const adminEmail = 'lorkkya@gmail.com';
      await sendVerificationCode({ to: adminEmail, code });
    } catch {
      setVerifyError("Impossible d'envoyer le code. Vérifiez la configuration du mailer.");
    } finally {
      setVerifySending(false);
    }
  };

  const submitVerification = () => {
    if (verifyCode !== expectedCode) {
      setVerifyError('Code incorrect. Vérifiez votre boîte mail.');
      return;
    }
    setVerified(true);
    setVerifyOpen(false);
    setExpectedCode('');
    setVerifyCode('');
    setVerifyError('');
  };

  const startCreate = () => { setEditingRole(null); setForm(BLANK_ROLE); setFormError(''); setShowForm(true); };

  const startEdit = (role) => {
    setEditingRole(role);
    setForm({ label: role.label || '', permissions: role.permissions || {} });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setEditingRole(null); setForm(BLANK_ROLE); setFormError(''); setShowForm(false); };

  const saveRole = () => {
    const label = form.label.trim();
    if (!label) return;
    const key = editingRole?.key || slugifyKey(label);
    const exists = roles.some((role) => role.key === key && role.key !== editingRole?.key);
    if (exists) { setFormError('Un rôle avec ce nom existe déjà.'); return; }
    const payload = { key, label, permissions: form.permissions || {} };
    if (editingRole?.system) updateSystemRoleOverride(editingRole.key, payload);
    else if (editingRole?.custom) updateCustomRole(editingRole.id, payload);
    else addCustomRole(payload);
    closeForm();
  };

  const requestDelete = (role) => {
    if (role.system) {
      setConfirmDelete({
        title: 'Réinitialiser le rôle système',
        message: `Réinitialiser "${role.label}" à ses droits d'origine ? Un rôle système ne peut pas être supprimé.`,
        onConfirm: () => resetSystemRoleOverride(role.key),
        dangerLabel: 'Réinitialiser',
      });
      return;
    }
    const count = accounts.filter((account) => account.role_key === role.key).length;
    setConfirmDelete({
      title: 'Supprimer le rôle',
      message: count > 0
        ? `Supprimer "${role.label}" ? ${count} compte(s) repasseront en Joueur.`
        : `Supprimer "${role.label}" ?`,
      onConfirm: async () => {
        if (count > 0) {
          await supabase.from('profiles').update({ role_key: 'player' }).eq('role_key', role.key);
        }
        deleteCustomRole(role.id);
      },
    });
  };

  return (
    <div className="admin-panel">
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel={confirmDelete.dangerLabel || 'Supprimer'}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}

      {showForm && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>{editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <div className="comp-form-row">
                <div className="comp-form-field comp-form-field--grow">
                  <label>Nom du rôle</label>
                  <input value={form.label} onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))} placeholder="Ex: Assistant MJ" />
                </div>
              </div>
              {formError && <div className="player-field-error">{formError}</div>}
              <div className="moderator-permissions">
                <span className="builder-soon-kicker">Droits liés</span>
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
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={closeForm}>Annuler</button>
              <button className="race-form-save-btn" onClick={saveRole} disabled={!form.label.trim()}>
                {editingRole ? 'Enregistrer' : 'Créer le rôle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyOpen && (
        <div className="index-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setVerifyOpen(false)}>
          <div className="index-modal">
            <div className="index-modal-header">
              <h3>Procédure de vérification</h3>
              <button className="admin-btn" onClick={() => setVerifyOpen(false)}>✕ Fermer</button>
            </div>
            <div className="index-form">
              {verifySending ? (
                <p className="verify-sending-msg">Envoi du code en cours…</p>
              ) : (
                <p className="verify-sending-msg">
                  Un code à 18 chiffres a été envoyé à l'adresse associée à votre compte. Saisissez-le ci-dessous.
                </p>
              )}
              <div className="comp-form-field">
                <label>Code de vérification</label>
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 18))}
                  placeholder="18 chiffres"
                  className="verify-code-input"
                  disabled={verifySending}
                />
                {verifyError && <span className="player-field-error">{verifyError}</span>}
              </div>
            </div>
            <div className="comp-form-footer">
              <button className="admin-btn" onClick={() => setVerifyOpen(false)}>Annuler</button>
              <button
                className="race-form-save-btn"
                onClick={submitVerification}
                disabled={verifyCode.length < 18 || verifySending}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-panel-actions">
        <button className="admin-btn" onClick={startVerification}>
          {verified ? '✓ Vérifié' : 'Procédure de vérification'}
        </button>
        <button className="admin-btn admin-btn--add" onClick={startCreate} disabled={!verified}>
          + Nouveau rôle
        </button>
      </div>

      <div className="role-list">
        {roles.map((role) => {
          const assignedCount = accounts.filter((account) => account.role_key === role.key).length;
          const permissions = MODERATOR_PERMISSIONS.filter((permission) => role.permissions?.[permission.key]);
          return (
            <article key={role.key} className={`role-row${role.system ? ' is-system' : ''}`}>
              <div className="role-row-main">
                <span className="builder-soon-kicker">{role.system ? 'Rôle système' : 'Rôle personnalisé'}</span>
                <h3>{role.label}</h3>
                <p>{assignedCount} compte(s) associé(s)</p>
              </div>
              <div className="role-permission-chips">
                {permissions.length > 0 ? permissions.map((permission) => (
                  <span key={permission.key} className="perm-chip perm-chip--on">{permission.label}</span>
                )) : (
                  <span className="perm-chip">Aucun droit</span>
                )}
              </div>
              <div className="role-row-actions">
                <button className="admin-btn" onClick={() => startEdit(role)}>Modifier</button>
                <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(role)}>Supprimer</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
