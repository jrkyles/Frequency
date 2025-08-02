import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Music, Check, X, ExternalLink } from 'lucide-react';

interface PlatformConnection {
  id: string;
  platform: string;
  is_active: boolean;
  created_at: string;
}

const platforms = [
  { 
    id: 'spotify', 
    name: 'Spotify', 
    color: 'bg-green-500',
    description: 'Connect your Spotify account to sync playlists'
  },
  { 
    id: 'apple_music', 
    name: 'Apple Music', 
    color: 'bg-red-500',
    description: 'Connect your Apple Music account (coming soon)'
  },
  { 
    id: 'youtube_music', 
    name: 'YouTube Music', 
    color: 'bg-red-600',
    description: 'Connect your YouTube Music account (coming soon)'
  },
  { 
    id: 'amazon_music', 
    name: 'Amazon Music', 
    color: 'bg-blue-500',
    description: 'Connect your Amazon Music account (coming soon)'
  }
];

export function PlatformConnections() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching connections",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const connectSpotify = async () => {
    try {
      // Initiate Spotify OAuth flow
      const response = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'connect' }
      });

      if (response.error) throw response.error;

      // Redirect to Spotify authorization
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      toast({
        title: "Error connecting to Spotify",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const disconnectPlatform = async (connectionId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(connections.filter(conn => conn.id !== connectionId));
      toast({
        title: "Platform disconnected",
        description: `Successfully disconnected from ${platform}`
      });
    } catch (error: any) {
      toast({
        title: "Error disconnecting platform",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const isConnected = (platformId: string) => {
    return connections.some(conn => conn.platform === platformId && conn.is_active);
  };

  const getConnection = (platformId: string) => {
    return connections.find(conn => conn.platform === platformId && conn.is_active);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-muted rounded-lg"></div>
      ))}
    </div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {platforms.map((platform) => {
        const connected = isConnected(platform.id);
        const connection = getConnection(platform.id);

        return (
          <Card key={platform.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${platform.color}`}></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center`}>
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {connected ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <X className="w-3 h-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription>{platform.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                {connected && connection ? (
                  <div className="text-sm text-muted-foreground">
                    Connected on {new Date(connection.created_at).toLocaleDateString()}
                  </div>
                ) : (
                  <div></div>
                )}
                
                {platform.id === 'spotify' ? (
                  connected ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => connection && disconnectPlatform(connection.id, platform.name)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={connectSpotify}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  )
                ) : (
                  <Button size="sm" disabled variant="outline">
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}