'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile, Organization, AiStatusResponse,
  fetchCurrentUser, getCurrentOrganization, fetchAiStatus,
  updateUserProfile as apiUpdateUserProfile,
  updateOrganization as apiUpdateOrganization,
  getUser, getToken
} from '@/lib/apiClient';

interface AppContextValue {
  user: UserProfile | null;
  organization: Organization | null;
  aiStatus: AiStatusResponse | null;
  loading: boolean;
  updateUser: (dto: { name?: string; email?: string; avatarUrl?: string }) => Promise<UserProfile>;
  updateOrganization: (dto: { name?: string; slug?: string }) => Promise<Organization>;
  refetchUser: () => Promise<void>;
  refetchOrganization: () => Promise<void>;
  refetchAiStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => (typeof window !== 'undefined' ? getUser() : null));
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchUser = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await fetchCurrentUser();
      const userData = (res?.data as any)?.data || res?.data;
      if (userData) {
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('opspilot_user', JSON.stringify(userData));
        }
      }
    } catch {
      // Keep cached user if fetch fails
    }
  }, []);

  const refetchOrganization = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await getCurrentOrganization();
      const orgData = (res?.data as any)?.data || res?.data;
      if (orgData) {
        setOrganization(orgData);
      }
    } catch {
      // Ignore
    }
  }, []);

  const refetchAiStatus = useCallback(async () => {
    try {
      const res = await fetchAiStatus();
      if (res?.data) {
        setAiStatus(res.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      refetchUser(),
      refetchOrganization(),
      refetchAiStatus(),
    ]).finally(() => setLoading(false));
  }, [refetchUser, refetchOrganization, refetchAiStatus]);

  // Synchronized Mutation: Update User Profile
  const updateUser = useCallback(
    async (dto: { name?: string; email?: string; avatarUrl?: string }): Promise<UserProfile> => {
      if (!user?.id) throw new Error('No authenticated user session found');
      const res = await apiUpdateUserProfile(user.id, dto);
      const updated = (res?.data as any)?.data || res?.data || { ...user, ...dto };
      setUser(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('opspilot_user', JSON.stringify(updated));
        // Dispatch storage event so all tabs and listeners sync
        window.dispatchEvent(new Event('opspilot_user_updated'));
      }
      return updated;
    },
    [user]
  );

  // Synchronized Mutation: Update Organization
  const updateOrganization = useCallback(
    async (dto: { name?: string; slug?: string }): Promise<Organization> => {
      if (!organization?.id) throw new Error('No active organization context found');
      const res = await apiUpdateOrganization(organization.id, dto);
      const updated = (res?.data as any)?.data || res?.data || { ...organization, ...dto };
      setOrganization(updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('opspilot_org_updated'));
      }
      return updated;
    },
    [organization]
  );

  const value = useMemo(
    () => ({
      user,
      organization,
      aiStatus,
      loading,
      updateUser,
      updateOrganization,
      refetchUser,
      refetchOrganization,
      refetchAiStatus,
    }),
    [user, organization, aiStatus, loading, updateUser, updateOrganization, refetchUser, refetchOrganization, refetchAiStatus]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
