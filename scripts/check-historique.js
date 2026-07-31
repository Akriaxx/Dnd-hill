// Diagnostic — colle le résultat qui s'affiche dans la console ici.
(() => {
  const { customHistoriques } = window.adminStore.getState();
  console.log(JSON.stringify(customHistoriques.map((h) => ({ nom: h.nom, amelioration: h.amelioration, aptitudes: h.aptitudes })), null, 2));
})();
