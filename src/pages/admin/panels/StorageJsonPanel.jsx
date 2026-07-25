import { useRef, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal } from '../AdminShared';

export default function StorageJsonPanel() {
  const exportGameDataSnapshot = useAdminStore((state) => state.exportGameDataSnapshot);
  const importGameDataSnapshot = useAdminStore((state) => state.importGameDataSnapshot);
  const purgeLocalGameData = useAdminStore((state) => state.purgeLocalGameData);
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const countSnapshotRows = (snapshot) => Object.values(snapshot?.data || snapshot || {})
    .reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const downloadSnapshot = () => {
    const snapshot = exportGameDataSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eindhill-game-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Export JSON prêt : ${countSnapshotRows(snapshot)} entrée(s) sauvegardée(s).`);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.schema && parsed.schema !== 'eindhill-game-data-json') {
        setStatus('Import refusé : ce fichier JSON ne correspond pas au format Eindhill.');
        return;
      }
      setPendingImport({
        fileName: file.name,
        snapshot: parsed,
        count: countSnapshotRows(parsed),
      });
    } catch {
      setStatus('Import impossible : le fichier JSON est invalide.');
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    importGameDataSnapshot(pendingImport.snapshot);
    setStatus(`Import terminé : ${pendingImport.count} entrée(s) restaurée(s). Les comptes utilisateurs n'ont pas été touchés.`);
    setPendingImport(null);
  };

  const confirmPurgeGameData = () => {
    purgeLocalGameData();
    setStatus("Données gameplay purgées. Les comptes, rôles, tickets et le terminal sont conservés.");
    setConfirmPurge(false);
  };

  return (
    <div className="admin-panel storage-panel">
      <div className="storage-card">
        <div className="storage-card-main">
          <span className="builder-soon-kicker">Snapshot local</span>
          <h3>Stockage JSON temporaire</h3>
          <p>
            Exporte et restaure les données de game design dans un fichier JSON local.
            Les comptes utilisateurs, rôles, tickets et logs ne sont pas inclus.
          </p>
        </div>
        <div className="storage-actions">
          <button className="admin-btn admin-btn--add" onClick={downloadSnapshot}>Exporter JSON</button>
          <button className="admin-btn" onClick={() => fileInputRef.current?.click()}>Importer JSON</button>
          <button className="admin-btn admin-btn--danger" onClick={() => setConfirmPurge(true)}>Purger gameplay</button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="storage-file-input"
        onChange={handleImportFile}
      />

      {status && <div className="storage-status">{status}</div>}

      <div className="storage-note">
        <strong>Important</strong>
        <p>
          Ce JSON est une sauvegarde manuelle côté navigateur. Sur Vercel, l'application ne peut pas écrire durablement dans un fichier serveur.
          Pour une modification multi-utilisateurs fiable, on basculera ensuite vers Supabase.
        </p>
      </div>

      {pendingImport && (
        <ConfirmModal
          title="Importer un snapshot JSON"
          message={`Importer "${pendingImport.fileName}" et remplacer les données gameplay locales par ${pendingImport.count} entrée(s) ? Les comptes utilisateurs seront conservés.`}
          dangerLabel="Importer"
          onCancel={() => setPendingImport(null)}
          onConfirm={confirmImport}
        />
      )}

      {confirmPurge && (
        <ConfirmModal
          title="Purger les données gameplay"
          message="Supprimer toutes les données gameplay locales ? Les comptes utilisateurs, rôles, tickets et logs seront conservés."
          dangerLabel="Purger"
          onCancel={() => setConfirmPurge(false)}
          onConfirm={confirmPurgeGameData}
        />
      )}
    </div>
  );
}
