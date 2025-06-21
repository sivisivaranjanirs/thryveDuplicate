import { useState, useEffect } from 'react';
import { supabase, HealthMetric } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useFriendHealthMetrics(friendId: string) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user } = useAuth();

  const fetchFriendMetrics = async () => {
    if (!user || !friendId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('=== Friend Health Metrics Debug ===');
      console.log('Current user:', user.id);
      console.log('Friend ID:', friendId);

      // Step 1: Debug reading access
      const { data: debugData, error: debugError } = await supabase
        .rpc('debug_reading_access', { owner_user_id: friendId });

      console.log('Debug reading access:', { debugData, debugError });
      setDebugInfo(debugData?.[0]);

      if (debugError) {
        throw new Error(`Debug check failed: ${debugError.message}`);
      }

      if (!debugData?.[0]?.can_access_metrics) {
        throw new Error('You do not have permission to view this user\'s health data');
      }

      // Step 2: Get metrics count first
      const { data: countData, error: countError } = await supabase
        .rpc('get_owner_metrics_count', { owner_user_id: friendId });

      console.log('Metrics count:', { countData, countError });

      if (countError) {
        throw new Error(`Count check failed: ${countError.message}`);
      }

      if (countData === -1) {
        throw new Error('Reading permission not found or not active');
      }

      console.log(`User has ${countData} health metrics`);

      // Step 3: Fetch the actual metrics
      console.log('Fetching health metrics...');
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', friendId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      console.log('Health metrics result:', { 
        success: !error, 
        count: data?.length || 0, 
        error: error?.message 
      });

      if (error) {
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      setMetrics(data || []);

    } catch (err) {
      console.error('Error in fetchFriendMetrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendMetrics();
  }, [user, friendId]);

  return {
    metrics,
    loading,
    error,
    debugInfo,
    refetch: fetchFriendMetrics,
  };
}