import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.scss';
import App from './App.jsx';
import { useAdminStore } from './store/adminStore';
import { useCharacterStore } from './store/characterStore';

// Exposition dev-only pour scripter la création de données de test (objets,
// classes, etc.) depuis la console du navigateur, dans la session déjà
// authentifiée du GM — jamais présent en build de prod (import.meta.env.DEV).
if (import.meta.env.DEV) {
  window.adminStore = useAdminStore;
  window.characterStore = useCharacterStore;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
