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
    const { action, code } = body

    // YouTube Music authentication for Frequency
    if (action === 'connect') {
      const clientId = Deno.env.get('YOUTUBE_CLIENT_ID')
      const redirectUri = `${req.headers.get('origin')}/auth/callback/youtube`
      const scopes = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube'
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${user.id}`

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'callback') {
      const clientId = Deno.env.get('YOUTUBE_CLIENT_ID')
      const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET')
      const redirectUri = `${req.headers.get('origin')}/auth/callback/youtube`

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          code: code
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange YouTube code for tokens')
      }

      const tokens = await tokenResponse.json()

      // Store connection
      const { error } = await supabaseClient
        .from('platform_connections')
        .upsert({
          user_id: user.id,
          platform: 'youtube_music',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
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
        .eq('platform', 'youtube_music')
        .eq('is_active', true)
        .single()

      if (!connection) {
        throw new Error('YouTube Music not connected')
      }

      const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch YouTube playlists')
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
        .eq('platform', 'youtube_music')
        .eq('is_active', true)
        .single()

      if (!connection) {
        throw new Error('YouTube Music not connected')
      }

      const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            title: name,
            description
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create YouTube playlist')
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