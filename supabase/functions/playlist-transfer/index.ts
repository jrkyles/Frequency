import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Track {
  name: string;
  artist: string;
  album?: string;
  isrc?: string;
  duration_ms?: number;
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
    const { action, sourcePlaylistId, sourcePlatform, targetPlatform, playlistName, playlistDescription } = body

    if (action === 'transfer_playlist') {
      // Get source platform connection
      const { data: sourceConnection } = await supabaseClient
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', sourcePlatform)
        .eq('is_active', true)
        .single()

      if (!sourceConnection) {
        throw new Error(`${sourcePlatform} not connected`)
      }

      // Get target platform connection
      const { data: targetConnection } = await supabaseClient
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', targetPlatform)
        .eq('is_active', true)
        .single()

      if (!targetConnection) {
        throw new Error(`${targetPlatform} not connected`)
      }

      // Get tracks from source playlist
      const sourceTracks = await getPlaylistTracks(sourcePlatform, sourcePlaylistId, sourceConnection.access_token, sourceConnection.refresh_token)
      
      // Create playlist on target platform
      const targetPlaylist = await createPlaylist(targetPlatform, playlistName, playlistDescription, targetConnection.access_token, targetConnection.refresh_token)
      
      // Search and add tracks to target playlist
      const transferResults = []
      for (const track of sourceTracks) {
        try {
          const foundTrack = await searchTrack(targetPlatform, track, targetConnection.access_token, targetConnection.refresh_token)
          if (foundTrack) {
            await addTrackToPlaylist(targetPlatform, targetPlaylist.id, foundTrack.id, targetConnection.access_token, targetConnection.refresh_token)
            transferResults.push({ track: track.name, status: 'success' })
          } else {
            transferResults.push({ track: track.name, status: 'not_found' })
          }
        } catch (error) {
          transferResults.push({ track: track.name, status: 'error', error: error.message })
        }
      }

      // Log transfer in database
      await supabaseClient
        .from('sync_history')
        .insert({
          user_id: user.id,
          sync_config_id: null, // This is a manual transfer
          status: 'completed',
          tracks_added: transferResults.filter(r => r.status === 'success').length,
          tracks_failed: transferResults.filter(r => r.status !== 'success').length,
          completed_at: new Date().toISOString()
        })

      return new Response(JSON.stringify({ 
        success: true, 
        targetPlaylist,
        transferResults,
        summary: {
          total: sourceTracks.length,
          successful: transferResults.filter(r => r.status === 'success').length,
          failed: transferResults.filter(r => r.status !== 'success').length
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'sync_linked_playlists') {
      // Get all sync configurations for user
      const { data: syncConfigs } = await supabaseClient
        .from('sync_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const syncResults = []
      
      for (const config of syncConfigs || []) {
        try {
          // Get source playlist details
          const { data: sourcePlaylist } = await supabaseClient
            .from('playlists')
            .select('*')
            .eq('id', config.source_playlist_id)
            .single()

          if (!sourcePlaylist) continue

          // Get platform connections
          const { data: sourceConnection } = await supabaseClient
            .from('platform_connections')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', sourcePlaylist.platform)
            .eq('is_active', true)
            .single()

          const { data: targetConnection } = await supabaseClient
            .from('platform_connections')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', config.target_platform)
            .eq('is_active', true)
            .single()

          if (!sourceConnection || !targetConnection) continue

          // Get current tracks from source
          const currentTracks = await getPlaylistTracks(sourcePlaylist.platform, sourcePlaylist.platform_id, sourceConnection.access_token, sourceConnection.refresh_token)
          
          // Find target playlist
          const targetPlaylists = await getPlaylists(config.target_platform, targetConnection.access_token, targetConnection.refresh_token)
          const targetPlaylist = targetPlaylists.find(p => p.name === config.target_playlist_name)
          
          if (!targetPlaylist) continue

          // Get current tracks from target
          const targetTracks = await getPlaylistTracks(config.target_platform, targetPlaylist.id, targetConnection.access_token, targetConnection.refresh_token)
          
          // Find new tracks to add
          const newTracks = currentTracks.filter(sourceTrack => 
            !targetTracks.some(targetTrack => 
              targetTrack.name.toLowerCase() === sourceTrack.name.toLowerCase() &&
              targetTrack.artist.toLowerCase() === sourceTrack.artist.toLowerCase()
            )
          )

          let tracksAdded = 0
          for (const track of newTracks) {
            try {
              const foundTrack = await searchTrack(config.target_platform, track, targetConnection.access_token, targetConnection.refresh_token)
              if (foundTrack) {
                await addTrackToPlaylist(config.target_platform, targetPlaylist.id, foundTrack.id, targetConnection.access_token, targetConnection.refresh_token)
                tracksAdded++
              }
            } catch (error) {
              console.error('Error adding track:', error)
            }
          }

          // Update last sync time
          await supabaseClient
            .from('sync_configurations')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', config.id)

          // Log sync
          await supabaseClient
            .from('sync_history')
            .insert({
              user_id: user.id,
              sync_config_id: config.id,
              status: 'completed',
              tracks_added: tracksAdded,
              tracks_failed: newTracks.length - tracksAdded,
              completed_at: new Date().toISOString()
            })

          syncResults.push({
            configName: config.name,
            tracksAdded,
            newTracksFound: newTracks.length
          })

        } catch (error) {
          console.error('Error syncing config:', error)
          syncResults.push({
            configName: config.name,
            error: error.message
          })
        }
      }

      return new Response(JSON.stringify({ success: true, syncResults }), {
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

// Helper functions for each platform
async function getPlaylistTracks(platform: string, playlistId: string, accessToken: string, refreshToken?: string): Promise<Track[]> {
  switch (platform) {
    case 'spotify':
      return getSpotifyPlaylistTracks(playlistId, accessToken)
    case 'apple_music':
      return getAppleMusicPlaylistTracks(playlistId, accessToken, refreshToken!)
    case 'youtube_music':
      return getYouTubePlaylistTracks(playlistId, accessToken)
    case 'amazon_music':
      return getAmazonMusicPlaylistTracks(playlistId, accessToken)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

async function getPlaylists(platform: string, accessToken: string, refreshToken?: string) {
  switch (platform) {
    case 'spotify':
      const spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const spotifyData = await spotifyResponse.json()
      return spotifyData.items || []
    case 'apple_music':
      const appleResponse = await fetch('https://api.music.apple.com/v1/me/library/playlists', {
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Music-User-Token': accessToken
        }
      })
      const appleData = await appleResponse.json()
      return appleData.data || []
    case 'youtube_music':
      const youtubeResponse = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const youtubeData = await youtubeResponse.json()
      return youtubeData.items || []
    case 'amazon_music':
      const amazonResponse = await fetch('https://api.amazonmusic.com/v1/me/playlists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const amazonData = await amazonResponse.json()
      return amazonData.playlists || []
    default:
      return []
  }
}

async function createPlaylist(platform: string, name: string, description: string, accessToken: string, refreshToken?: string) {
  // Implementation for each platform
  switch (platform) {
    case 'spotify':
      const spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, public: false })
      })
      return await spotifyResponse.json()
    // Add other platforms...
    default:
      throw new Error(`Create playlist not implemented for ${platform}`)
  }
}

async function searchTrack(platform: string, track: Track, accessToken: string, refreshToken?: string) {
  const query = `${track.name} ${track.artist}`.replace(/[^\w\s]/g, '').trim()
  
  switch (platform) {
    case 'spotify':
      const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const spotifyData = await spotifyResponse.json()
      return spotifyData.tracks?.items?.[0]
    // Add other platforms...
    default:
      return null
  }
}

async function addTrackToPlaylist(platform: string, playlistId: string, trackId: string, accessToken: string, refreshToken?: string) {
  switch (platform) {
    case 'spotify':
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] })
      })
      break
    // Add other platforms...
    default:
      throw new Error(`Add track not implemented for ${platform}`)
  }
}

async function getSpotifyPlaylistTracks(playlistId: string, accessToken: string): Promise<Track[]> {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await response.json()
  
  return data.items?.map((item: any) => ({
    name: item.track.name,
    artist: item.track.artists[0].name,
    album: item.track.album.name,
    isrc: item.track.external_ids?.isrc,
    duration_ms: item.track.duration_ms
  })) || []
}

async function getAppleMusicPlaylistTracks(playlistId: string, userToken: string, developerToken: string): Promise<Track[]> {
  const response = await fetch(`https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks`, {
    headers: {
      'Authorization': `Bearer ${developerToken}`,
      'Music-User-Token': userToken
    }
  })
  const data = await response.json()
  
  return data.data?.map((item: any) => ({
    name: item.attributes.name,
    artist: item.attributes.artistName,
    album: item.attributes.albumName,
    isrc: item.attributes.isrc,
    duration_ms: item.attributes.durationInMillis
  })) || []
}

async function getYouTubePlaylistTracks(playlistId: string, accessToken: string): Promise<Track[]> {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await response.json()
  
  return data.items?.map((item: any) => {
    const title = item.snippet.title
    const [artist, name] = title.includes(' - ') ? title.split(' - ', 2) : ['Unknown', title]
    return {
      name: name.trim(),
      artist: artist.trim()
    }
  }) || []
}

async function getAmazonMusicPlaylistTracks(playlistId: string, accessToken: string): Promise<Track[]> {
  const response = await fetch(`https://api.amazonmusic.com/v1/playlists/${playlistId}/tracks`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await response.json()
  
  return data.tracks?.map((track: any) => ({
    name: track.title,
    artist: track.artist,
    album: track.album,
    duration_ms: track.duration * 1000
  })) || []
}