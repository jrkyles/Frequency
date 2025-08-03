import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      throw new Error('Unauthorized')
    }

    const body = await req.json()
    const { action, developerToken, musicUserToken } = body

    if (action === 'connect') {
      if (!developerToken || !musicUserToken) {
        return new Response(JSON.stringify({ error: 'Apple Music developer token and user token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Store Apple Music connection
      const { error } = await supabaseClient
        .from('platform_connections')
        .upsert({
          user_id: user.id,
          platform: 'apple_music',
          access_token: musicUserToken,
          refresh_token: developerToken, // Store developer token as refresh token
          is_active: true
        })

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_playlists') {
      const { data: connection } = await supabaseClient
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'apple_music')
        .eq('is_active', true)
        .single()

      if (!connection) {
        throw new Error('Apple Music not connected')
      }

      const response = await fetch('https://api.music.apple.com/v1/me/library/playlists', {
        headers: {
          'Authorization': `Bearer ${connection.refresh_token}`,
          'Music-User-Token': connection.access_token
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Apple Music playlists')
      }

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create_playlist') {
      const { name, description } = body
      const { data: connection } = await supabaseClient
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'apple_music')
        .eq('is_active', true)
        .single()

      if (!connection) {
        throw new Error('Apple Music not connected')
      }

      const response = await fetch('https://api.music.apple.com/v1/me/library/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.refresh_token}`,
          'Music-User-Token': connection.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attributes: {
            name,
            description
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create Apple Music playlist')
      }

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})