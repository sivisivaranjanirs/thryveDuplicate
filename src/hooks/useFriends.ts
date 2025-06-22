import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, FriendNotification } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ReadingPermission {
  id: string;
  viewer_id: string;
  owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  owner_name?: string;
  viewer_email?: string;
  viewer_name?: string;
}

interface ReadingRequest {
  id: string;
  requester_id: string;
  owner_id: string;
  status: string;
  message?: string;
  created_at: string;
  updated_at: string;
  requester_email?: string;
  owner_email?: string;
  requester_name?: string;
  owner_name?: string;
}

export function useFriends() {
  const [friends, setFriends] = useState<ReadingPermission[]>([]);
  const [myViewers, setMyViewers] = useState<ReadingPermission[]>([]);
  const [friendRequests, setFriendRequests] = useState<ReadingRequest[]>([]);
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Store active channels to manage their lifecycle
  const activeChannels = useRef<RealtimeChannel[]>([]);

  // Memoize fetch functions to provide stable references
  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching reading permissions for user:', user.id);
      const { data, error } = await supabase
        .from('reading_permissions')
        .select(`
          *,
          owner_profile:user_profiles!reading_permissions_owner_id_profile_fkey(id, email, full_name)
        `)
        .eq('viewer_id', user.id)
        .eq('status', 'active');

      console.log('Reading permissions query result:', { data, error });

      if (error) throw error;
      
      const permissionsWithInfo = data?.map(permission => ({
        ...permission,
        owner_email: permission.owner_profile?.email || null,
        owner_name: permission.owner_profile?.full_name || null
      })) || [];
      
      console.log('Processed permissions with info:', permissionsWithInfo);
      setFriends(permissionsWithInfo);
    } catch (err) {
      console.error('Error fetching reading permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reading permissions');
    }
  }, [user]);

  const fetchFriendRequests = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching reading requests for user:', user.id);
      const { data, error } = await supabase
        .from('reading_requests')
        .select(`
          *,
          requester_profile:user_profiles!reading_requests_requester_id_profile_fkey(id, email, full_name),
          owner_profile:user_profiles!reading_requests_owner_id_profile_fkey(id, email, full_name)
        `)
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('Reading requests query result:', { data, error });
      if (error) throw error;
      
      const requestsWithInfo = data?.map(request => ({
        ...request,
        requester_email: request.requester_profile?.email || null,
        owner_email: request.owner_profile?.email || null,
        requester_name: request.requester_profile?.full_name || null,
        owner_name: request.owner_profile?.full_name || null
      })) || [];
      
      console.log('Processed requests with info:', requestsWithInfo);
      setFriendRequests(requestsWithInfo);
    } catch (err) {
      console.error('Error fetching reading requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reading requests');
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching notifications for user:', user.id);
      const { data, error } = await supabase
        .from('friend_notifications')
        .select(`
          *,
          friend:user_profiles(email, full_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Notifications query result:', { data, error });
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    }
  }, [user]);

  const fetchMyViewers = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching my viewers for user:', user.id);
      const { data, error } = await supabase
        .from('reading_permissions')
        .select(`
          *,
          viewer:user_profiles!reading_permissions_viewer_id_profile_fkey(id, email, full_name)
        `)
        .eq('owner_id', user.id)
        .eq('status', 'active');

      console.log('My viewers query result:', { data, error });
      if (error) throw error;
      
      const viewersWithInfo = data?.map(permission => ({
        ...permission,
        viewer_email: permission.viewer?.email || null,
        viewer_name: permission.viewer?.full_name || null
      })) || [];
      
      console.log('Processed viewers with info:', viewersWithInfo);
      setMyViewers(viewersWithInfo);
    } catch (err) {
      console.error('Error fetching my viewers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch viewers');
    }
  }, [user]);

  // Send reading request by email
  const sendReadingRequest = async (email: string, message?: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Use RPC function to find user by email (bypasses RLS)
      const { data: targetUsers, error: userError } = await supabase
        .rpc('get_user_id_by_email', { search_email: email.toLowerCase() });

      if (userError) {
        console.error('Error searching for user:', userError);
        return { error: 'Error searching for user. Please try again.' };
      }

      if (!targetUsers || targetUsers.length === 0) {
        return { error: 'User not found with that email address or does not have a public profile' };
      }

      const targetUser = targetUsers[0];

      if (targetUser.user_id === user.id) {
        return { error: 'You cannot send a reading request to yourself' };
      }

      // Check if permission already exists
      const { data: existingPermission } = await supabase
        .from('reading_permissions')
        .select('id')
        .eq('viewer_id', user.id)
        .eq('owner_id', targetUser.user_id)
        .limit(1);

      if (existingPermission && existingPermission.length > 0) {
        return { error: 'You already have permission to view this user\'s readings' };
      }

      // Check if there's already any request (regardless of status)
      const { data: existingRequest } = await supabase
        .from('reading_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('owner_id', targetUser.user_id)
        .limit(1);

      if (existingRequest && existingRequest.length > 0) {
        return { error: 'A reading request already exists for this user' };
      }

      // Send the reading request
      const { data, error } = await supabase
        .from('reading_requests')
        .insert([{
          requester_id: user.id,
          owner_id: targetUser.user_id,
          message: message || undefined
        }])
        .select()
        .single();

      if (error) throw error;

      // Create notification for the receiver using edge function
      try {
        const notificationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-friend-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: targetUser.user_id,
            friend_id: user.id,
            notification_type: 'friend_request',
            title: 'New Reading Request',
            message: `You have a new reading request from ${user.email}`
          })
        });

        if (!notificationResponse.ok) {
          console.warn('Failed to send notification, but reading request was created');
        }
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
      }

      await fetchFriendRequests();
      
      // Trigger queue processing for push notifications
      try {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-notification-queue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batch_size: 5 })
        }).catch(error => {
          console.warn('Failed to trigger notification queue processing:', error);
        });
      } catch (error) {
        console.warn('Failed to trigger notification queue processing:', error);
      }
      
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to send reading request';
      return { data: null, error };
    }
  };

  // Accept reading request
  const acceptReadingRequest = async (requestId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('reading_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Send notification to the requester that their request was accepted
      try {
        const notificationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-friend-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: data.requester_id,
            friend_id: user.id,
            notification_type: 'reading_accepted',
            title: 'Reading Request Accepted',
            message: `${user.email} has accepted your reading request`
          })
        });
      } catch (notificationError) {
        console.warn('Failed to send acceptance notification:', notificationError);
      }

      // Force refresh all data after accepting a request
      setTimeout(async () => {
        await Promise.all([
          fetchFriends(),
          fetchFriendRequests(),
          fetchNotifications(),
          fetchMyViewers()
        ]);
        
        // Trigger queue processing for push notifications
        try {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-notification-queue`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batch_size: 5 })
          }).catch(error => {
            console.warn('Failed to trigger notification queue processing:', error);
          });
        } catch (error) {
          console.warn('Failed to trigger notification queue processing:', error);
        }
      }, 1000); // Small delay to ensure database triggers have completed

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to accept reading request';
      return { data: null, error };
    }
  };

  // Decline reading request
  const declineReadingRequest = async (requestId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('reading_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await fetchFriendRequests();
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to decline reading request';
      return { data: null, error };
    }
  };

  // Revoke reading permission
  const revokeReadingPermission = async (viewerId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Remove the permission
      await supabase
        .from('reading_permissions')
        .delete()
        .eq('viewer_id', viewerId)
        .eq('owner_id', user.id);

      await fetchFriends();
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to revoke reading permission';
      return { error };
    }
  };

  // Remove access (for users who have granted access to others)
  const removeAccess = async (viewerId: string, viewerName: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Remove the permission
      const { error } = await supabase
        .from('reading_permissions')
        .delete()
        .eq('viewer_id', viewerId)
        .eq('owner_id', user.id);

      if (error) throw error;

      // Also remove the corresponding reading request to allow future requests
      await supabase
        .from('reading_requests')
        .delete()
        .eq('requester_id', viewerId)
        .eq('owner_id', user.id);

      // Refresh the data
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(), 
        fetchNotifications(),
        fetchMyViewers()
      ]);

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to remove access';
      return { error };
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('friend_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to mark notification as read';
      return { error };
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('friend_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      return { error };
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchNotifications(),
        fetchMyViewers()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchFriends, fetchFriendRequests, fetchNotifications, fetchMyViewers]);

  // Set up real-time subscriptions with proper cleanup
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    // Clean up any existing channels first
    activeChannels.current.forEach(channel => {
      try {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error cleaning up channel:', error);
      }
    });
    activeChannels.current = [];

    try {
      // Create unique channel names with user ID to avoid conflicts
      const myAccessChannel = supabase
        .channel(`reading_permissions_viewer_${user.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'reading_permissions',
            filter: `viewer_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('My access permissions changed:', payload);
            fetchFriends();
          }
        );

      const myViewersChannel = supabase
        .channel(`reading_permissions_owner_${user.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'reading_permissions',
            filter: `owner_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('My viewers permissions changed:', payload);
            fetchMyViewers();
          }
        );

      const readingRequestsChannel = supabase
        .channel(`reading_requests_requester_${user.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'reading_requests',
            filter: `requester_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Reading requests changed (as requester):', payload);
            fetchFriendRequests();
          }
        );

      const receivedRequestsChannel = supabase
        .channel(`reading_requests_owner_${user.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'reading_requests',
            filter: `owner_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Reading requests changed (as owner):', payload);
            fetchFriendRequests();
          }
        );

      const notificationsChannel = supabase
        .channel(`notifications_${user.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'friend_notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('New notification:', payload);
            fetchNotifications();
          }
        );

      // Store all channels for cleanup
      activeChannels.current = [
        myAccessChannel,
        myViewersChannel,
        readingRequestsChannel,
        receivedRequestsChannel,
        notificationsChannel
      ];

      // Subscribe to all channels after storing them
      activeChannels.current.forEach(channel => {
        try {
          channel.subscribe();
        } catch (error) {
          console.error('Error subscribing to channel:', error);
        }
      });

      console.log('Created channels:', activeChannels.current.length);

    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up channels on unmount:', activeChannels.current.length);
      activeChannels.current.forEach(channel => {
        try {
          channel.unsubscribe();
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error cleaning up channel on unmount:', error);
        }
      });
      activeChannels.current = [];
    };
  }, [user, fetchFriends, fetchFriendRequests, fetchNotifications, fetchMyViewers]);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return {
    friends,
    myViewers,
    friendRequests,
    notifications,
    unreadNotificationsCount,
    loading,
    error,
    sendReadingRequest,
    acceptReadingRequest,
    declineReadingRequest,
    revokeReadingPermission,
    removeAccess,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refetch: () => Promise.all([fetchFriends(), fetchFriendRequests(), fetchNotifications(), fetchMyViewers()])
  };
}