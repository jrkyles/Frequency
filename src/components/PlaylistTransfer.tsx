import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Music, Copy, RefreshCw, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Playlist {
  id: string;
  name: string;
  platform: string;
  track_count: number;
}

interface PlatformConnection {
  id: string;
  platform: string;
  is_active: boolean;
}

export function PlaylistTransfer() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchPlaylists();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching connections",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching playlists",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTransfer = async () => {
    if (!selectedSource || !selectedTarget || !selectedPlaylist || !newPlaylistName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (selectedSource === selectedTarget) {
      toast({
        title: "Invalid selection",
        description: "Source and target platforms must be different",
        variant: "destructive"
      });
      return;
    }

    setTransferring(true);
    try {
      const response = await supabase.functions.invoke('playlist-transfer', {
        body: {
          action: 'transfer_playlist',
          sourcePlaylistId: selectedPlaylist,
          sourcePlatform: selectedSource,
          targetPlatform: selectedTarget,
          playlistName: newPlaylistName,
          playlistDescription: newPlaylistDescription
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      toast({
        title: "Transfer completed!",
        description: `Successfully transferred ${result.summary.successful}/${result.summary.total} tracks to ${selectedTarget}`,
      });

      // Reset form
      setSelectedPlaylist('');
      setNewPlaylistName('');
      setNewPlaylistDescription('');

    } catch (error: any) {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleSyncLinkedPlaylists = async () => {
    setSyncing(true);
    try {
      const response = await supabase.functions.invoke('playlist-transfer', {
        body: { action: 'sync_linked_playlists' }
      });

      if (response.error) throw response.error;

      const result = response.data;
      const totalAdded = result.syncResults.reduce((sum: number, r: any) => sum + (r.tracksAdded || 0), 0);
      
      toast({
        title: "Sync completed!",
        description: `Added ${totalAdded} new tracks across all linked playlists`,
      });

    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const connectedPlatforms = connections.map(c => c.platform);
  const sourcePlaylistsForPlatform = playlists.filter(p => p.platform === selectedSource);

  return (
    <div className="space-y-6">
      {/* Playlist Transfer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Transfer Playlist
          </CardTitle>
          <CardDescription>
            Copy a playlist from one streaming platform to another
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Platform</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source platform" />
                </SelectTrigger>
                <SelectContent>
                  {connectedPlatforms.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Platform</Label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target platform" />
                </SelectTrigger>
                <SelectContent>
                  {connectedPlatforms.filter(p => p !== selectedSource).map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedSource && (
            <div className="space-y-2">
              <Label>Source Playlist</Label>
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select playlist to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {sourcePlaylistsForPlatform.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{playlist.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {playlist.track_count} tracks
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Playlist Name</Label>
              <Input
                placeholder="Enter playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Enter playlist description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {selectedSource ? selectedSource.replace('_', ' ').toUpperCase() : 'Source'}
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <div className="text-center">
                <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {selectedTarget ? selectedTarget.replace('_', ' ').toUpperCase() : 'Target'}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleTransfer}
            disabled={transferring || !selectedSource || !selectedTarget || !selectedPlaylist || !newPlaylistName}
            className="w-full"
          >
            {transferring ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Transfer Playlist
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Linked Playlists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Sync Linked Playlists
          </CardTitle>
          <CardDescription>
            Update all your linked playlists with newly added songs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              This will check all your sync configurations and add any new tracks found in source playlists to their linked target playlists.
            </p>
            <Button
              onClick={handleSyncLinkedPlaylists}
              disabled={syncing}
              variant="outline"
              className="w-full md:w-auto"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync All Linked Playlists
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}