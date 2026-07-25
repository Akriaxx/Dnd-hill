// Supabase Edge Function: manage-player
//
// Creating/deleting another user's auth account needs the service_role key,
// which must never reach the browser. This function holds that key and is
// the only place account creation/deletion happens; the React app calls it
// via supabase.functions.invoke('manage-player', { body: {...} }).
//
// Deploy: Supabase dashboard → Edge Functions → Create a new function,
// name it exactly "manage-player", paste this file's content, Deploy.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Edge Runtime — nothing to configure.

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';

  // Scoped to the caller's session — used only to verify permission.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: allowed, error: permError } = await callerClient.rpc('has_permission', {
    permission: 'managePlayers',
  });
  if (permError || !allowed) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 403 });
  }

  // Full-power client for the actual auth.admin operations.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );

  const body = await req.json();

  if (body.action === 'create') {
    const { email, password, username, displayName, role, permissions } = body;
    if (!email || !password || !username) {
      return new Response(JSON.stringify({ error: 'Champs manquants.' }), { status: 400 });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      username,
      email,
      display_name: displayName || username,
      role_key: role || 'player',
      permissions: permissions || {},
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ id: created.user.id }), { status: 200 });
  }

  if (body.action === 'delete') {
    const { userId } = body;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId manquant.' }), { status: 400 });
    }
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'action inconnue.' }), { status: 400 });
});
