import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';

type AlertsContextValue = {
  alertsUnreadCount: number;
  setAlertsUnreadCount: (n: number | ((prev: number) => number)) => void;
  markAllAsRead: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alertsUnreadCount, setAlertsUnreadCount] = useState(0);

  // Fetch unread count on load
  useEffect(() => {
    fetchUnreadCount();
    subscribeToNotifications();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setAlertsUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Listen for new notifications in real-time
  const subscribeToNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        setAlertsUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setAlertsUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  return (
    <AlertsContext.Provider value={{
      alertsUnreadCount,
      setAlertsUnreadCount,
      markAllAsRead,
    }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider');
  return ctx;
}