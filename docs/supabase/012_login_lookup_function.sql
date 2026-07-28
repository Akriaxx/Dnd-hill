-- Remplace la vue public.login_lookup (flaggée CRITICAL par le linter
-- Supabase : "Security Definer View" — n'importe qui peut la lire en
-- entier via l'API REST, pas juste chercher un pseudo précis) par une
-- fonction étroite : un pseudo en entrée, un email en sortie, rien
-- d'énumérable. Le SECURITY DEFINER reste nécessaire (un visiteur non
-- connecté doit pouvoir résoudre pseudo → email avant même de se
-- connecter, donc en contournant le RLS de profiles), mais une fonction
-- avec une signature explicite est le pattern recommandé pour ça plutôt
-- qu'une vue à la surface large.
-- À exécuter dans Supabase > SQL Editor.

drop view if exists public.login_lookup;

create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.profiles where username = p_username limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;
