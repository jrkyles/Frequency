import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Plus, Settings, History, LogOut } from 'lucide-react';
import { PlatformConnections } from '@/components/PlatformConnections';
import { SyncConfigurations } from '@/components/SyncConfigurations';
import { SyncHistory } from '@/components/SyncHistory';
import { PlaylistTransfer } from '@/components/PlaylistTransfer';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Song Shifter
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.user_metadata?.full_name || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your streaming platform connections and playlist syncing configurations.
          </p>
        </div>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="syncs" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Sync Configs
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Connections</CardTitle>
                <CardDescription>
                  Connect your streaming platforms to enable playlist syncing between them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlatformConnections />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Playlist Transfer</CardTitle>
                <CardDescription>
                  Transfer playlists between platforms and sync linked playlists.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlaylistTransfer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="syncs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Configurations</CardTitle>
                <CardDescription>
                  Set up automatic syncing between your playlists across different platforms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SyncConfigurations />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>
                  View the history of your playlist syncing activities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SyncHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}