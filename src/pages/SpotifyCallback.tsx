import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        toast.error(`Spotify connection failed: ${error}`);
        navigate('/dashboard');
        return;
      }

      if (!code || !state || !user) {
        toast.error('Invalid callback parameters');
        navigate('/dashboard');
        return;
      }

      try {
        // Call the spotify-auth function to exchange code for tokens
        const { data, error: functionError } = await supabase.functions.invoke('spotify-auth', {
          body: {
            action: 'callback',
            code,
            state,
            redirectUri: `${window.location.origin}/auth/callback/spotify`
          }
        });

        if (functionError) {
          console.error('Spotify callback error:', functionError);
          toast.error('Failed to connect Spotify account');
        } else {
          toast.success('Spotify account connected successfully!');
        }
      } catch (error) {
        console.error('Error handling Spotify callback:', error);
        toast.error('Failed to connect Spotify account');
      }

      navigate('/dashboard');
    };

    handleSpotifyCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg">Connecting your Spotify account...</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;