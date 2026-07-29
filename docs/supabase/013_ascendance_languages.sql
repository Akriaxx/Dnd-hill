-- Renseigne le champ "langue" de chaque ascendance concernée (voir
-- AscendancesPanel.jsx -> "Langue accordée"), lu par getComputedLanguageRows
-- (characterCalculations.js) pour ajouter automatiquement la langue dans
-- "Mes Langues" sur la fiche d'un personnage ayant cette ascendance.
--
-- Le rapprochement se fait sur un nom normalisé (lettres/chiffres, accents
-- et ponctuation retirés) plutôt que sur une égalité stricte de chaîne :
-- les apostrophes ("Mira'Gardien", "Eyreillien"...) telles que saisies ici
-- pourraient ne pas être l'exacte même apostrophe Unicode (' vs ’) que
-- celle stockée en base lors du seed initial, ce qui ferait échouer un
-- match strict sans erreur ni avertissement.
with lang_map(nom_norm, langue) as (
  values
    (lower(regexp_replace('Mécanisation à 20%', '[^a-zA-Z0-9]', '', 'g')), '[ Mécani ] - ( +4 Ascendance )'),
    (lower(regexp_replace('Mécanisation à 40%', '[^a-zA-Z0-9]', '', 'g')), '[ Mécani ] - ( +4 Ascendance )'),
    (lower(regexp_replace('Mécanisation à 60%', '[^a-zA-Z0-9]', '', 'g')), '[ Mécani ] - ( +6 Ascendance )'),
    (lower(regexp_replace('Mécanisation à 80%', '[^a-zA-Z0-9]', '', 'g')), '[ Mécani ] - ( +8 Ascendance )'),
    (lower(regexp_replace('Océanien', '[^a-zA-Z0-9]', '', 'g')), '[ Adoyen ] - ( Ascendance )'),
    (lower(regexp_replace('Solarien', '[^a-zA-Z0-9]', '', 'g')), '[ Ein''irk ] - ( Ascendance )'),
    (lower(regexp_replace('Mira''Gardien', '[^a-zA-Z0-9]', '', 'g')), '[ Va''Auruin ] - ( Ascendance )'),
    (lower(regexp_replace('Impérien', '[^a-zA-Z0-9]', '', 'g')), '[ Ein''irk ] - ( Ascendance )'),
    (lower(regexp_replace('Eyreillien', '[^a-zA-Z0-9]', '', 'g')), '[ Va''Auruin ] - ( Ascendance )'),
    (lower(regexp_replace('Lunarien', '[^a-zA-Z0-9]', '', 'g')), '[ Ein''irk ] - ( Ascendance )'),
    (lower(regexp_replace('Lignée Lumineuse', '[^a-zA-Z0-9]', '', 'g')), '[ Va''Auruin ] - ( Ascendance )'),
    (lower(regexp_replace('Lignée Chaotique', '[^a-zA-Z0-9]', '', 'g')), '[ Va''Auruin ] - ( Ascendance )'),
    (lower(regexp_replace('Chante-Dragon', '[^a-zA-Z0-9]', '', 'g')), '[ Edvel’dar ] - ( +4 Ascendance )'),
    (lower(regexp_replace('Feu d''Atrevin', '[^a-zA-Z0-9]', '', 'g')), '[ Langage des Runes ] - ( Ascendance )'),
    (lower(regexp_replace('Kyn''Tharis', '[^a-zA-Z0-9]', '', 'g')), '[ Mécani ] - ( +4 Ascendance )'),
    (lower(regexp_replace('Runthaar', '[^a-zA-Z0-9]', '', 'g')), '[ Langage des Runes ] - ( Ascendance )'),
    (lower(regexp_replace('Eternien', '[^a-zA-Z0-9]', '', 'g')), '[ Lorin ] - ( Ascendance )'),
    (lower(regexp_replace('Athréen', '[^a-zA-Z0-9]', '', 'g')), '[ Lorin ] - ( Ascendance )'),
    (lower(regexp_replace('Arcadien', '[^a-zA-Z0-9]', '', 'g')), '[ Lorin ] - ( Ascendance )'),
    (lower(regexp_replace('Phynomien', '[^a-zA-Z0-9]', '', 'g')), '[ Ein''irk ] - ( Ascendance )')
)
update public.game_data
set data = jsonb_set(
  data,
  '{customAscendances}',
  (
    select jsonb_agg(
      coalesce(
        (
          select elem || jsonb_build_object('langue', lm.langue)
          from lang_map lm
          where lm.nom_norm = lower(regexp_replace(elem->>'nom', '[^a-zA-Z0-9]', '', 'g'))
          limit 1
        ),
        elem
      )
    )
    from jsonb_array_elements(data->'customAscendances') as elem
  )
)
where id = 1;

-- Vérification : liste les ascendances qui ont bien reçu une langue, et
-- celles qui n'en ont pas reçu (attendu pour Premiers Hommes, Né-de-Givre,
-- Thrymkaar, les Maisons, Pelage Blanc/Noir, les Bois — pas de langue
-- listée pour elles).
select elem->>'nom' as ascendance, elem->>'langue' as langue
from public.game_data, jsonb_array_elements(data->'customAscendances') as elem
where id = 1
order by (elem->>'langue') is null, ascendance;
