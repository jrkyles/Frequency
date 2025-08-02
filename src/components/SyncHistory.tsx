import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface SyncHistoryItem {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tracks_added: number;
  tracks_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  sync_configurations: {
    name: string;
  };
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-500',
    variant: 'secondary' as const,
    label: 'Pending'
  },
  in_progress: {
    icon: Clock,
    color: 'bg-blue-500',
    variant: 'default' as const,
    label: 'In Progress'
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-500',
    variant: 'default' as const,
    label: 'Completed'
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-500',
    variant: 'destructive' as const,
    label: 'Failed'
  }
};

export function SyncHistory() {
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_history')
        .select(`
          *,
          sync_configurations (
            name
          )
        `)
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching sync history",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-24 bg-muted rounded-lg"></div>
      ))}
    </div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No sync history yet</h3>
        <p className="text-muted-foreground">
          Your playlist sync history will appear here once you start syncing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Sync Activity</h3>
      
      <div className="space-y-3">
        {history.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          
          return (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.sync_configurations?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Started {new Date(item.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={config.variant}>
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tracks added:</span>
                    <span className="ml-2 font-medium">{item.tracks_added}</span>
                  </div>
                  {item.tracks_failed > 0 && (
                    <div>
                      <span className="text-muted-foreground">Tracks failed:</span>
                      <span className="ml-2 font-medium text-destructive">{item.tracks_failed}</span>
                    </div>
                  )}
                  {item.completed_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-medium">{new Date(item.completed_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {item.error_message && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Error Details</span>
                    </div>
                    <p className="text-sm text-destructive mt-1">{item.error_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}