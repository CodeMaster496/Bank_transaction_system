import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types/banking.ts';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  activeDemoUid: string;
  isFirebaseUser: boolean;
  signInWithGoogle: () => Promise<void>;
  switchDemoUser: (uid: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const DEMO_PROFILES = [
  {
    uid: 'demo-user-elena',
    fullName: 'Elena Rostova',
    email: 'elena.rostova@apexvault.io',
    accountNumber: 'APX-7829-1044',
    badge: 'Premier Client',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    uid: 'demo-user-marcus',
    fullName: 'Marcus Vance',
    email: 'marcus.vance@apexvault.io',
    accountNumber: 'APX-4912-3810',
    badge: 'Business Checking',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  },
  {
    uid: 'demo-user-sophia',
    fullName: 'Sophia Lin',
    email: 'sophia.lin@apexvault.io',
    accountNumber: 'APX-6103-9255',
    badge: 'Private Wealth',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDemoUid, setActiveDemoUid] = useState<string>(() => {
    return localStorage.getItem('apexvault-active-demo') || 'demo-user-elena';
  });
  const [token, setToken] = useState<string | null>(null);
  const [isFirebaseUser, setIsFirebaseUser] = useState(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['x-demo-user-id'] = activeDemoUid;
    }
    return headers;
  }, [token, activeDemoUid]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          setIsFirebaseUser(true);
        } catch (e) {
          console.error('Firebase token error:', e);
        }
      } else {
        setToken(null);
        setIsFirebaseUser(false);
      }
      fetchProfile();
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!token) {
      fetchProfile();
    }
  }, [activeDemoUid, token, fetchProfile]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      setIsFirebaseUser(true);
      await fetchProfile();
    } catch (err: any) {
      console.warn('Firebase popup sign-in dismissed or bypassed:', err);
      // If popup was closed by user or environment, remain on demo user
    } finally {
      setLoading(false);
    }
  };

  const switchDemoUser = async (uid: string) => {
    if (isFirebaseUser) {
      await firebaseSignOut(auth);
      setToken(null);
      setIsFirebaseUser(false);
    }
    setActiveDemoUid(uid);
    localStorage.setItem('apexvault-active-demo', uid);
  };

  const logout = async () => {
    try {
      if (isFirebaseUser) {
        await firebaseSignOut(auth);
        setToken(null);
        setIsFirebaseUser(false);
      }
      // Revert to primary demo user
      setActiveDemoUid('demo-user-elena');
      localStorage.setItem('apexvault-active-demo', 'demo-user-elena');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        activeDemoUid,
        isFirebaseUser,
        signInWithGoogle,
        switchDemoUser,
        logout,
        getAuthHeaders,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
