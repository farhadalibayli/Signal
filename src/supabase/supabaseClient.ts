import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing. Check your .env file!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Explicitly using AsyncStorage for React Native persistence
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * HELPER: Request 6-digit code
 */
export const requestOtp = async (email: string) => {
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Creates account if it doesn't exist
    },
  });
};

/**
 * HELPER: Verify 6-digit code
 */
export const verifyOtp = async (email: string, token: string) => {
  return await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email', // This matches the "Magic Link" and "Signup" templates
  });
};

// Refresh management for mobile app lifecycle
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});