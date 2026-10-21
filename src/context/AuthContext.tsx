'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPermissions, DEFAULT_ROLE_PERMISSIONS, TeamMemberDto, AuthUser } from '@/types/rbac';
export type { AuthUser };

interface AuthContextType {
  currentUser: AuthUser | null;
  allUsers: AuthUser[];
  isLoading: boolean;
  isLiveDb: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
  hasPermission: (perm: keyof UserPermissions) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  toggleMyOnlineStatus: () => Promise<void>;
  updatePermissions: (userId: string, newPerms: UserPermissions) => Promise<boolean>;
  updateUser: (userId: string, data: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'iqsend_active_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveDb, setIsLiveDb] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/team', { cache: 'no-store' });
      if (!res.ok) {
        console.warn('[AuthContext] /api/team returned', res.status, '– skipping user fetch');
        setIsLoading(false);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('[AuthContext] /api/team returned non-JSON response – skipping user fetch');
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setAllUsers(data.members);
        setIsLiveDb(true);

        const savedId = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
        let selected: AuthUser | undefined;

        if (savedId) {
          selected = data.members.find((m: AuthUser) => m.id === savedId);
        }

        // If not found in localStorage, check session from cookie
        if (!selected) {
          try {
            const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
            if (meRes.ok && (meRes.headers.get('content-type') || '').includes('application/json')) {
              const meData = await meRes.json();
              if (meData.success && meData.user) {
                selected = data.members.find((m: AuthUser) => m.id === meData.user.id) || meData.user;
              }
            }
          } catch {}
        }

        if (selected) {
          setCurrentUser(selected);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, selected.id);
          }
        } else if (data.members.length > 0) {
          const defaultAdmin = data.members.find((m: any) => m.role === "ADMIN") || data.members[0];
          setCurrentUser(defaultAdmin);
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEY, defaultAdmin.id);
          }
        } else {
          setCurrentUser(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch team in AuthContext:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[AuthContext] Login API returned non-JSON:', text.slice(0, 200));
        return { success: false, error: `Erreur serveur (${res.status}) – L'API de connexion est indisponible. Vérifiez la configuration du serveur.` };
      }
      const data = await res.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, data.user.id);
        }
        await fetchUsers();
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Identifiants incorrects' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur de connexion au serveur' };
    }
  }, [fetchUsers]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setCurrentUser(null);
    router.push('/login');
  }, [router]);

  const switchUser = useCallback((userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, user.id);
      }
    }
  }, [allUsers]);

  const hasPermission = useCallback((perm: keyof UserPermissions): boolean => {
    if (!currentUser) return true;
    if (currentUser.role === 'ADMIN') return true;
    return Boolean(currentUser.permissions?.[perm]);
  }, [currentUser]);

  const canAccessRoute = useCallback((pathname: string): boolean => {
    if (!currentUser) return true;
    if (currentUser.role === 'ADMIN') return true;

    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return Boolean(currentUser.permissions?.canAccessDashboard ?? true);
    }
    if (pathname.startsWith('/dashboard/orders')) {
      return Boolean(currentUser.permissions?.canAccessOrders);
    }
    if (pathname.startsWith('/dashboard/leads')) {
      return Boolean(currentUser.permissions?.canAccessLeads);
    }
    if (pathname.startsWith('/dashboard/call-center')) {
      return Boolean(currentUser.permissions?.canAccessConfirmation);
    }
    if (pathname.startsWith('/dashboard/inbox')) {
      return Boolean(currentUser.permissions?.canAccessInbox);
    }
    if (pathname.startsWith('/dashboard/ai-agents')) {
      return Boolean(currentUser.permissions?.canAccessAiAgents);
    }
    if (pathname.startsWith('/dashboard/packing')) {
      return Boolean(currentUser.permissions?.canAccessPacking);
    }
    if (pathname.startsWith('/dashboard/tracking')) {
      return Boolean(currentUser.permissions?.canAccessTracking);
    }
    if (pathname.startsWith('/dashboard/products')) {
      return Boolean(currentUser.permissions?.canAccessProducts);
    }
    if (pathname.startsWith('/dashboard/customers')) {
      return Boolean(currentUser.permissions?.canAccessCustomers);
    }
    if (pathname.startsWith('/dashboard/finance')) {
      return Boolean(currentUser.permissions?.canAccessFinance);
    }
    if (pathname.startsWith('/dashboard/automations')) {
      return Boolean(currentUser.permissions?.canAccessAutomations);
    }
    if (pathname.startsWith('/dashboard/integrations')) {
      return Boolean(currentUser.permissions?.canAccessIntegrations);
    }
    if (pathname.startsWith('/dashboard/team') || pathname.startsWith('/dashboard/users')) {
      return Boolean(currentUser.permissions?.canAccessTeam);
    }
    if (pathname.startsWith('/dashboard/settings')) {
      return Boolean(currentUser.permissions?.canAccessSettings);
    }

    return true;
  }, [currentUser]);

  const toggleMyOnlineStatus = useCallback(async () => {
    if (!currentUser) return;
    const newStatus = !currentUser.isOnline;
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, isOnline: newStatus }),
      });
      if (res.ok) {
        setCurrentUser((prev) => prev ? { ...prev, isOnline: newStatus } : null);
        setAllUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, isOnline: newStatus } : u))
        );
      }
    } catch (e) {
      console.error('Failed to toggle online status:', e);
    }
  }, [currentUser]);

  const updatePermissions = useCallback(async (userId: string, newPerms: UserPermissions): Promise<boolean> => {
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, permissions: newPerms }),
      });
      const data = await res.json();
      if (data.success) {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, permissions: newPerms } : u))
        );
        if (currentUser && currentUser.id === userId) {
          setCurrentUser((prev) => (prev ? { ...prev, permissions: newPerms } : null));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to update permissions:', e);
      return false;
    }
  }, [currentUser]);

  const updateUser = useCallback(async (userId: string, data: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...data }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchUsers();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to update user:', e);
      return false;
    }
  }, [fetchUsers]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        isLoading,
        isLiveDb,
        isAuthenticated: Boolean(currentUser),
        login,
        logout,
        switchUser,
        refreshUsers: fetchUsers,
        hasPermission,
        canAccessRoute,
        toggleMyOnlineStatus,
        updatePermissions,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
