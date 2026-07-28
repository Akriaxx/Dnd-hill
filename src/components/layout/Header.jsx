import { useNavigate } from 'react-router-dom';
import { Music2, Wind } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAudioStore } from '../../store/audioStore';
import logo from '../../assets/logo/logo-eindhill.png';

export default function Header({ title = 'Eindhill', subtitle = 'Fiche de Personnages' }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const musicOn = useAudioStore((s) => s.musicOn);
  const ambientOn = useAudioStore((s) => s.ambientOn);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const toggleMusic = useAudioStore((s) => s.toggleMusic);
  const toggleAmbient = useAudioStore((s) => s.toggleAmbient);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="site-header">
      <div className="header-audio-controls">
        <div className="header-audio-row">
          <button
            type="button"
            className={`header-audio-btn${musicOn ? ' is-active' : ''}`}
            onClick={toggleMusic}
            title={musicOn ? 'Couper la musique' : 'Activer la musique'}
            aria-pressed={musicOn}
          >
            <Music2 size={16} strokeWidth={2} />
          </button>
          <input
            type="range"
            className="header-audio-volume"
            min={0}
            max={100}
            value={Math.round(musicVolume * 100)}
            onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
            title="Volume de la musique"
            aria-label="Volume de la musique"
          />
        </div>
        <div className="header-audio-row">
          <button
            type="button"
            className={`header-audio-btn${ambientOn ? ' is-active' : ''}`}
            onClick={toggleAmbient}
            title={ambientOn ? "Couper les bruits d'ambiance" : "Activer les bruits d'ambiance"}
            aria-pressed={ambientOn}
          >
            <Wind size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

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
