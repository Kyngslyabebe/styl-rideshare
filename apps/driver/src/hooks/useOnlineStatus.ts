import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export function useOnlineStatus() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restore online status from DB on app start
  useEffect(() => {
    if (!user) return;
    supabase.from('drivers').select('is_online').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.is_online) setIsOnline(true);
      });
  }, [user]);

  const toggleOnline = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const newStatus = !isOnline;

    try {
      // Check suspended/unapproved before going online
      if (newStatus) {
        const { data: driver } = await supabase
          .from('drivers')
          .select('is_suspended, is_approved')
          .eq('id', user.id)
          .single();

        if (driver?.is_suspended) {
          Alert.alert(
            'Account Suspended',
            'Your account has been suspended. Please contact support for more information.'
          );
          setLoading(false);
          return;
        }

        if (!driver?.is_approved) {
          Alert.alert(
            'Account Not Approved',
            'Your account has not been approved yet. Please wait for admin review.'
          );
          setLoading(false);
          return;
        }
      }

      // Update driver record
      await supabase
        .from('drivers')
        .update({ is_online: newStatus })
        .eq('id', user.id);

      // Upsert driver location entry
      if (newStatus) {
        await supabase.from('driver_locations').upsert({
          driver_id: user.id,
          lat: 0,
          lng: 0,
          is_online: true,
          updated_at: new Date().toISOString(),
        });
      } else {
        await supabase
          .from('driver_locations')
          .update({ is_online: false })
          .eq('driver_id', user.id);
      }

      setIsOnline(newStatus);
    } catch (err) {
      console.error('Failed to toggle online status:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  return { isOnline, toggleOnline, loading };
}
