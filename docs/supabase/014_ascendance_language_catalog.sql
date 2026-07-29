-- 013_ascendance_languages.sql only linked ascendances to a language NAME
-- (the "langue" text field, parsed for the sheet) — it never created the
-- languages themselves in Gestion du Donjon -> Langues, which is why that
-- panel is still empty. This creates the 7 actual language catalog entries
-- (Mécani, Adoyen, Ein'irk, Va'Auruin, Edvel’dar, Langage des Runes, Lorin)
-- referenced by the 20 ascendances from 013, plus the category they live
-- in. Descriptions are left blank on purpose (no lore invented) — fill
-- them in from the admin panel if wanted.
--
-- customLanguages entries are matched by SmartText's {language.<nom>} tags
-- and by Mes Langues' catalog enrichment purely on the "nom" text, so the
-- exact "key" chosen here doesn't need to match what the admin UI's
-- slugifyKey would produce — it only needs to be unique.

update public.game_data
set data = jsonb_set(
  jsonb_set(
    data,
    '{customLanguageCategories}',
    coalesce(data->'customLanguageCategories', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', 900001,
        'key', 'langues-ascendance',
        'nom', 'Langues d''Ascendance',
        'couleur', '#bcecff',
        'custom', true,
        'createdAt', now()::text
      )
    )
  ),
  '{customLanguages}',
  coalesce(data->'customLanguages', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('id', 900101, 'key', 'mecani', 'nom', 'Mécani', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900102, 'key', 'adoyen', 'nom', 'Adoyen', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900103, 'key', 'ein-irk', 'nom', 'Ein''irk', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900104, 'key', 'va-auruin', 'nom', 'Va''Auruin', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900105, 'key', 'edvel-dar', 'nom', 'Edvel’dar', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900106, 'key', 'langage-des-runes', 'nom', 'Langage des Runes', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text),
    jsonb_build_object('id', 900107, 'key', 'lorin', 'nom', 'Lorin', 'categoryKey', 'langues-ascendance', 'categoryName', 'Langues d''Ascendance', 'couleur', '#bcecff', 'description', '', 'custom', true, 'createdAt', now()::text)
  )
)
where id = 1;

-- Vérification
select elem->>'nom' as langue, elem->>'categoryName' as categorie
from public.game_data, jsonb_array_elements(data->'customLanguages') as elem
where id = 1;
