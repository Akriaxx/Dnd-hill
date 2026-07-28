import { useState } from 'react';
import { AUDIO_CREDITS } from '../../data/audioCredits';

// Bouton fixe en bas à droite du site + popup listant les crédits audio
// (musique/bruitages Pixabay). Monté une seule fois au niveau App (voir
// App.jsx) pour rester visible sur toutes les pages.
export default function CreditsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="credits-btn" onClick={() => setOpen(true)}>
        Crédit
      </button>

      {open && (
        <div className="index-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="index-modal credits-modal" onClick={(e) => e.stopPropagation()}>
            <div className="index-modal-header">
              <h3>Crédits</h3>
              <button className="admin-btn" onClick={() => setOpen(false)}>✕ Fermer</button>
            </div>
            <div className="index-form">
              <p className="credits-intro">Musiques et bruitages utilisés sur le site.</p>
              <div className="credits-list">
                {AUDIO_CREDITS.map((credit) => (
                  <div key={credit.usage} className="credits-entry">
                    <span className="credits-usage">{credit.usage}</span>
                    <span className="credits-line">
                      Music by{' '}
                      <a href={credit.artistUrl} target="_blank" rel="noopener noreferrer">{credit.artist}</a>
                      {' '}from{' '}
                      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.sourceLabel}</a>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
