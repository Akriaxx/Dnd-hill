-- A state can belong to several categories, not just one — e.g. an
-- "Aveuglement" state reachable both through "Malédiction" (curse-casters
-- like a Sorcier with the Ombre maîtrise) and through some other
-- category granting access to Paladin-type classes with the Lumière
-- maîtrise, even though both inflict the exact same mechanical state.
-- Replaces the single category_key FK with a category_keys jsonb array
-- (same convention as maitrise_keys). No data to migrate yet — both
-- tables are still empty at the time of this migration.

alter table public.states drop constraint if exists states_category_key_fkey;
drop index if exists states_category_key_idx;

alter table public.states drop column if exists category_key;
alter table public.states add column if not exists category_keys jsonb not null default '[]'::jsonb;

create index if not exists states_category_keys_idx on public.states using gin (category_keys);
