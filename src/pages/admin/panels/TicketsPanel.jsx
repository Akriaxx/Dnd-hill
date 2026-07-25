import { isDevServerNoise, useAdminStore } from '../../../store/adminStore';
import { asArray } from '../adminUtils';

export default function TicketsPanel() {
  const { appTickets, updateAppTicket, deleteAppTicket, clearAppTickets } = useAdminStore();
  const tickets = asArray(appTickets).filter((ticket) => !isDevServerNoise(ticket));

  return (
    <div className="admin-panel">
      {tickets.length === 0 ? (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">✓</div>
          <p className="admin-placeholder-title">Aucun ticket</p>
          <p className="admin-placeholder-sub">Les erreurs applicatives créeront automatiquement un ticket.</p>
        </div>
      ) : (
        <>
          <div className="admin-panel-create-row ticket-toolbar">
            <button className="admin-btn admin-btn--danger" onClick={clearAppTickets}>
              Supprimer tous les tickets
            </button>
          </div>
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className={`ticket-row${ticket.status === 'closed' ? ' is-closed' : ''}`}>
                <div className="ticket-row-status">
                  <span className={`ticket-status-dot ${ticket.status === 'closed' ? 'is-closed' : 'is-open'}`} />
                  <strong>{ticket.status === 'closed' ? 'Résolu' : 'Ouvert'}</strong>
                  {ticket.occurrences > 1 && <span className="ticket-occurrences">x{ticket.occurrences}</span>}
                </div>

                <div className="ticket-row-main">
                  <div className="ticket-row-head">
                    <h3>{ticket.title}</h3>
                    <span className="ticket-severity">{ticket.severity || 'error'}</span>
                  </div>
                  <div className="ticket-row-meta">
                    <span>{ticket.source || 'app'}</span>
                    <time>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('fr-FR') : '-'}</time>
                    {ticket.lastSeenAt && ticket.occurrences > 1 && (
                      <time>Dernière occurrence : {new Date(ticket.lastSeenAt).toLocaleTimeString('fr-FR')}</time>
                    )}
                  </div>
                  <p>{ticket.description || 'Aucune description.'}</p>
                  {ticket.stack && <pre className="ticket-stack">{ticket.stack}</pre>}
                </div>

                <div className="ticket-row-actions">
                  <button className="admin-btn" onClick={() => updateAppTicket(ticket.id, { status: ticket.status === 'closed' ? 'open' : 'closed' })}>
                    {ticket.status === 'closed' ? 'Réouvrir' : 'Résoudre'}
                  </button>
                  <button className="admin-btn admin-btn--danger" onClick={() => deleteAppTicket(ticket.id)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
