import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Play, Pause, Trash2, Clock } from 'lucide-react';

interface SyncConfig {
  id: string;
  name: string;
  source_playlist_id: string;
  target_platform: string;
  target_playlist_name: string;
  is_active: boolean;
  sync_frequency: string;
  last_sync_at: string | null;
  created_at: string;
  playlists: {
    name: string;
    platform: string;
  };
}

export function SyncConfigurations() {
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConfigs();
    }
  }, [user]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_configurations')
        .select(`
          *,
          playlists (
            name,
            platform
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching sync configurations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleConfig = async (configId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sync_configurations')
        .update({ is_active: !isActive })
        .eq('id', configId);

      if (error) throw error;

      setConfigs(configs.map(config => 
        config.id === configId ? { ...config, is_active: !isActive } : config
      ));

      toast({
        title: isActive ? "Sync paused" : "Sync activated",
        description: `Sync configuration has been ${isActive ? 'paused' : 'activated'}`
      });
    } catch (error: any) {
      toast({
        title: "Error updating sync configuration",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('sync_configurations')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      setConfigs(configs.filter(config => config.id !== configId));
      toast({
        title: "Sync configuration deleted",
        description: "The sync configuration has been removed"
      });
    } catch (error: any) {
      toast({
        title: "Error deleting sync configuration",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const triggerManualSync = async (configId: string) => {
    try {
      const response = await supabase.functions.invoke('sync-playlists', {
        body: { syncConfigId: configId }
      });

      if (response.error) throw response.error;

      toast({
        title: "Sync started",
        description: "Manual sync has been triggered. Check the history tab for updates."
      });
    } catch (error: any) {
      toast({
        title: "Error starting sync",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-muted rounded-lg"></div>
      ))}
    </div>;
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No sync configurations yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first sync configuration to start syncing playlists between platforms.
        </p>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Sync Configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Your Sync Configurations</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Configuration
        </Button>
      </div>

      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={config.is_active ? "default" : "secondary"}>
                      {config.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline">
                      {config.sync_frequency}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleConfig(config.id, config.is_active)}
                  >
                    {config.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerManualSync(config.id)}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteConfig(config.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Source:</span>
                  <span>{config.playlists?.name} ({config.playlists?.platform})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span>{config.target_playlist_name} ({config.target_platform})</span>
                </div>
                {config.last_sync_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last sync:</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(config.last_sync_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}