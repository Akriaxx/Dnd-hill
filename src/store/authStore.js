import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { sendAccountSuspended } from '../services/mailerService';
import { useAudioStore } from './audioStore';

const resolveEmail = async (identifier) => {
  if (identifier.includes('@')) return identifier;
  // Fonction plutôt que la vue login_lookup (supprimée — voir
  // docs/supabase/012_login_lookup_function.sql) : même contournement RLS
  // nécessaire pour un visiteur non connecté, mais surface étroite (un
  // pseudo précis en entrée, pas de liste énumérable en sortie).
  const { data: email } = await supabase.rpc('get_login_email', { p_username: identifier });
  return email || null;
};

const profileToUser = (authUser, profile) => ({
  id: authUser.id,
  username: profile?.username || authUser.email,
  name: profile?.display_name || profile?.username || authUser.email,
  role: profile?.role_key || 'player',
  permissions: profile?.permissions || {},
  source: 'supabase',
});

const fetchProfile = async (userId) => {
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, role_key, permissions, disabled')
    .eq('id', userId)
    .maybeSingle();
  return data;
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,

      login: async (identifier, password) => {
        const cleanIdentifier = identifier.trim();

        // Le login se fait par identifiant, Supabase Auth attend un email —
        // on résout l'un vers l'autre via resolveEmail (RPC get_login_email).
        const email = await resolveEmail(cleanIdentifier);
        if (!email) return false;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = error.message.toLowerCase();
          if (message.includes('email not confirmed')) return 'pending';
          if (message.includes('invalid login credentials')) {
            // 3 échecs -> compte suspendu + lien de déblocage envoyé par mail
            // (voir docs/supabase/004_login_lockout.sql — RPC security
            // definer, appelable sans session puisqu'on n'est pas connecté).
            const { data: rows } = await supabase.rpc('register_failed_login', { p_email: email });
            const result = rows?.[0];
            if (result?.disabled) {
              if (result.unlock_token) {
                const unlockUrl = `${window.location.origin}/unlock?token=${result.unlock_token}`;
                sendAccountSuspended({ to: email, username: cleanIdentifier, unlockUrl }).catch(() => {});
              }
              return 'suspended';
            }
            return 'wrong-password';
          }
          return false;
        }

        const profile = await fetchProfile(data.user.id);
        if (profile?.disabled) {
          await supabase.auth.signOut();
          return 'suspended';
        }

        await supabase.rpc('reset_failed_login');
        set({ user: profileToUser(data.user, profile) });
        // Le clic sur "Se connecter" est le geste utilisateur qui débloque
        // l'autoplay avec son côté navigateur — la musique démarre en fondu
        // pour accompagner le chargement puis l'arrivée sur la fiche.
        useAudioStore.setState({ musicOn: true });
        return true;
      },

      logout: () => {
        supabase.auth.signOut();
        set({ user: null });
        useAudioStore.setState({ musicOn: false, ambientOn: false });
      },
    }),
    { name: 'rpg-auth' },
  ),
);

// Garde la session Supabase (restaurée automatiquement au chargement par le
// SDK) et le cache local `user` synchronisés — sans ça, un `user` mis en
// cache dont la session a expiré ailleurs laisserait croire à une connexion
// valide alors que toutes les requêtes RLS échoueraient silencieusement.
supabase.auth.onAuthStateChange(async (event, session) => {
  const currentUser = useAuthStore.getState().user;

  if (!session) {
    if (currentUser) {
      useAuthStore.setState({ user: null });
      useAudioStore.setState({ musicOn: false, ambientOn: false });
    }
    return;
  }

  const profile = await fetchProfile(session.user.id);
  useAuthStore.setState({ user: profileToUser(session.user, profile) });
});
