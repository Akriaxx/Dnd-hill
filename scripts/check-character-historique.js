// Diagnostic — ouvre la fiche du personnage concerné avant de lancer ça,
// colle le résultat qui s'affiche dans la console ici.
(() => {
  const { customHistoriques, customOrigins, customAptitudes } = window.adminStore.getState();
  const characters = window.characterStore.getState().characters;
  const aptitudeNoms = new Set(customAptitudes.map((a) => a.nom));

  console.log(characters.map((c) => ({
    nom: c.nom,
    historique_du_perso: JSON.stringify(c.historique),
    historique_existe_dans_admin: customHistoriques.some((h) => h.nom === c.historique),
    origine_du_perso: JSON.stringify(c.origine),
    origine_existe_dans_admin: customOrigins.some((o) => o.nom === c.origine),
  })));

  console.log('Aptitudes actuellement dans l\'admin:', [...aptitudeNoms].join(', '));
})();
