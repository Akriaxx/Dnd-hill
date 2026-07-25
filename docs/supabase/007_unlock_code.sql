-- Two-step unlock: click the emailed link -> land on a page that asks for
-- a fresh 6-digit code -> a second email with that code is sent -> enter
-- it -> account unlocked. Replaces the previous single-click unlock.

alter table public.profiles add column if not exists unlock_code text;
alter table public.profiles add column if not exists unlock_code_expires_at timestamptz;

-- Step 1: validate the token from the emailed link, generate + store a
-- fresh 6-digit code (doesn't unlock yet), return it so the client can
-- send it via EmailJS.
create or replace function public.request_unlock_code(p_token text)
returns table(email text, username text, code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_username text;
  v_code text;
begin
  select p.email, p.username into v_email, v_username
  from public.profiles p
  where p.unlock_token = p_token and p.disabled = true;

  if v_email is null then
    return query select null::text, null::text, null::text;
    return;
  end if;

  v_code := lpad((floor(random() * 1000000))::text, 6, '0');
  update public.profiles
  set unlock_code = v_code, unlock_code_expires_at = now() + interval '15 minutes'
  where email = v_email;

  return query select v_email, v_username, v_code;
end;
$$;

grant execute on function public.request_unlock_code(text) to anon, authenticated;

-- Step 2: verify token + code together, finalize the unlock.
create or replace function public.confirm_unlock_code(p_token text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.profiles
  set disabled = false, failed_attempts = 0, unlock_token = null,
      unlock_code = null, unlock_code_expires_at = null
  where unlock_token = p_token
    and unlock_code = p_code
    and unlock_code_expires_at > now();
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.confirm_unlock_code(text, text) to anon, authenticated;
