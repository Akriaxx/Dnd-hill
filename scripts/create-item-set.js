// À usage unique — crée un nouveau jeu de catégories d'objets + une
// cinquantaine d'items avec effets (équipement passif, consommables actifs,
// gadgets actif/passif). Idempotent : relancer le script ne recrée pas les
// entrées déjà présentes (dédoublonnage par nom).
//
// Usage : coller ce fichier dans la console du navigateur, sur l'app en DEV,
// connecté en session GM (window.adminStore doit exister — voir main.jsx).
(() => {
  const { getState } = window.adminStore;
  const { addItemRarity, addItemCategory, addItem } = getState();

  // ---------------------------------------------------------------------
  // Raretés
  // ---------------------------------------------------------------------
  const RARITIES = [
    { nom: 'Commune', couleur: '#9aa0a6', description: 'Objet répandu, sans particularité notable.' },
    { nom: 'Rare', couleur: '#4a90d9', description: 'Objet de bonne facture, peu commun.' },
    { nom: 'Épique', couleur: '#a64ad9', description: 'Objet puissant, convoité par les aventuriers chevronnés.' },
    { nom: 'Légendaire', couleur: '#e0b23b', description: "Objet d'exception, chargé d'histoire et de puissance." },
  ];

  const rarityIdByNom = {};
  RARITIES.forEach(({ nom, couleur, description }) => {
    const existing = getState().customItemRarities.find((r) => r.nom === nom);
    if (existing) { rarityIdByNom[nom] = existing.id; return; }
    addItemRarity({ nom, couleur, description });
    const created = getState().customItemRarities.filter((r) => r.nom === nom).pop();
    rarityIdByNom[nom] = created.id;
  });

  // ---------------------------------------------------------------------
  // Catégories (racines + sous-catégories)
  // ---------------------------------------------------------------------
  const CATEGORY_TREE = [
    { nom: 'Armes', couleur: '#b23b3b', icone: 'sword', description: 'Armes de mêlée et à distance.', children: ['Armes de mêlée', 'Armes à distance'] },
    { nom: 'Armures', couleur: '#5b7a9d', icone: 'shield', description: "Pièces d'armure, du cuir souple à la plaque lourde.", children: ['Armure légère', 'Armure lourde'] },
    { nom: 'Bijoux', couleur: '#c8a84a', icone: 'gem', description: 'Anneaux, colliers et autres parures enchantées.' },
    { nom: 'Consommables', couleur: '#4a9d6a', icone: 'flask', description: 'Potions, fioles et parchemins à usage unique.' },
    { nom: 'Gadgets', couleur: '#7a4a9d', icone: 'zap', description: 'Dispositifs équipables, actifs ou passifs.' },
    { nom: 'Sacs & Reliques', couleur: '#9d7a4a', icone: 'backpack', description: 'Contenants et objets reliques.' },
  ];

  const ensureCategory = (nom, description, couleur, icone, parentId) => {
    const existing = getState().customItemCategories.find((c) => c.nom === nom && (c.parentId || null) === (parentId || null));
    if (existing) return existing.id;
    addItemCategory({ nom, description, couleur, icone, parentId: parentId || null });
    return getState().customItemCategories.filter((c) => c.nom === nom && (c.parentId || null) === (parentId || null)).pop().id;
  };

  const categoryIdByPath = {};
  CATEGORY_TREE.forEach(({ nom, description, couleur, icone, children = [] }) => {
    const rootId = ensureCategory(nom, description, couleur, icone, null);
    categoryIdByPath[nom] = rootId;
    children.forEach((childNom) => {
      const childId = ensureCategory(childNom, '', couleur, icone, rootId);
      categoryIdByPath[childNom] = childId;
    });
  });

  // ---------------------------------------------------------------------
  // Effets : petit helper qui remplit toutes les clés simple/stats à 0 puis
  // applique les overrides (voir itemUtils.createBlankItemEffects).
  // ---------------------------------------------------------------------
  const eff = (simple = {}, stats = {}) => ({
    simple: {
      vitalite: 0, mana: 0, endurance: 0, attaquePhysique: 0, attaqueMagique: 0, attaqueDistance: 0,
      resistanceMagique: 0, resistancePhysique: 0, esquive: 0, initiative: 0, deplacement: 0, emplacements: 0,
      ...simple,
    },
    stats: { FOR: 0, DEX: 0, CON: 0, INT: 0, SAG: 0, CHA: 0, ...stats },
    aptitudes: [],
    resistances: [],
  });
  const NO_EFFECT = eff();

  // ---------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------
  const ITEMS = [
    // -- Armes de mêlée --------------------------------------------------
    {
      nom: 'Épée courte du milicien', categoryPath: 'Armes de mêlée', rarete: 'Commune', icone: 'sword',
      description: "Une lame simple mais bien équilibrée, standard des gardes de ville.",
      equipable: true, equipSlot: 'arme', effects: eff({ attaquePhysique: 2 }, { FOR: 1 }),
    },
    {
      nom: "Hache d'abordage", categoryPath: 'Armes de mêlée', rarete: 'Commune', icone: 'axe',
      description: 'Lourde et brutale, taillée pour trancher cordages et chair.',
      equipable: true, equipSlot: 'arme', effects: eff({ attaquePhysique: 3 }),
    },
    {
      nom: 'Marteau de guerre bicéphale', categoryPath: 'Armes de mêlée', rarete: 'Rare', icone: 'hammer',
      description: 'Une masse à deux têtes qui exige une poigne solide, mais fracasse armures et boucliers.',
      equipable: true, equipSlot: 'arme', deuxMains: true, effects: eff({ attaquePhysique: 5 }, { FOR: 2 }),
    },
    {
      nom: 'Dague sertie de venin noir', categoryPath: 'Armes de mêlée', rarete: 'Rare', icone: 'swords',
      description: "Sa lame huilée d'un poison lent favorise les frappes rapides et précises.",
      equipable: true, equipSlot: 'arme', effects: eff({ attaquePhysique: 2, esquive: 1 }, { DEX: 2 }),
    },
    {
      nom: 'Lame-brisure des Abysses', categoryPath: 'Armes de mêlée', rarete: 'Légendaire', icone: 'sword',
      description: "Forgée dans un métal venu d'ailleurs, elle vibre d'une énergie hostile à la magie.",
      equipable: true, equipSlot: 'arme', deuxMains: true, effects: eff({ attaquePhysique: 7, resistanceMagique: 2 }, { FOR: 2 }),
    },

    // -- Armes à distance -------------------------------------------------
    {
      nom: "Arc long en bois d'if", categoryPath: 'Armes à distance', rarete: 'Commune', icone: 'bow',
      description: 'Un arc souple et silencieux, apprécié des rôdeurs.',
      equipable: true, equipSlot: 'armeDistance', effects: eff({ attaqueDistance: 3 }, { DEX: 1 }),
    },
    {
      nom: 'Arbalète renforcée', categoryPath: 'Armes à distance', rarete: 'Rare', icone: 'target',
      description: 'Puissante mais encombrante — son mécanisme de rechargement ralentit son porteur.',
      equipable: true, equipSlot: 'armeDistance', effects: eff({ attaqueDistance: 5, deplacement: -1 }),
    },
    {
      nom: 'Fronde du chasseur', categoryPath: 'Armes à distance', rarete: 'Épique', icone: 'target',
      description: 'Taillée dans une corne de bête traquée pendant des lunes ; elle ne rate jamais deux fois.',
      equipable: true, equipSlot: 'armeDistance', effects: eff({ attaqueDistance: 3, esquive: 2 }, { DEX: 1 }),
    },

    // -- Armure légère -----------------------------------------------------
    {
      nom: 'Veste de cuir cloutée', categoryPath: 'Armure légère', rarete: 'Commune', icone: 'shirt',
      description: 'Souple et discrète, elle encaisse les coups sans gêner les mouvements.',
      equipable: true, equipSlot: 'torse', effects: eff({ resistancePhysique: 2 }),
    },
    {
      nom: 'Bottes furtives', categoryPath: 'Armure légère', rarete: 'Commune', icone: 'boots',
      description: 'Semelles feutrées qui étouffent le bruit des pas.',
      equipable: true, equipSlot: 'bottes', effects: eff({ esquive: 2, initiative: 1 }),
    },
    {
      nom: "Capuche d'ombre", categoryPath: 'Armure légère', rarete: 'Rare', icone: 'helmet',
      description: 'Son tissage sombre trouble le regard et repousse les auras hostiles.',
      equipable: true, equipSlot: 'casque', effects: eff({ esquive: 1, resistanceMagique: 1 }, { DEX: 1 }),
    },

    // -- Armure lourde -----------------------------------------------------
    {
      nom: 'Plastron de fer', categoryPath: 'Armure lourde', rarete: 'Commune', icone: 'shirt',
      description: 'Une masse de métal brut qui protège au prix de la vivacité.',
      equipable: true, equipSlot: 'torse', effects: eff({ resistancePhysique: 4, deplacement: -1 }),
    },
    {
      nom: 'Heaume du rempart', categoryPath: 'Armure lourde', rarete: 'Rare', icone: 'helmet',
      description: 'Porté par les gardes des remparts assiégés, il a arrêté plus de coups qu\'aucune chronique ne le rapporte.',
      equipable: true, equipSlot: 'casque', effects: eff({ resistancePhysique: 2, vitalite: 5, deplacement: -1 }),
    },
    {
      nom: 'Gantelets du forgeron-titan', categoryPath: 'Armure lourde', rarete: 'Épique', icone: 'anvil',
      description: "Coulés dans l'alliage des forges naines, ils frappent presque aussi fort qu'ils protègent.",
      equipable: true, equipSlot: 'gants', effects: eff({ resistancePhysique: 3 }, { FOR: 2 }),
    },

    // -- Bijoux --------------------------------------------------------------
    {
      nom: 'Anneau de vitalité ancienne', categoryPath: 'Bijoux', rarete: 'Commune', icone: 'ring',
      description: "Une bague simple, gravée d'un sceau de vie oublié.",
      equipable: true, equipSlot: 'bijou', effects: eff({ vitalite: 5 }),
    },
    {
      nom: 'Collier du sang-froid', categoryPath: 'Bijoux', rarete: 'Rare', icone: 'necklace',
      description: 'Son pendentif reste glacé au toucher et apaise les esprits échauffés.',
      equipable: true, equipSlot: 'bijou', effects: eff({ resistanceMagique: 2 }, { CHA: 1 }),
    },
    {
      nom: "Gemme d'esprit clairvoyant", categoryPath: 'Bijoux', rarete: 'Épique', icone: 'gem',
      description: 'Une pierre facettée qui amplifie la réserve magique et affûte le raisonnement.',
      equipable: true, equipSlot: 'bijou', effects: eff({ mana: 5 }, { INT: 2 }),
    },
    {
      nom: 'Couronne déchue du Roi-Cendre', categoryPath: 'Bijoux', rarete: 'Légendaire', icone: 'crown',
      description: "Dernier vestige d'un royaume enseveli, elle confère une prestance que même la ruine n'a pas éteinte.",
      equipable: true, equipSlot: 'bijou', effects: eff({ mana: 3, resistanceMagique: 2 }, { SAG: 2, CHA: 2 }),
    },

    // -- Consommables (actifs, à usage) -------------------------------------
    // useResource indique QUELLE ressource le pop-up d'utilisation propose de
    // remplir — pas de montant fixe : le joueur note le résultat de son jet
    // et il s'ajoute à sa valeur actuelle (voir CharacterListPage.jsx).
    {
      nom: 'Potion de soin mineure', categoryPath: 'Consommables', rarete: 'Commune', icone: 'flask',
      description: 'Le remède de base de tout aventurier prudent.',
      consumable: true, useText: 'Vous buvez la potion. Lancez 1d6+2 et notez le résultat : vos blessures se referment.',
      useResource: 'vitalite', stackable: true, effects: eff(),
    },
    {
      nom: 'Fiole de mana scintillante', categoryPath: 'Consommables', rarete: 'Commune', icone: 'flask-round',
      description: 'Un liquide bleuté qui pétille au moindre mouvement.',
      consumable: true, useText: 'Une chaleur familière parcourt vos veines. Lancez 1d6+1 et notez le résultat pour votre réserve de mana.',
      useResource: 'mana', stackable: true, effects: eff(),
    },
    {
      nom: "Élixir d'endurance du baroudeur", categoryPath: 'Consommables', rarete: 'Rare', icone: 'droplet',
      description: 'Une recette de route transmise entre caravaniers, amère mais efficace.',
      consumable: true, useText: 'Vos jambes retrouvent un second souffle. Lancez 1d8+2 et notez le résultat.',
      useResource: 'endurance', stackable: true, effects: eff(),
    },
    {
      nom: 'Antidote noir', categoryPath: 'Consommables', rarete: 'Commune', icone: 'droplets',
      description: "Un remède âcre qui neutralise poisons et miasmes — effet purement narratif, à l'appréciation du MJ.",
      consumable: true, useText: 'Le poison reflue de vos veines.', stackable: true, effects: eff(),
    },
    {
      nom: 'Parchemin de bouclier instantané', categoryPath: 'Consommables', rarete: 'Rare', icone: 'scroll',
      description: "Un sortilège figé sur vélin, prêt à être libéré en un instant — effet à l'appréciation du MJ.",
      consumable: true, useText: 'Une barrière scintillante vous enveloppe brièvement.', stackable: true, effects: eff(),
    },
    {
      nom: 'Flasque ardente du berserker', categoryPath: 'Consommables', rarete: 'Épique', icone: 'flame',
      description: "Une mixture instable qui embrase la rage au prix de la prudence — effet à l'appréciation du MJ.",
      consumable: true, useText: "La rage embrase votre esprit — votre garde s'ouvre.", stackable: true, effects: eff(),
    },

    // -- Gadgets (equipSlot custom, actif/passif) --------------------------
    {
      nom: 'Module oculaire Unathopien', categoryPath: 'Gadgets', rarete: 'Rare', icone: 'glasses',
      description: 'Une lentille mécanique greffée sur la tempe, qui affine perception et réflexes en continu.',
      equipable: true, equipSlot: 'custom', actif: false, effects: eff({ initiative: 2, esquive: 1 }),
    },
    {
      nom: 'Cœur mécanique de secours', categoryPath: 'Gadgets', rarete: 'Rare', icone: 'heart-pulse',
      description: 'Un implant de secours qui maintient le corps en état de fonctionner, en permanence.',
      equipable: true, equipSlot: 'custom', actif: false, effects: eff({ vitalite: 8 }),
    },
    {
      nom: 'Générateur de bouclier portatif', categoryPath: 'Gadgets', rarete: 'Épique', icone: 'sparkle',
      description: "Doit être activé manuellement : déploie un champ de protection tant qu'il tourne.",
      equipable: true, equipSlot: 'custom', actif: true, effects: eff({ resistancePhysique: 4, resistanceMagique: 4 }),
    },
    {
      nom: "Injecteur d'adrénaline synthétique", categoryPath: 'Gadgets', rarete: 'Épique', icone: 'zap',
      description: "Une décharge à déclencher soi-même, qui embrase muscles et réflexes le temps du combat.",
      equipable: true, equipSlot: 'custom', actif: true, effects: eff({ attaquePhysique: 3, attaqueDistance: 3, initiative: 2 }),
    },
    {
      nom: 'Stabilisateur gravitique', categoryPath: 'Gadgets', rarete: 'Commune', icone: 'compass',
      description: 'Un petit boîtier qui allège la démarche en permanence, sans qu\'on y pense.',
      equipable: true, equipSlot: 'custom', actif: false, effects: eff({ deplacement: 1, esquive: 1 }),
    },

    // -- Sacs & Reliques -----------------------------------------------------
    {
      nom: "Sac d'exploration renforcé", categoryPath: 'Sacs & Reliques', rarete: 'Commune', icone: 'backpack',
      description: 'Des poches et sangles pensées pour de longues expéditions.',
      equipable: true, equipSlot: 'sac', effects: eff({ emplacements: 4 }),
    },
    {
      nom: 'Grimoire relique des Lymbes', categoryPath: 'Sacs & Reliques', rarete: 'Épique', icone: 'book',
      description: "Ses pages se réécrivent seules la nuit, dans une langue qu'aucun érudit vivant ne lit plus.",
      equipable: true, equipSlot: 'cape', effects: eff({ mana: 6 }, { INT: 1, SAG: 1 }),
    },

    // ======================================================================
    // Second lot — mêmes catégories, pas de doublon de nom avec le premier.
    // ======================================================================

    // -- Armes de mêlée --------------------------------------------------
    {
      nom: 'Épée longue de chevalier', categoryPath: 'Armes de mêlée', rarete: 'Rare', icone: 'sword',
      description: "Lame droite et longue, transmise de génération en génération dans les ordres montés.",
      equipable: true, equipSlot: 'arme', effects: eff({ attaquePhysique: 4 }, { FOR: 1 }),
    },
    {
      nom: 'Rapière de duelliste', categoryPath: 'Armes de mêlée', rarete: 'Rare', icone: 'swords',
      description: 'Fine et vive, elle récompense la précision plutôt que la force brute.',
      equipable: true, equipSlot: 'arme', effects: eff({ attaquePhysique: 2, esquive: 2 }, { DEX: 1 }),
    },
    {
      nom: "Fléau d'armes cloûté", categoryPath: 'Armes de mêlée', rarete: 'Épique', icone: 'hammer',
      description: 'Sa chaîne rend chaque coup imprévisible — dévastateur entre des mains entraînées.',
      equipable: true, equipSlot: 'arme', deuxMains: true, effects: eff({ attaquePhysique: 6, resistancePhysique: 1 }),
    },

    // -- Armes à distance -------------------------------------------------
    {
      nom: 'Sarbacane empoisonnée', categoryPath: 'Armes à distance', rarete: 'Commune', icone: 'target',
      description: 'Discrète et silencieuse, prisée des éclaireurs.',
      equipable: true, equipSlot: 'armeDistance', effects: eff({ attaqueDistance: 2 }, { DEX: 1 }),
    },
    {
      nom: "Javelot d'orage", categoryPath: 'Armes à distance', rarete: 'Rare', icone: 'target',
      description: 'Sa pointe métallique attire les éclairs autant que le sang.',
      equipable: true, equipSlot: 'armeDistance', effects: eff({ attaqueDistance: 4, attaquePhysique: 1 }),
    },

    // -- Armure légère -----------------------------------------------------
    {
      nom: 'Gants de pisteur', categoryPath: 'Armure légère', rarete: 'Commune', icone: 'feather',
      description: "Une prise sûre et une souplesse qui n'entrave jamais le geste.",
      equipable: true, equipSlot: 'gants', effects: eff({ esquive: 1 }, { DEX: 1 }),
    },
    {
      nom: "Cape en toile d'ombre", categoryPath: 'Armure légère', rarete: 'Rare', icone: 'skull',
      description: 'Elle boit la lumière plutôt que de la refléter.',
      equipable: true, equipSlot: 'cape', effects: eff({ esquive: 2, resistanceMagique: 1 }),
    },

    // -- Armure lourde -----------------------------------------------------
    {
      nom: 'Ceinture de plaques renforcées', categoryPath: 'Armure lourde', rarete: 'Commune', icone: 'shield',
      description: 'Un ceinturon cerclé de fer qui protège les flancs.',
      equipable: true, equipSlot: 'ceinture', effects: eff({ resistancePhysique: 2 }),
    },
    {
      nom: 'Brassards du bastion', categoryPath: 'Armure lourde', rarete: 'Épique', icone: 'anvil',
      description: 'Portés par la garde d\'élite, ils encaissent ce qu\'un bouclier ne peut plus tenir.',
      equipable: true, equipSlot: 'gants', effects: eff({ resistancePhysique: 3, vitalite: 5 }),
    },

    // -- Bijoux --------------------------------------------------------------
    {
      nom: 'Boucle de faucon', categoryPath: 'Bijoux', rarete: 'Rare', icone: 'gem',
      description: "Taillée en forme de serre, elle aiguise le regard à longue distance.",
      equipable: true, equipSlot: 'bijou', effects: eff({ attaqueDistance: 2 }, { DEX: 1 }),
    },
    {
      nom: 'Amulette du dernier souffle', categoryPath: 'Bijoux', rarete: 'Légendaire', icone: 'heart-pulse',
      description: "On raconte qu'elle a ramené son porteur du seuil de la mort plus d'une fois.",
      equipable: true, equipSlot: 'bijou', effects: eff({ vitalite: 8, resistanceMagique: 2 }, { CON: 2 }),
    },

    // -- Consommables (actifs, à usage) -------------------------------------
    {
      nom: 'Grand élixir de vie', categoryPath: 'Consommables', rarete: 'Épique', icone: 'flask',
      description: 'Une préparation rare, réservée aux blessures les plus graves.',
      consumable: true, useText: 'Vous videz la fiole d\'un trait. Lancez 2d6+4 et notez le résultat.',
      useResource: 'vitalite', stackable: true, effects: eff(),
    },
    {
      nom: 'Tisane de recentrage mental', categoryPath: 'Consommables', rarete: 'Commune', icone: 'leaf',
      description: 'Infusion amère qui clarifie l\'esprit et rouvre le canal magique.',
      consumable: true, useText: 'Vous buvez lentement. Lancez 1d4+1 et notez le résultat pour votre réserve de mana.',
      useResource: 'mana', stackable: true, effects: eff(),
    },
    {
      nom: 'Ration de survie fortifiée', categoryPath: 'Consommables', rarete: 'Commune', icone: 'package',
      description: 'Biscuits de voyage compressés, peu appétissants mais efficaces.',
      consumable: true, useText: 'Vous mangez sans vous presser. Lancez 1d6 et notez le résultat.',
      useResource: 'endurance', stackable: true, effects: eff(),
    },
    {
      nom: 'Fumigène aveuglant', categoryPath: 'Consommables', rarete: 'Rare', icone: 'flame',
      description: "Un nuage opaque et âcre qui trouble amis et ennemis — effet à l'appréciation du MJ.",
      consumable: true, useText: "Un nuage de fumée dense envahit la zone.", stackable: true, effects: eff(),
    },

    // -- Gadgets (equipSlot custom, actif/passif) --------------------------
    {
      nom: 'Exosquelette léger', categoryPath: 'Gadgets', rarete: 'Épique', icone: 'shield',
      description: 'Un renfort articulé qui démultiplie la force sans alourdir la démarche, en continu.',
      equipable: true, equipSlot: 'custom', actif: false, effects: eff({ deplacement: 1 }, { FOR: 2 }),
    },
    {
      nom: 'Module de camouflage optique', categoryPath: 'Gadgets', rarete: 'Légendaire', icone: 'sparkles',
      description: "Courbe la lumière autour de son porteur le temps d'une activation.",
      equipable: true, equipSlot: 'custom', actif: true, effects: eff({ esquive: 3, initiative: 1 }),
    },

    // -- Sacs & Reliques -----------------------------------------------------
    {
      nom: 'Sacoche de hanche', categoryPath: 'Sacs & Reliques', rarete: 'Commune', icone: 'package',
      description: 'Petit contenant de ceinture pour ce qu\'on veut garder à portée de main.',
      equipable: true, equipSlot: 'ceinture', effects: eff({ emplacements: 2 }),
    },
    {
      nom: 'Tome scellé des Abysses', categoryPath: 'Sacs & Reliques', rarete: 'Légendaire', icone: 'book',
      description: "Ses fermoirs de plomb ne suffisent pas toujours à taire ce qu'il contient.",
      equipable: true, equipSlot: 'cape', effects: eff({ mana: 8, resistanceMagique: 3 }, { INT: 2 }),
    },
  ];

  // ---------------------------------------------------------------------
  // Création (dédoublonnée par nom)
  // ---------------------------------------------------------------------
  let created = 0;
  let skipped = 0;
  ITEMS.forEach((def) => {
    if (getState().customItems.some((i) => i.nom === def.nom)) { skipped += 1; return; }
    const equipable = Boolean(def.equipable);
    const consumable = Boolean(def.consumable);
    const payload = {
      nom: def.nom,
      description: def.description || '',
      consumable,
      usable: consumable,
      useText: consumable ? (def.useText || '') : '',
      useResource: consumable ? (def.useResource || '') : '',
      equipable,
      equipSlot: equipable ? (def.equipSlot || '') : '',
      deuxMains: equipable && def.equipSlot === 'arme' ? Boolean(def.deuxMains) : false,
      stackable: Boolean(def.stackable),
      icone: def.icone || '',
      categoryId: categoryIdByPath[def.categoryPath] || null,
      classeId: null,
      rareteId: rarityIdByNom[def.rarete] || null,
      actif: equipable && def.equipSlot === 'custom' ? Boolean(def.actif) : false,
      effects: def.effects || NO_EFFECT,
      conditionEffects: equipable ? NO_EFFECT : null,
    };
    addItem(payload);
    created += 1;
  });

  console.log(`${created} item(s) créé(s), ${skipped} déjà existant(s) ignoré(s). ${CATEGORY_TREE.length} catégories racines assurées.`);
  setTimeout(() => { console.log('Sauvegardé, rechargement...'); location.reload(); }, 1500);
})();
