import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const APP_URL     = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

// ── Base template — calquée sur la login page ─────────────────

const BASE = (body) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans+SC:wght@700;900&family=Bebas+Neue&family=Sen:wght@400;700&display=swap" rel="stylesheet"/>
  <title>Eindhill</title>
</head>
<body style="margin:0;padding:0;background:#0e0d0a;font-family:'Sen',Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" role="presentation"
          style="width:480px;max-width:100%;background:#1a1608;border:1px solid #3a2e18;border-radius:3px;overflow:hidden;">

          <!-- En-tête : logo + Eindhill + ✦ + FICHE DE PERSONNAGES -->
          <tr>
            <td style="padding:40px 36px 32px;text-align:center;">
              <img src="${APP_URL}/logo-eindhill-transparent.png" alt="Eindhill"
                style="display:block;margin:0 auto 16px;height:100px;width:auto;"
                onerror="this.style.display='none'" />
              <h1 style="margin:0 0 10px;font-family:'Alegreya Sans SC',Georgia,serif;
                font-size:28px;font-weight:900;color:#f0ead8;letter-spacing:3px;
                text-align:center;line-height:1;">
                Eindhill
              </h1>
              <table width="220" cellpadding="0" cellspacing="0" role="presentation"
                style="margin:0 auto 8px;">
                <tr>
                  <td style="border-bottom:1px solid rgba(200,168,74,0.4);"></td>
                  <td style="padding:0 10px;color:rgba(200,168,74,0.6);font-size:13px;
                    line-height:1;white-space:nowrap;">✦</td>
                  <td style="border-bottom:1px solid rgba(200,168,74,0.4);"></td>
                </tr>
              </table>
              <p style="margin:0;font-family:'Bebas Neue','Arial Narrow',sans-serif;
                font-size:12px;letter-spacing:5px;color:rgba(200,168,74,0.65);
                text-transform:uppercase;">
                Fiche de Personnages
              </p>
            </td>
          </tr>

          <!-- Séparateur -->
          <tr><td style="height:1px;background:#2a2318;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Corps -->
          <tr>
            <td style="padding:36px 36px 40px;">
              ${body}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Helpers — même style que les éléments de la login page ────

// Titre de section (style label form)
const label = (text) =>
  `<p style="margin:0 0 6px;font-family:'Bebas Neue','Arial Narrow',sans-serif;
    font-size:12px;letter-spacing:3px;color:#8a7a5a;text-transform:uppercase;">${text}</p>`;

// Texte courant
const p = (text) =>
  `<p style="margin:0 0 20px;font-family:'Sen',Georgia,serif;font-size:14px;
    line-height:1.65;color:#e0d4b8;">${text}</p>`;

// Bloc de code (code 6 ou 18 chiffres)
const codeBlock = (code) =>
  `<div style="margin:24px 0;padding:11px 14px;background:rgba(255,255,255,0.04);
    border:1px solid #2a2318;border-radius:2px;text-align:center;">
    <span style="font-family:'Courier New',Courier,monospace;font-size:24px;
      letter-spacing:6px;color:#c8a84a;font-weight:bold;">${code}</span>
  </div>`;

// Bouton — identique au .btn-primary de la login page
const linkBtn = (url, btnLabel) =>
  `<div style="margin:28px 0 0;">
    <a href="${url}"
      style="display:block;padding:11px 14px;
        background:rgba(200,168,74,0.12);
        border:1px solid #c8a84a;border-radius:2px;
        color:#c8a84a;text-decoration:none;text-align:center;
        font-family:'Bebas Neue','Arial Narrow',sans-serif;
        font-size:12px;letter-spacing:3px;text-transform:uppercase;">
      ${btnLabel}
    </a>
  </div>`;

// Note discrète en bas
const dim = (text) =>
  `<p style="margin:20px 0 0;font-family:'Bebas Neue','Arial Narrow',sans-serif;
    font-size:10px;letter-spacing:2px;color:rgba(200,168,74,0.3);
    text-transform:uppercase;line-height:1.5;">${text}</p>`;

// ── Send ───────────────────────────────────────────────────────

const send = ({ to, subject, html }) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.group('%c[Mailer — dev mode]', 'color:#c8a84a;font-weight:bold;');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html);
    console.groupEnd();
    return Promise.resolve();
  }
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { to_email: to, subject, html_content: html },
    { publicKey: PUBLIC_KEY },
  );
};

// ── Exports ────────────────────────────────────────────────────

export const sendVerificationCode = ({ to, code }) =>
  send({
    to,
    subject: 'Code de vérification — Eindhill',
    html: BASE(
      label('Vérification d\'identité') +
      p('Vous avez demandé la création d\'un nouveau rôle. Saisissez le code ci-dessous dans la fenêtre ouverte dans votre navigateur.') +
      codeBlock(code) +
      dim('Ce code est valable pour cette session uniquement. Ne le partagez avec personne.')
    ),
  });

export const sendAccountActivation = ({ to, username, activationUrl }) =>
  send({
    to,
    subject: 'Activation de votre compte — Eindhill',
    html: BASE(
      label(`Bienvenue, ${username}.`) +
      p('Un compte vous a été créé sur Eindhill. Cliquez sur le bouton ci-dessous pour activer votre accès.') +
      linkBtn(activationUrl, 'Activer mon compte') +
      dim('Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email.')
    ),
  });

export const sendPasswordResetLink = ({ to, username, resetUrl }) =>
  send({
    to,
    subject: 'Réinitialisation de mot de passe — Eindhill',
    html: BASE(
      label(`Bonjour, ${username}.`) +
      p('Une demande de réinitialisation de mot de passe a été reçue pour votre compte. Cliquez sur le bouton ci-dessous pour continuer.') +
      linkBtn(resetUrl, 'Réinitialiser mon mot de passe') +
      dim('Ce lien expire dans 15 minutes. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.')
    ),
  });

export const sendPasswordResetCode = ({ to, username, code }) =>
  send({
    to,
    subject: 'Code de confirmation — Eindhill',
    html: BASE(
      label(`Confirmation, ${username}.`) +
      p('Saisissez le code ci-dessous pour confirmer la réinitialisation de votre mot de passe.') +
      codeBlock(code) +
      dim('Ce code expire dans 10 minutes. Ne le partagez avec personne.')
    ),
  });

export const sendAccountSuspended = ({ to, username, unlockUrl }) =>
  send({
    to,
    subject: 'Compte suspendu — Eindhill',
    html: BASE(
      label(`Alerte de sécurité, ${username}.`) +
      p('Trois tentatives de connexion incorrectes ont été détectées sur votre compte. Par mesure de sécurité, l\'accès a été temporairement suspendu.') +
      p('Si c\'était vous, cliquez sur le bouton ci-dessous pour débloquer votre compte.') +
      linkBtn(unlockUrl, 'Débloquer mon compte') +
      dim('Si vous n\'êtes pas à l\'origine de ces tentatives, ignorez cet email et contactez votre Maître du Jeu.')
    ),
  });

export const sendUnlockCode = ({ to, username, code }) =>
  send({
    to,
    subject: 'Code de déblocage — Eindhill',
    html: BASE(
      label(`Déblocage du compte, ${username}.`) +
      p('Saisissez le code ci-dessous pour confirmer le déblocage de votre compte.') +
      codeBlock(code) +
      dim('Ce code expire dans 15 minutes. Ne le partagez avec personne.')
    ),
  });
