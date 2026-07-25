-- Fix register_failed_login: gen_random_bytes (from pgcrypto) lives in the
-- "extensions" schema on Supabase, not "public" — the function's
-- `set search_path = public` couldn't see it, so every call errored out
-- silently (register_failed_login was never actually flipping anyone to
-- disabled, no matter how many failed logins happened).

create or replace function public.register_failed_login(p_email text)
returns table(disabled boolean, unlock_token text)
language plpgsql
security definer
set search_path = public, extensions
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
