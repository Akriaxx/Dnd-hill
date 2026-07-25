import { useAdminStore } from '../../../store/adminStore';
import { asArray } from '../adminUtils';

export default function TerminalPanel() {
  const { terminalLogs, clearTerminalLogs } = useAdminStore();
  const logs = asArray(terminalLogs);

  return (
    <div className="admin-panel">
      <div className="admin-panel-create-row">
        <button className="admin-btn admin-btn--danger" onClick={clearTerminalLogs} disabled={logs.length === 0}>Vider le terminal</button>
      </div>
      <div className="admin-terminal">
        {logs.length === 0 ? (
          <div className="admin-terminal-empty">Aucune erreur capturée.</div>
        ) : logs.map((log) => (
          <div key={log.id} className={`admin-terminal-line admin-terminal-line--${log.level}`}>
            <span>{log.createdAt ? new Date(log.createdAt).toLocaleTimeString('fr-FR') : '--:--:--'}</span>
            <strong>{log.source}</strong>
            <p>{log.message}</p>
            {log.stack && <pre>{log.stack}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}
