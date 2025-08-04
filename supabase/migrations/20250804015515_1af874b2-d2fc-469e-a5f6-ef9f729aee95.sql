-- Create platform_connections table to store user connections to music platforms
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_configurations table for linked playlists
CREATE TABLE IF NOT EXISTS public.sync_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_platform TEXT NOT NULL,
  source_playlist_id TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  target_playlist_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_history table to track sync operations
CREATE TABLE IF NOT EXISTS public.sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_platform TEXT NOT NULL,
  source_playlist_id TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  target_playlist_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'transfer' or 'sync'
  tracks_added INTEGER DEFAULT 0,
  tracks_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for platform_connections
CREATE POLICY "Users can view their own platform connections"
ON public.platform_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own platform connections"
ON public.platform_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platform connections"
ON public.platform_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own platform connections"
ON public.platform_connections FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for sync_configurations
CREATE POLICY "Users can view their own sync configurations"
ON public.sync_configurations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync configurations"
ON public.sync_configurations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync configurations"
ON public.sync_configurations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync configurations"
ON public.sync_configurations FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for sync_history
CREATE POLICY "Users can view their own sync history"
ON public.sync_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync history"
ON public.sync_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_configurations_updated_at
  BEFORE UPDATE ON public.sync_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();