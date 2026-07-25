-- Eindhill app tables: characters + reference/admin game data.
-- Run this AFTER 001_security_core.sql (needs owns_row/has_permission).
--
-- Design choice: the app's admin builders (races, classes, items, spells…)
-- and character sheets are deeply nested, free-form, and change shape
-- constantly (see the whole "Gestion du Donjon" panel history). Modeling
-- every nested field as its own relational column/table would mean a
-- migration every time a builder gains a field — not worth it for a
-- single-campaign tool. Instead: one row per character, one singleton row
-- for all admin/reference data, each holding its exact current JS object
-- shape as jsonb. RLS still enforces WHO can read/write each row/table;
-- per-field validation stays in the React layer, same as today.

create table if not exists public.characters (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active', -- 'active' | 'pending' | 'rejected'
  requested_by uuid references auth.users(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters(user_id);

alter table public.characters enable row level security;

drop policy if exists characters_select on public.characters;
create policy characters_select
on public.characters
for select
using (
  public.owns_row(user_id)
  or public.has_permission('viewAllCharacters')
);

drop policy if exists characters_insert on public.characters;
create policy characters_insert
on public.characters
for insert
with check (public.owns_row(user_id));

drop policy if exists characters_update on public.characters;
create policy characters_update
on public.characters
for update
using (
  public.owns_row(user_id)
  or public.has_permission('viewAllCharacters')
  or public.has_permission('reviewCharacterCreations')
)
with check (
  public.owns_row(user_id)
  or public.has_permission('viewAllCharacters')
  or public.has_permission('reviewCharacterCreations')
);

drop policy if exists characters_delete on public.characters;
create policy characters_delete
on public.characters
for delete
using (public.has_permission('viewAllCharacters'));

-- Singleton row holding every "customX" array from adminStore's
-- GAME_DATA_STATE_KEYS (races, classes, subclasses, maitrises, items,
-- spells, aptitudes, résistances, level rules, gameplay index…) as one
-- jsonb blob, keyed by domain (same key names as the store today).
create table if not exists public.game_data (
  id smallint primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint game_data_singleton check (id = 1)
);

insert into public.game_data (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.game_data enable row level security;

drop policy if exists game_data_select on public.game_data;
create policy game_data_select
on public.game_data
for select
using (auth.uid() is not null);

drop policy if exists game_data_update on public.game_data;
create policy game_data_update
on public.game_data
for update
using (
  public.has_permission('manageReferences')
  or public.has_permission('manageIdentities')
  or public.has_permission('manageGameplay')
  or public.has_permission('manageItems')
)
with check (
  public.has_permission('manageReferences')
  or public.has_permission('manageIdentities')
  or public.has_permission('manageGameplay')
  or public.has_permission('manageItems')
);

-- Tickets/logs (StorageJsonPanel's SECURITY_STATE_KEYS minus playerAccounts/
-- roles, which are now auth.users/profiles/roles/role_permissions).
create table if not exists public.app_tickets (
  id bigint generated always as identity primary key,
  title text not null default 'Erreur applicative',
  description text not null default '',
  severity text not null default 'error',
  status text not null default 'open',
  source text not null default 'terminal',
  stack text not null default '',
  signature text,
  occurrences integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.app_tickets enable row level security;

drop policy if exists app_tickets_all on public.app_tickets;
create policy app_tickets_all
on public.app_tickets
for all
using (public.has_permission('manageTickets'))
with check (public.has_permission('manageTickets'));
