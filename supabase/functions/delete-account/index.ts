import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return Response.json({ error: 'Account deletion is not configured.' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Invalid session.' }, { status: 401 });

  // Delete every user-owned row before deleting the Auth identity. Any failure
  // stops the operation so the client can report it and retain its local data.
  const deletions = [
    () => admin.from('workouts').delete().eq('user_id', user.id),
    () => admin.from('routines').delete().eq('user_id', user.id),
    () => admin.from('bodyweight_logs').delete().eq('user_id', user.id),
    () => admin.from('profiles').delete().eq('id', user.id),
    () => admin.from('user_app_state').delete().eq('user_id', user.id),
  ];
  for (const deletion of deletions) {
    const { error } = await deletion();
    if (error) {
      console.error('Account data deletion failed:', error.message);
      return Response.json({ error: 'Could not delete all account data.' }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error('Auth user deletion failed:', deleteUserError.message);
    return Response.json({ error: 'Could not delete the authenticated account.' }, { status: 500 });
  }

  return Response.json({ deleted: true });
});
