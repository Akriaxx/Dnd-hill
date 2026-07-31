// À usage unique — attribue des bonus d'aptitude thématiques aux 13
// origines (texte "amelioration" + liste structurée, comme les historiques).
(() => {
  const { customOrigins, customAptitudes, updateOrigin } = window.adminStore.getState();

  function apt(nom, value = 1) {
    const found = customAptitudes.find((a) => a.nom === nom);
    if (!found) { console.warn('Aptitude introuvable, ignorée:', nom); return null; }
    return { key: found.key, nom: found.nom, categoryKey: found.categoryKey, stat: found.stat || '', value };
  }
  const compact = (list) => list.filter(Boolean);

  const originByNom = Object.fromEntries(customOrigins.map((o) => [o.nom, o]));

  const updates = {
    'Habitant des Rivages': { amelioration: 'Ajoute +2 en Natation et +1 en Pêche', aptitudes: [apt('Natation', 2), apt('Pêche', 1)] },
    'Citadin': { amelioration: 'Ajoute +2 en Marchandage et +1 en Discrétion', aptitudes: [apt('Marchandage', 2), apt('Discrétion', 1)] },
    'Nanti': { amelioration: 'Ajoute +2 en Persuasion et +1 en Représentation', aptitudes: [apt('Persuasion', 2), apt('Représentation', 1)] },
    'Campagnard': { amelioration: 'Ajoute +2 en Nature et +1 en Dressage', aptitudes: [apt('Nature', 2), apt('Dressage', 1)] },
    'Mendiant': { amelioration: 'Ajoute +2 en Discrétion et +1 en Escamotage', aptitudes: [apt('Discrétion', 2), apt('Escamotage', 1)] },
    'Nomade': { amelioration: 'Ajoute +2 en Survie et +1 en Équitation', aptitudes: [apt('Survie', 2), apt('Équitation', 1)] },
    'Peuple Primitif': { amelioration: 'Ajoute +2 en Athlétisme et +1 en Survie', aptitudes: [apt('Athlétisme', 2), apt('Survie', 1)] },
    'Hommes des Clans': { amelioration: 'Ajoute +2 en Intimidation et +1 en Artisanat', aptitudes: [apt('Intimidation', 2), apt('Artisanat', 1)] },
    'Forestier': { amelioration: 'Ajoute +2 en Nature et +1 en Perception visuelle', aptitudes: [apt('Nature', 2), apt('Perception visuelle', 1)] },
    'Montagnard': { amelioration: 'Ajoute +2 en Escalade et +1 en Athlétisme', aptitudes: [apt('Escalade', 2), apt('Athlétisme', 1)] },
    'Survivant des Lymbes': { amelioration: 'Ajoute +2 en Perception magique et +1 en Survie', aptitudes: [apt('Perception magique', 2), apt('Survie', 1)] },
    'Né de Pantropeira': { amelioration: 'Ajoute +2 en Ingénierie et +1 en Investigation', aptitudes: [apt('Ingénierie', 2), apt('Investigation', 1)] },
    'Errant des Déserts': { amelioration: 'Ajoute +2 en Survie et +1 en Perception visuelle', aptitudes: [apt('Survie', 2), apt('Perception visuelle', 1)] },
  };

  let count = 0;
  Object.entries(updates).forEach(([nom, { amelioration, aptitudes }]) => {
    const origin = originByNom[nom];
    if (!origin) { console.warn('Origine introuvable, ignorée:', nom); return; }
    updateOrigin(origin.id, { amelioration, aptitudes: compact(aptitudes) });
    count += 1;
  });

  console.log(`${count} origines mises à jour.`);
  setTimeout(() => { console.log('Sauvegardé, rechargement...'); location.reload(); }, 1500);
})();
