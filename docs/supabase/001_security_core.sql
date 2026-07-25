-- Eindhill security core for the future Supabase database.
-- This file is a starting point: run it only after the real tables are created
-- and after adapting table names/columns if the schema changes.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role_key text not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  key text primary key,
  label text not null,
  power integer not null default 0,
  system boolean not null default false,
  absolute boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_key text not null references public.roles(key) on delete cascade,
  permission_key text not null,
  enabled boolean not null default true,
  primary key (role_key, permission_key)
);

insert into public.roles (key, label, power, system, absolute)
values
  ('developer', 'Développeur', 100, true, true),
  ('gm', 'Maître du Donjon', 90, true, false),
  ('moderator', 'Modérateur', 40, true, false),
  ('player', 'Joueur', 0, true, false)
on conflict (key) do nothing;

insert into public.role_permissions (role_key, permission_key, enabled)
values
  ('developer', 'managePlayers', true),
  ('developer', 'manageRoles', true),
  ('developer', 'reviewCharacterCreations', true),
  ('developer', 'manageReferences', true),
  ('developer', 'manageIdentities', true),
  ('developer', 'manageGameplay', true),
  ('developer', 'manageItems', true),
  ('developer', 'viewAllCharacters', true),
  ('developer', 'manageTickets', true),
  ('developer', 'viewTerminal', true),
  ('gm', 'managePlayers', true),
  ('gm', 'manageRoles', true),
  ('gm', 'reviewCharacterCreations', true),
  ('gm', 'manageReferences', true),
  ('gm', 'manageIdentities', true),
  ('gm', 'manageGameplay', true),
  ('gm', 'manageItems', true),
  ('gm', 'viewAllCharacters', true)
on conflict (role_key, permission_key) do nothing;

create or replace function public.current_role_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role_key from public.profiles where id = auth.uid()),
    'anonymous'
  );
$$;

create or replace function public.is_absolute_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select absolute from public.roles where key = public.current_role_key()),
    false
  );
$$;

create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_absolute_role()
    or exists (
      select 1
      from public.role_permissions rp
      where rp.role_key = public.current_role_key()
        and rp.permission_key = permission
        and rp.enabled = true
    );
$$;

create or replace function public.owns_row(owner_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null and owner_id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
using (
  public.owns_row(id)
  or public.has_permission('managePlayers')
);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
using (public.has_permission('managePlayers'))
with check (public.has_permission('managePlayers'));

drop policy if exists roles_select_admin on public.roles;
create policy roles_select_admin
on public.roles
for select
using (public.has_permission('manageRoles'));

drop policy if exists role_permissions_select_admin on public.role_permissions;
create policy role_permissions_select_admin
on public.role_permissions
for select
using (public.has_permission('manageRoles'));

-- Templates to apply once these tables exist:
--
-- characters:
--   select: owns_row(user_id) or has_permission('viewAllCharacters')
--   insert: owns_row(user_id)
--   update: owns_row(user_id) or has_permission('viewAllCharacters')
--   delete: has_permission('viewAllCharacters')
--
-- character_creation_requests:
--   select: owns_row(requested_by) or has_permission('reviewCharacterCreations')
--   insert: owns_row(requested_by)
--   update/delete: has_permission('reviewCharacterCreations')
--
-- reference tables (races, ascendances, origins, histories, aptitudes, etc.):
--   select: authenticated users
--   write: corresponding permission:
--     manageReferences, manageIdentities, manageGameplay, manageItems
--
-- tickets and terminal logs:
--   select/write: manageTickets or viewTerminal depending on table sensitivity
