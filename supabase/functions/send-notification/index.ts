import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title, and body required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', user_id)
      .single();

    if (!profile?.expo_push_token) {
      return new Response(JSON.stringify({ error: 'No push token for user' }), { status: 404 });
    }

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        data: data || {},
        sound: 'default',
      }),
    });

    const pushResult = await pushResponse.json();

    // Save to notifications table for in-app history
    await supabase.from('notifications').insert({
      user_id,
      title,
      body,
      type: data?.type || 'system',
      data: data || {},
    });

    return new Response(JSON.stringify({ success: true, push: pushResult }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
