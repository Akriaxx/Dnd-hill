-- Track real email confirmation on profiles.
--
-- PlayersPanel showed every freshly created account as "Actif" right away,
-- even before the player had clicked the activation link — because
-- "disabled" was the only status column, and confirmation state lives on
-- auth.users (email_confirmed_at), not on our own profiles table, and
-- isn't readable from the client at all (RLS blocks direct auth.users
-- access). A trigger syncs it into profiles so the client can just read
-- one boolean.

alter table public.profiles add column if not exists email_confirmed boolean not null default false;

create or replace function public.sync_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
    update public.profiles set email_confirmed = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update on auth.users
for each row
execute function public.sync_email_confirmed();

-- Backfill: anyone already confirmed before this migration existed.
update public.profiles p
set email_confirmed = true
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null and p.email_confirmed = false;
