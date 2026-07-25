import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../store/characterStore';

export default function CharacterCard({ character }) {
  const navigate = useNavigate();
  const setActive = useCharacterStore((s) => s.setActive);

  const { name, class: cls, race, level, hp, stats, competences, isBoss } = character;

  const handleClick = () => {
    setActive(character.id);
    navigate(`/character/${character.id}`);
  };

  return (
    <div
      className={`card${isBoss ? ' boss-card' : ''}`}
      onClick={handleClick}
    >
      <div className="card-header">
        <div>
          <div className="card-name">
            {name}
            {isBoss && <span className="boss-badge">BOSS</span>}
          </div>
          <div className="card-meta">
            {cls} · {race} · Niv. {level}
          </div>
        </div>
        <div className="pdv-badge">
          <span className="pdv-num">{hp.current}</span>
          <span className="pdv-label">PV</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stats-line">
          {['FOR', 'DEX', 'CON', 'INT'].map((k) => (
            <div className="stat" key={k}>
              <div className="stat-val">{stats[k]}</div>
              <div className="stat-key">{k}</div>
            </div>
          ))}
        </div>
        <div className="stats-line line2">
          {['SAG', 'CHA'].map((k) => (
            <div className="stat" key={k}>
              <div className="stat-val">{stats[k]}</div>
              <div className="stat-key">{k}</div>
            </div>
          ))}
          <div className="stat">
            <div className="stat-val">{hp.max}</div>
            <div className="stat-key">PV MAX</div>
          </div>
        </div>
      </div>

      {competences.length > 0 && (
        <div className="competences">
          {competences.slice(0, 3).map((c, i) => (
            <div className="comp" key={i}>
              <span className="comp-name">{c.name}</span>
              <span className="comp-desc">{c.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
