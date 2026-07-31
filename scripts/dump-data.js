// À usage unique — télécharge un instantané de tes données admin (races,
// ascendances, origines, historiques, aptitudes, résistances) pour audit.
(() => {
  const s = window.adminStore.getState();
  const keys = [
    'customRaces', 'customAscendances', 'customOrigins', 'customHistoriques',
    'customProvenances', 'customAptitudes', 'customAptitudeCategories',
    'customResistanceEntries', 'customResistanceCategories',
    'customClasses', 'customSubclasses',
  ];
  const dump = Object.fromEntries(keys.map((k) => [k, s[k] || []]));
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dndhill-admin-dump.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  console.log('Téléchargement lancé : dndhill-admin-dump.json');
})();
