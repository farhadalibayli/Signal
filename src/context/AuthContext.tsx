import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabaseClient';

type UserSession = {
  id: string;
  name: string;
  username: string;
  bio?: string;
  avatarColor?: string;
  initials?: string;
  avatar?: string;
  token: string;
};

const USER_STORAGE_KEY = '@signal_user';

function buildUserSession(authUser: User, session: Session | null, cached: UserSession | null): UserSession {
  const metadata = (authUser.user_metadata ?? {}) as Record<string, any>;
  const usernameFromEmail = authUser.email?.split('@')?.[0] ?? '';

  return {
    id: authUser.id,
    name: metadata.name ?? metadata.full_name ?? cached?.name ?? '',
    username: metadata.username ?? cached?.username ?? usernameFromEmail,
    bio: metadata.bio ?? cached?.bio,
    avatarColor: metadata.avatarColor ?? cached?.avatarColor,
    initials: metadata.initials ?? cached?.initials,
    avatar: metadata.avatar ?? metadata.avatar_url ?? cached?.avatar,
    token: session?.access_token ?? cached?.token ?? '',
  };
}

async function getStoredUser(): Promise<UserSession | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch (e) {
    console.error('Failed to read cached auth user', e);
    return null;
  }
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<UserSession>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncUserFromSession = async (session: Session | null) => {
      if (!mounted) return;

      try {
        if (!session?.user) {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          setUser(null);
          return;
        }

        const cachedUser = await getStoredUser();
        const mergedUser = buildUserSession(session.user, session, cachedUser);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
        setUser(mergedUser);
      } catch (e) {
        console.error('Failed to sync auth state', e);
      }
    };

    const bootstrapAsync = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to read Supabase session', error);
        }
        await syncUserFromSession(data.session);
      } catch (e) {
        console.error('Failed to restore session', e);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserFromSession(session);
      if (mounted) {
        setIsLoading(false);
      }
    });

    void bootstrapAsync();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (_userData: UserSession) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.user) throw new Error('No active Supabase session');

      const cachedUser = await getStoredUser();
      const mergedUser = buildUserSession(data.session.user, data.session, cachedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
      setUser(mergedUser);
    } catch (e) {
      console.error('Failed to sync session after login', e);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign-out failed', error);
      }
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    } catch (e) {
      console.error('Failed to sign out', e);
    }
  };

  const updateUser = async (data: Partial<UserSession>) => {
    if (!user) return;
    try {
      const metadataUpdate: Record<string, any> = {};
      if (data.name !== undefined) metadataUpdate.name = data.name;
      if (data.username !== undefined) metadataUpdate.username = data.username;
      if (data.bio !== undefined) metadataUpdate.bio = data.bio;
      if (data.avatarColor !== undefined) metadataUpdate.avatarColor = data.avatarColor;
      if (data.initials !== undefined) metadataUpdate.initials = data.initials;
      if (data.avatar !== undefined) metadataUpdate.avatar_url = data.avatar;

      if (Object.keys(metadataUpdate).length > 0) {
        const { error } = await supabase.auth.updateUser({ data: metadataUpdate });
        if (error) {
          console.error('Failed to update Supabase user metadata', error);
        }
      }

      const updated = { ...user, ...data };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
    } catch (e) {
      console.error('Failed to update user', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
