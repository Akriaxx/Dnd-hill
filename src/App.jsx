import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useCharacterStore } from './store/characterStore';
import { isDevServerNoise, useAdminStore, hydrateGameData } from './store/adminStore';
import { canAccessAdmin } from './auth/permissions';
import LoginPage from './pages/LoginPage';
import LoaderPage from './pages/LoaderPage';
import CharacterListPage from './pages/CharacterListPage';
import CharacterSheetPage from './pages/CharacterSheetPage';
import CombatActivationOverlay from './components/combat/CombatActivationOverlay';
import AdminPage from './pages/AdminPage';
import ResetPage from './pages/ResetPage';
import UnlockPage from './pages/UnlockPage';

function RequireAuth({ children }) {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  const customRoles = useAdminStore((s) => s.customRoles || []);
  const systemRoleOverrides = useAdminStore((s) => s.systemRoleOverrides || {});
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdmin(user, customRoles, systemRoleOverrides)) return <Navigate to="/" replace />;
  return children;
}

function CharacterDataBridge() {
  const userId = useAuthStore((s) => s.user?.id);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const fetchPendingCharacterCreations = useCharacterStore((s) => s.fetchPendingCharacterCreations);

  useEffect(() => {
    if (!userId) return;
    fetchCharacters();
    fetchPendingCharacterCreations();
    hydrateGameData();
  }, [userId, fetchCharacters, fetchPendingCharacterCreations]);

  return null;
}

function ErrorTicketBridge() {
  useEffect(() => {
    const report = ({ title, message, stack, source }) => {
      const store = useAdminStore.getState();
      store.addTerminalLog({ level: 'error', message, stack, source });
      if (isDevServerNoise({ title, description: message, stack, source })) return;
      store.addAppTicket({
        title,
        description: message,
        severity: 'error',
        source,
        stack,
      });
    };

    const onError = (event) => {
      report({
        title: 'Erreur runtime',
        message: event.message || String(event.error || 'Erreur inconnue'),
        stack: event.error?.stack || '',
        source: `${event.filename || 'window'}:${event.lineno || 0}`,
      });
    };

    const onUnhandledRejection = (event) => {
      const reason = event.reason;
      report({
        title: 'Promesse rejetée',
        message: reason?.message || String(reason || 'Promesse rejetée'),
        stack: reason?.stack || '',
        source: 'unhandledrejection',
      });
    };

    const stringifyArg = (arg) => {
      if (typeof arg === 'string') return arg;
      if (arg?.message) return arg.message;
      try { return JSON.stringify(arg); } catch { return String(arg); }
    };

    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);
      const message = args.map(stringifyArg).join(' ');
      report({
        title: 'Console error',
        message,
        stack: args.find((arg) => arg?.stack)?.stack || '',
        source: 'console.error',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      console.error = originalError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorTicketBridge />
      <CharacterDataBridge />
      <CombatActivationOverlay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route path="/unlock" element={<UnlockPage />} />
        <Route
          path="/loading"
          element={
            <RequireAuth>
              <LoaderPage />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <CharacterListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/character/:id"
          element={
            <RequireAuth>
              <CharacterSheetPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
