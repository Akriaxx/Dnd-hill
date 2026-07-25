-- Auto-lockout after failed logins, rebuilt on Supabase (security-definer
-- RPCs) instead of the old client-only localStorage token hack.
--
-- Flow: 3 wrong passwords -> profiles.disabled = true + an unlock link is
-- emailed (via EmailJS, sendAccountSuspended) to the account's own email,
-- pointing at /unlock?token=... . The GM's manual Suspendre/Débloquer
-- button in PlayersPanel is unrelated and keeps working (direct column
-- update, already covered by profiles_update_admin's RLS policy).

alter table public.profiles add column if not exists failed_attempts integer not null default 0;
alter table public.profiles add column if not exists unlock_token text;

-- Called after a failed supabase.auth.signInWithPassword — anon-callable
-- since the caller isn't authenticated yet at that point. Returns whether
-- the account is now disabled (already was, or just tipped over 3 fails)
-- and a fresh unlock_token only the first time it flips to disabled.
create or replace function public.register_failed_login(p_email text)
returns table(disabled boolean, unlock_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
  v_disabled boolean;
  v_token text;
begin
  update public.profiles
  set failed_attempts = failed_attempts + 1
  where email = p_email
  returning failed_attempts, profiles.disabled into v_attempts, v_disabled;

  if v_attempts is null then
    return query select false, null::text;
    return;
  end if;

  if v_attempts >= 3 and not v_disabled then
    v_token := encode(gen_random_bytes(24), 'hex');
    update public.profiles set disabled = true, unlock_token = v_token where email = p_email;
    return query select true, v_token;
    return;
  end if;

  return query select v_disabled, null::text;
end;
$$;

grant execute on function public.register_failed_login(text) to anon, authenticated;

-- Called right after a successful login to clear the counter.
create or replace function public.reset_failed_login()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set failed_attempts = 0 where id = auth.uid();
$$;

grant execute on function public.reset_failed_login() to authenticated;

-- Called from /unlock?token=... — anon-callable (that's the whole point,
-- proving you received the email is the credential here).
create or replace function public.unlock_with_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.profiles
  set disabled = false, failed_attempts = 0, unlock_token = null
  where unlock_token = p_token;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.unlock_with_token(text) to anon, authenticated;
