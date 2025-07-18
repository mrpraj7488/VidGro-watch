import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getUserProfile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';

interface Profile {
  id: string;
  email: string;
  username: string;
  coins: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
          // Navigate to main app after successful authentication
          if (event === 'SIGNED_IN') {
            router.replace('/(tabs)');
          }
        } else {
          setProfile(null);
          // Navigate to login when signed out
          if (event === 'SIGNED_OUT') {
            router.replace('/(auth)/login');
          }
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const loadProfile = async (userId: string) => {
    try {
      const profileData = await getUserProfile(userId);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}