import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase/supabaseClient';
import type { SignalData } from '../types/signal';

type SignalsContextType = {
  signals: SignalData[];
  setSignals: React.Dispatch<React.SetStateAction<SignalData[]>>;
  addSignal: (newSignal: Partial<SignalData>) => Promise<void>;
  removeSignal: (id: string) => Promise<void>;
  toggleJoinSignal: (id: string) => Promise<void>;
  getSignalById: (id: string) => SignalData | undefined;
  fetchNearbySignals: (lat: number, lon: number, radius: number) => Promise<void>;
  loading: boolean;
  myActiveSignal: SignalData | undefined;
};

const SignalsContext = createContext<SignalsContextType | undefined>(undefined);

export function SignalsProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch nearby signals from Supabase
  const fetchNearbySignals = async (lat: number, lon: number, radius: number) => {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      console.warn('[SignalsContext] Invalid coordinates, skipping fetchNearbySignals', { lat, lon });
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setLoading(true);
    try {
      // 1. Fetch the signals
      const { data, error } = await supabase.rpc('get_nearby_signals', {
        lat,
        lon,
        radius: radius || 5000,
      });
      if (error) throw error;

      // 2. Fetch signals the user has joined (to set hasJoined)
      let joinedSignalIds: string[] = [];
      if (authUser) {
        const { data: joinedData } = await supabase
          .from('signal_answers')
          .select('signal_id')
          .eq('user_id', authUser.id);
        joinedSignalIds = (joinedData || []).map(j => j.signal_id);
      }

      // Map Supabase data to app's SignalData format
      const mapped: SignalData[] = (data || []).map((s: any) => {
        let latitude, longitude;
        if (s.location) {
          if (typeof s.location === 'object' && s.location.coordinates) {
            longitude = s.location.coordinates[0];
            latitude = s.location.coordinates[1];
          } else if (typeof s.location === 'string' && s.location.includes('POINT')) {
            const match = s.location.match(/POINT\((.+) (.+)\)/);
            if (match) {
              longitude = parseFloat(match[1]);
              latitude = parseFloat(match[2]);
            }
          }
        }

        return {
          id: s.id,
          user: {
            name: s.display_name,
            username: s.username,
            initials: s.display_name?.split(' ').map((n: string) => n[0]).join('') || '?',
            avatarColor: '#6C47FF',
            avatar: s.avatar_url,
            id: s.user_id,
          },
          type: s.type,
          typeColor: getTypeColor(s.type),
          text: s.message,
          minutesLeft: Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 60000)),
          respondedIn: 0, // Will be updated by real stats in detail view or a count query
          status: 'active',
          location: s.location ? {
            privacy: s.location_privacy || (longitude && latitude ? 'specific' : 'general'),
            label: s.location_name || '',
            latitude,
            longitude,
          } : undefined,
          createdAt: new Date(s.created_at).getTime(),
          isOwn: authUser?.id === s.user_id,
          hasJoined: joinedSignalIds.includes(s.id),
        };
      });

      setSignals(mapped);
    } catch (err) {
      console.error('Error fetching signals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time new signals
  useEffect(() => {
    const channel = supabase
      .channel('signals-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'signals',
      }, async (payload) => {
        const s = payload.new as any;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        setSignals(prev => {
          if (prev.some(existing => existing.id === s.id)) return prev;

          const newSignal: SignalData = {
            id: s.id,
            user: {
              name: '', 
              username: '',
              initials: '?',
              avatarColor: '#6C47FF',
              id: s.user_id,
            },
            type: s.type,
            typeColor: getTypeColor(s.type),
            text: s.message,
            minutesLeft: Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 60000)),
            respondedIn: 0,
            status: 'active',
            isOwn: authUser?.id === s.user_id,
            hasJoined: false,
          };
          return [newSignal, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'signals',
      }, (payload) => {
        setSignals(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addSignal = async (newSignal: Partial<SignalData>) => {
    if (newSignal.id) {
      setSignals(prev => {
        if (prev.find(s => s.id === newSignal.id)) return prev;
        return [{ ...newSignal, isOwn: true } as SignalData, ...prev];
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data, error } = await supabase.from('signals').insert({
        user_id: authUser.id,
        type: newSignal.type,
        message: newSignal.text,
        expires_at: new Date(Date.now() + (newSignal.minutesLeft || 60) * 60000).toISOString(),
        audience_type: 'everyone',
      }).select().single();

      if (error) throw error;
      
      if (data) {
        const addedSignal: SignalData = {
          id: data.id,
          user: {
            name: '', 
            username: '',
            initials: '?',
            avatarColor: '#6C47FF',
            id: authUser.id,
          },
          type: data.type,
          typeColor: getTypeColor(data.type),
          text: data.message,
          minutesLeft: Math.max(0, Math.round((new Date(data.expires_at).getTime() - Date.now()) / 60000)),
          respondedIn: 0,
          status: 'active',
          createdAt: new Date(data.created_at).getTime(),
          isOwn: true,
          hasJoined: false,
        };
        setSignals(prev => [addedSignal, ...prev]);
      }
    } catch (err) {
      console.error('Error adding signal:', err);
    }
  };

  // Remove a signal
  const removeSignal = async (id: string) => {
    try {
      const { error } = await supabase.from('signals').delete().eq('id', id);
      if (error) throw error;
      setSignals(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing signal:', err);
    }
  };

  // Join/unjoin a signal
  const toggleJoinSignal = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const signal = signals.find(s => s.id === id);
      if (!signal) return;

      if (signal.hasJoined) {
        await supabase.from('signal_answers')
          .delete()
          .eq('signal_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('signal_answers').insert({
          signal_id: id,
          user_id: user.id,
        });
      }

      setSignals(prev => prev.map(s => {
        if (s.id === id) {
          const isJoined = !s.hasJoined;
          return {
            ...s,
            hasJoined: isJoined,
            respondedIn: Math.max(0, s.respondedIn + (isJoined ? 1 : -1)),
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('Error toggling join:', err);
    }
  };

  const getSignalById = (id: string) => signals.find(s => s.id === id);
  const myActiveSignal = React.useMemo(() => signals.find(s => s.isOwn), [signals]);

  return (
    <SignalsContext.Provider value={{
      signals,
      setSignals,
      addSignal,
      removeSignal,
      toggleJoinSignal,
      getSignalById,
      fetchNearbySignals,
      loading,
      myActiveSignal,
    }}>
      {children}
    </SignalsContext.Provider>
  );
}

export function useSignals() {
  const context = useContext(SignalsContext);
  if (context === undefined) {
    throw new Error('useSignals must be used within a SignalsProvider');
  }
  return context;
}

// Helper: map signal type to color
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    FILM: '#6C47FF',
    CAFE: '#D97706',
    RUN: '#16A34A',
    FOOD: '#DC2626',
    GAMES: '#2563EB',
    STUDY: '#F59E0B',
    MUSIC: '#8B5CF6',
    WALK: '#06B6D4',
    CUSTOM: '#9B7FFF',
  };
  return colors[type] || '#6C47FF';
}