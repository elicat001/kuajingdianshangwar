'use client';
import { create } from 'zustand';
import { type Alert } from '@/types';
import api from '@/lib/api';

interface AlertState {
  alerts: Alert[];
  total: number;
  loading: boolean;
  error: string | null;
  currentAlert: Alert | null;
  fetchAlerts: (filters?: Record<string, string>) => Promise<void>;
  fetchAlertDetail: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  closeAlert: (id: string) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  total: 0,
  loading: false,
  error: null,
  currentAlert: null,
  fetchAlerts: async (filters?: Record<string, string>) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = { ...filters };
      const res = await api.get('/alerts', { params });
      const payload = res.data;
      set({
        alerts: payload.data ?? payload,
        total: payload.total ?? (payload.data ? payload.data.length : 0),
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch alerts' });
    }
  },
  fetchAlertDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/alerts/${id}`);
      set({ currentAlert: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch alert detail' });
    }
  },
  acknowledgeAlert: async (id: string) => {
    try {
      const res = await api.patch(`/alerts/${id}/acknowledge`);
      set({
        alerts: get().alerts.map((a) => (a.id === id ? res.data : a)),
        currentAlert: get().currentAlert?.id === id ? res.data : get().currentAlert,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to acknowledge alert' });
    }
  },
  closeAlert: async (id: string) => {
    try {
      const res = await api.patch(`/alerts/${id}/close`);
      set({
        alerts: get().alerts.map((a) => (a.id === id ? res.data : a)),
        currentAlert: get().currentAlert?.id === id ? res.data : get().currentAlert,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to close alert' });
    }
  },
}));
