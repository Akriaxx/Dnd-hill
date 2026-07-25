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

// Deno Edge Functions don't add CORS headers on their own — without these,
// the browser's preflight OPTIONS request gets blocked before the actual
// POST ever leaves, and supabase-js just reports a generic
// "Failed to send a request to the Edge Function".
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    return json({ error: 'Non autorisé.' }, 403);
  }

  // Full-power client for the actual auth.admin operations.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );

  const body = await req.json();

  if (body.action === 'create') {
    const { email, password, username, displayName, role, permissions, redirectTo } = body;
    if (!email || !password || !username) {
      return json({ error: 'Champs manquants.' }, 400);
    }

    // generateLink (type: signup) crée le compte ET renvoie le lien de
    // confirmation SANS que Supabase envoie lui-même un email — libre à
    // nous de l'envoyer via notre propre mailer (EmailJS côté client),
    // ce qui évite d'avoir à configurer un SMTP perso + domaine vérifié
    // juste pour personnaliser ce mail.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo },
    });
    if (linkError) {
      return json({ error: linkError.message }, 400);
    }
    const created = linkData.user;

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.id,
      username,
      email,
      display_name: displayName || username,
      role_key: role || 'player',
      permissions: permissions || {},
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.id);
      return json({ error: profileError.message }, 400);
    }

    return json({ id: created.id, confirmationUrl: linkData.properties.action_link });
  }

  if (body.action === 'delete') {
    const { userId } = body;
    if (!userId) {
      return json({ error: 'userId manquant.' }, 400);
    }
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return json({ error: error.message }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: 'action inconnue.' }, 400);
});
