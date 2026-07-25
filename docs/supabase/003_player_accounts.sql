-- Player accounts on top of Supabase Auth.
-- Run this AFTER 001_security_core.sql and 002_app_tables.sql.
--
-- LoginPage asks for an "Identifiant" (username), not an email, and the GM
-- creates accounts from the admin panel (not self-signup) — see the
-- Edge Function `manage-player` for the create/delete side, which needs
-- service_role and can't run from the browser. This file adds what the
-- client CAN safely do with just the anon key + RLS:
--   - a username → email lookup so login can stay username-based
--   - a `disabled` flag the GM can toggle directly (replaces the old
--     localStorage suspend/unlock flow, no email round-trip needed since
--     it's now a plain admin action gated by RLS)
--   - a `permissions` column for moderator-role per-account overrides
--     (used to live on playerAccounts, now needs a home on profiles)

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists disabled boolean not null default false;
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Narrow, anon-readable view: only what login needs (username → email),
-- nothing else from profiles (role, disabled flag, etc. stay protected by
-- profiles' own RLS). Fine for a small private-campaign tool.
create or replace view public.login_lookup as
  select username, email from public.profiles;

grant select on public.login_lookup to anon, authenticated;
