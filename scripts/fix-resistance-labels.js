// À usage unique — les noms de résistances contiennent le nom de la
// catégorie en préfixe ("Armes-Contondant" au lieu de "Contondant"), la clé
// (déjà "armes-contondant" via slugifyKey) est correcte et n'est pas
// touchée. Ne modifie que les entrées dont le label commence par
// "{catégorie}-", pour ne rien casser sur les entrées déjà propres.
(() => {
  const { customResistanceCategories, customResistanceEntries, updateResistanceEntry } = window.adminStore.getState();

  let fixed = 0;
  let skipped = 0;
  customResistanceEntries.forEach((entry) => {
    const category = customResistanceCategories.find((c) => c.key === entry.categoryKey);
    if (!category || !entry.label) { skipped += 1; return; }
    const prefix = `${category.label}-`;
    if (!entry.label.toLowerCase().startsWith(prefix.toLowerCase())) { skipped += 1; return; }
    const cleanedLabel = entry.label.slice(prefix.length).trim();
    if (!cleanedLabel) { skipped += 1; return; }
    updateResistanceEntry(entry.id, { label: cleanedLabel });
    fixed += 1;
  });

  console.log(`${fixed} nom(s) de résistance nettoyé(s), ${skipped} inchangé(s).`);
  setTimeout(() => { console.log('Sauvegardé, rechargement...'); location.reload(); }, 1500);
})();
