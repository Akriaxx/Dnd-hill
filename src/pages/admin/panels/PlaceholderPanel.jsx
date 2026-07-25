export default function PlaceholderPanel({ section }) {
  return (
    <div className="admin-placeholder">
      <div className="admin-placeholder-icon">⚙</div>
      <p className="admin-placeholder-title">{section}</p>
      <p className="admin-placeholder-sub">En cours d'intégration.</p>
    </div>
  );
}
