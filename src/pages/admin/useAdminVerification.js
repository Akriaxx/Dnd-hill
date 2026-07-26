import { useState } from 'react';
import { sendVerificationCode } from '../../services/mailerService';

const generateCode = (length = 18) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b % 10).join('');
};

// Gate les actions sensibles de l'admin (créer/modifier/supprimer un
// rôle ou un compte) derrière un code à 18 chiffres envoyé par email —
// une session laissée ouverte ou une action déclenchée par erreur ne
// suffit plus à elle seule à modifier des droits ou des comptes.
export function useAdminVerification() {
  const [verified, setVerified] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySending, setVerifySending] = useState(false);

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

  return {
    verified,
    verifyOpen,
    verifyCode,
    verifyError,
    verifySending,
    setVerifyCode,
    setVerifyOpen,
    startVerification,
    submitVerification,
  };
}
