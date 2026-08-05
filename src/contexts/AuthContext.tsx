/**
 * AuthContext — Authentication state management for Veer Suraksha Grid
 * 
 * Uses Firebase Realtime Database for user storage (simple username/password).
 * Seeds default users on first load if they don't exist.
 * Persists session in localStorage.
 * 
 * Users:
 *   admin    / admin    → role: admin   → sees AdminDashboard
 *   worker1  / worker1  → role: worker  → W-001 Pranshu Bobade (Red Zone)
 *   worker2  / worker2  → role: worker  → W-002 Sheel Gaikwad (Yellow Zone)
 *   worker3  / worker3  → role: worker  → W-003 Aradhya Avhad (Green Zone)
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dbRef, onValue, set, get } from '@/lib/firebase';

export interface UserData {
  username: string;
  password: string;
  role: 'admin' | 'worker';
  name: string;
  nameMr: string;
  workerId?: string;
  zone?: string;
  zoneType?: string;
  zoneTypeMr?: string;
  assignedAsset?: string;
  telemetryPath?: string;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Default users to seed into Firebase
const DEFAULT_USERS: Record<string, UserData> = {
  admin: {
    username: 'admin',
    password: 'admin',
    role: 'admin',
    name: 'Admin',
    nameMr: 'प्रशासक',
  },
  worker1: {
    username: 'worker1',
    password: 'worker1',
    role: 'worker',
    name: 'Pranshu Bobade',
    nameMr: 'प्रांशू बोबडे',
    workerId: 'W-001',
    zone: 'red',
    zoneType: 'Industrial (High Risk)',
    zoneTypeMr: 'औद्योगिक (उच्च जोखीम)',
    assignedAsset: 'SMC-MH-001',
    telemetryPath: 'telemetry/Worker1',
  },
  worker2: {
    username: 'worker2',
    password: 'worker2',
    role: 'worker',
    name: 'Sheel Gaikwad',
    nameMr: 'शील गायकवाड',
    workerId: 'W-002',
    zone: 'yellow',
    zoneType: 'Commercial',
    zoneTypeMr: 'व्यापारी',
    assignedAsset: 'SMC-MH-004',
    telemetryPath: 'telemetry/Worker2',
  },
  worker3: {
    username: 'worker3',
    password: 'worker3',
    role: 'worker',
    name: 'Aradhya Avhad',
    nameMr: 'आराध्या अवहाड',
    workerId: 'W-003',
    zone: 'green',
    zoneType: 'Residential',
    zoneTypeMr: 'निवासी',
    assignedAsset: 'SMC-MH-006',
    telemetryPath: 'telemetry/Worker3',
  },
};

const SESSION_KEY = 'veer_suraksha_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Seed default users into Firebase if they don't exist
  useEffect(() => {
    const seedUsers = async () => {
      try {
        const usersRef = dbRef('users');
        const snapshot = await get(usersRef);
        if (!snapshot.exists()) {
          // No users exist — seed defaults
          await set(usersRef, DEFAULT_USERS);
          console.log('[Auth] Default users seeded to Firebase');
        } else {
          console.log('[Auth] Users already exist in Firebase');
        }
      } catch (error) {
        console.error('[Auth] Failed to seed users:', error);
      }
    };
    seedUsers();
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserData;
        setUser(parsed);
        console.log('[Auth] Session restored for:', parsed.username);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userRef = dbRef(`users/${username}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = snapshot.val() as UserData;

      if (userData.password !== password) {
        return { success: false, error: 'Invalid password' };
      }

      // Login successful
      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      console.log('[Auth] Login successful:', username, '→', userData.role);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    console.log('[Auth] Logged out');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
