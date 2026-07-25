-- Fix request_unlock_code: "returns table(email text, ...)" makes `email`
-- an implicit identifier inside the function body, colliding with the bare
-- `email` column reference in the UPDATE's WHERE clause ("column reference
-- email is ambiguous"). Qualify every column reference explicitly.

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
  update public.profiles p
  set unlock_code = v_code, unlock_code_expires_at = now() + interval '15 minutes'
  where p.email = v_email;

  return query select v_email, v_username, v_code;
end;
$$;

grant execute on function public.request_unlock_code(text) to anon, authenticated;
