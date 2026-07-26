-- Dedicated tables for the "États" (status effects) system. Unlike most
-- other reference content (races, compétences, etc.) which lives inside
-- the single game_data jsonb blob, États get real relational tables:
-- the data has genuine structure (mechanical effects, multiple removal
-- conditions per state, links to classes/sous-classes and to mastery
-- domains) that benefits from being queryable rather than buried in one
-- opaque JSON column.
--
-- No default rows are seeded here on purpose — every category and state
-- is authored from the admin builder.

create table if not exists public.state_categories (
  key text primary key,
  nom text not null,
  couleur text not null default '#d77ee8',
  -- Sous-classes autorisées à appliquer un état de cette catégorie.
  -- Tableau de clés de sous-classe ; vide = tout le monde peut l'appliquer.
  sous_classes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.state_categories(key) on delete cascade,
  nom text not null,
  tag_color text not null default '#d77ee8',
  description text not null default '',
  effects text not null default '',
  -- Domaine(s) de maîtrise auxquels cet état est réservé. Tableau de clés
  -- de maîtrise ; vide = non lié à un domaine en particulier.
  maitrise_keys jsonb not null default '[]'::jsonb,
  -- Conditions de fin de l'état, combinables (ex: jet de sauvegarde
  -- périodique ET un sort d'un type précis qui dissipe instantanément).
  -- Shape par entrée : { type: 'save'|'spell_type'|'action'|'positional', ... }
  removal_conditions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists states_category_key_idx on public.states(category_key);

alter table public.state_categories enable row level security;
alter table public.states enable row level security;

-- Lecture ouverte à tout compte connecté (comme game_data) : les joueurs
-- doivent pouvoir consulter les états qui les affectent.
drop policy if exists state_categories_select on public.state_categories;
create policy state_categories_select
on public.state_categories
for select
using (auth.uid() is not null);

drop policy if exists states_select on public.states;
create policy states_select
on public.states
for select
using (auth.uid() is not null);

-- Écriture réservée aux comptes avec la permission manageGameplay (même
-- permission que la section "États" de l'admin, voir SECTION_PERMISSIONS).
drop policy if exists state_categories_insert_admin on public.state_categories;
create policy state_categories_insert_admin
on public.state_categories
for insert
with check (public.has_permission('manageGameplay'));

drop policy if exists state_categories_update_admin on public.state_categories;
create policy state_categories_update_admin
on public.state_categories
for update
using (public.has_permission('manageGameplay'))
with check (public.has_permission('manageGameplay'));

drop policy if exists state_categories_delete_admin on public.state_categories;
create policy state_categories_delete_admin
on public.state_categories
for delete
using (public.has_permission('manageGameplay'));

drop policy if exists states_insert_admin on public.states;
create policy states_insert_admin
on public.states
for insert
with check (public.has_permission('manageGameplay'));

drop policy if exists states_update_admin on public.states;
create policy states_update_admin
on public.states
for update
using (public.has_permission('manageGameplay'))
with check (public.has_permission('manageGameplay'));

drop policy if exists states_delete_admin on public.states;
create policy states_delete_admin
on public.states
for delete
using (public.has_permission('manageGameplay'));
