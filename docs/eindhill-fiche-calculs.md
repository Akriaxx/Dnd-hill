# Eindhill - Onglet Fiche

Source de reference : `Copie de Ezra - Fiche de Personnage.xlsx`, onglet `CARACTERISTIQUES PRINCIPALES`.

Cette page cartographie uniquement l'onglet `Fiche`. Le grimoire est volontairement ignore.

## Champs personnage

| Champ app | Cellule GSheet | Exemple Ezra |
| --- | --- | --- |
| `nom` | `D3` | `Ezra " Jack " Hopkins` |
| `race` | `D4` | `Unathopien` |
| `sexe` | `I4` | `Homme` |
| `classe` | `D5` | `Brigand` |
| `sousClasse` | `I5` | `Spectre des Heures` |
| `niveau` | `D6` | `5` |
| `chance` | `I6` | `4` |
| `naissance` | `D8` | `309` |
| `provenance` | `I8` | `Cite d'Unathopia` |
| `ascendance` | `D9` | `Mecanisation a 40%` |
| `origine` | `I9` | `Citadin` |
| `historique` | `D10` | `Ingenieur` |
| `maitrise` | `I10` | `Temps` |
| `taille` | `D11` | `187` |
| `poids` | `H11` | `97` |
| `age` | `K11` | `31` |

## Caracteristiques

Les bases sont en `P4:P9`.

| Stat | Base | Mod | Bonus | Malus | Total |
| --- | --- | --- | --- | --- | --- |
| Force | `P4` | `Q4` | `R4` | `S4` | `AB4` |
| Dexterite | `P5` | `Q5` | `R5` | `S5` | `AB5` |
| Constitution | `P6` | `Q6` | `R6` | `S6` | `AB6` |
| Intelligence | `P7` | `Q7` | `R7` | `S7` | `AB7` |
| Sagesse | `P8` | `Q8` | `R8` | `S8` | `AB8` |
| Charisme | `P9` | `Q9` | `R9` | `S9` | `AB9` |

Formule du modificateur :

```js
Math.floor((base - 10) / 2)
```

Formule du total GSheet :

```txt
MOD + BONUS + MALUS + BONUS_OBJET + MALUS_OBJET + BONUS_TEMP + MALUS_TEMP
```

Dans le fichier, les malus sont stockes comme valeurs negatives. On conserve donc cette convention dans `statsDetails`.

## Ressources

| Ressource | Max | Base classe | Bonus | Level up | Perdu |
| --- | --- | --- | --- | --- | --- |
| Vitalite | `AE5` | `AE6` | `AE7` | `AE11` | `AE12` |
| Maitrise | `AG5` | `AG6` | `AG7` | `AG11` | `AG12` |
| Endurance | `AI5` | `AI6` | `AI7` | `AI11` | `AI12` |

Premiere implementation app :

```txt
bonus = max - baseClasse
levelup = max - baseClasse
perdu = max - actuel
```

Les bonus speciaux issus de race, classe, sous-classe, eveil/rage/gadgets seront branches apres extraction de `STOCKAGE`.

## Deplacements et ports

| Bloc | Base | Bonus objet | Total |
| --- | --- | --- | --- |
| Deplacements | `C14` | `G14` | `C15` |
| Emplacements | `C17` | `G17` | `C18` |

Formule generale app :

```txt
base + bonus + bonusObjet + bonusTemp - malus - malusObjet - malusTemp
```

## Combat

| Stat combat | Base | Total |
| --- | --- | --- |
| Initiative | `P14` | `AB14` |
| Attaque physique | `P15` | `AB15` |
| Attaque magique | `P16` | `AB16` |
| Attaque distance | `P17` | `AB17` |
| Defense physique | `P20` | `AB20` |
| Defense magique | `P21` | `AB21` |
| Esquive | `P22` | `AB22` |

Premiere implementation app :

```txt
Initiative = 10 + mod(DEX) + max(0, mod(CHA))
Att. physique = 3 + mod(FOR) + max(0, mod(DEX))
Att. magique = 2 + max(mod(INT), mod(SAG), mod(CHA))
Att. distance = 3 + mod(DEX)
Def. physique = 8 + mod(CON) + 1
Def. magique = 8 + mod(SAG)
Esquive = 9 + mod(DEX)
```

Cette passe remplace les calculs eparpilles par `src/domain/characterCalculations.js`. Les coefficients exacts venant de race/classe/equipement seront ajoutes dans les passes suivantes.
