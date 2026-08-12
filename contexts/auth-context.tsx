"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { fetchClientIp } from "@/lib/client-ip";
import { useRouter } from "next/navigation";

export interface UserData {
  uid: string;
  email: string;
  username: string;
  photoURL: string | null;
  points: number;
  fragments: number;
  level: number;
  totalEarned: number;
  referredBy: string | null;
  referralCode: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginIp?: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, username: string, photoURL?: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (username: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  updateUserAvatar: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        setUserData(null);
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          setUserData(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchUserData = async (authUser: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', authUser.id)
      .single();

    if (data) {
      const userDataObj: UserData = {
        uid: authUser.id,
        email: data.email,
        username: data.username,
        photoURL: data.photoURL || authUser.user_metadata?.avatar_url || null,
        points: data.points || 0,
        fragments: data.fragments || 0,
        level: data.level || 1,
        totalEarned: data.totalEarned || 0,
        referredBy: data.referredBy || null,
        referralCode: data.referralCode,
        isAdmin: data.isAdmin || false,
        isBanned: data.isBanned || false,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        twoFactorEnabled: data.twoFactorEnabled || false,
        twoFactorSecret: data.twoFactorSecret || undefined,
        lastLoginIp: data.lastLoginIp || null,
      };
      setUserData(userDataObj);

      if (userDataObj.isBanned) {
        router.push("/banned");
      }
    }
    setLoading(false);
  };

  // Fetch the current device IP and persist it to the user document.
  const recordLoginIp = async (uid: string) => {
    try {
      const ip = await fetchClientIp();
      await supabase
        .from('users')
        .update({ lastLoginIp: ip, lastLoginAt: new Date().toISOString() })
        .eq('uid', uid);
    } catch (err) {
      console.log("[v0] recordLoginIp failed:", err);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await recordLoginIp(data.user.id);
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const register = async (email: string, password: string, username: string, photoURL?: string, referralCode?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: photoURL || null,
        }
      }
    });
    
    if (error) throw error;
    
    const authUser = data.user;
    if (authUser) {
      let referredBy: string | null = null;
      if (referralCode) {
        const { data: referrerData } = await supabase
          .from('users')
          .select('uid')
          .eq('uid', referralCode)
          .single();
        if (referrerData) {
          referredBy = referralCode;
        }
      }

      await supabase.from('users').insert([{
        uid: authUser.id,
        email: email,
        username: username,
        photoURL: photoURL || null,
        points: 0,
        fragments: 0,
        level: 1,
        totalEarned: 0,
        referredBy: referredBy,
        referralCode: authUser.id,
        isAdmin: false,
        isBanned: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      }]);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updateUserProfile = async (username: string) => {
    if (!user) throw new Error("No user logged in");
    const ip = await fetchClientIp();
    
    await supabase.auth.updateUser({
      data: { username }
    });
    
    await supabase.from('users').update({ 
      username, 
      lastLoginIp: ip 
    }).eq('uid', user.id);
    
    setUserData(prev => prev ? { ...prev, username } : null);
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!user) throw new Error("No user logged in");
    const ip = await fetchClientIp();
    
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    
    await supabase.from('users').update({ 
      email: newEmail, 
      lastLoginIp: ip 
    }).eq('uid', user.id);
    
    setUserData(prev => prev ? { ...prev, email: newEmail } : null);
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!user) throw new Error("No user logged in");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const updateUserAvatar = async (photoURL: string) => {
    if (!user) throw new Error("No user logged in");
    
    await supabase.auth.updateUser({
      data: { avatar_url: photoURL }
    });
    
    await supabase.from('users').update({ photoURL }).eq('uid', user.id);
    
    setUserData(prev => prev ? { ...prev, photoURL } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        resetPassword,
        updateUserProfile,
        updateUserEmail,
        updateUserPassword,
        updateUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
