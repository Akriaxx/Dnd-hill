import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo/logo-eindhill.png';

export default function Header({ title = 'Eindhill', subtitle = 'Fiche de Personnages' }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="site-header">
      {user && (
        <div className="user-bar">
          <span className="user-name">{user.name}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      )}

      <p className="header-sup">⚔ RPG CHARACTER MANAGER ⚔</p>
      <img src={logo} alt="Eindhill" className="header-logo" />
      <h1>
        {title}
        <span>{subtitle}</span>
      </h1>
      <div className="header-deco">
        <span>✦</span>
      </div>
    </header>
  );
}
