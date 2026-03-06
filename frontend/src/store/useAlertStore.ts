'use client';
import { create } from 'zustand';
import { type Alert } from '@/types';
import api from '@/lib/api';

interface AlertState {
  alerts: Alert[];
  total: number;
  listLoading: boolean;
  detailLoading: boolean;
  listError: string | null;
  detailError: string | null;
  currentAlert: Alert | null;
  fetchAlerts: (filters?: Record<string, string>) => Promise<void>;
  fetchAlertDetail: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  closeAlert: (id: string) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  total: 0,
  listLoading: false,
  detailLoading: false,
  listError: null,
  detailError: null,
  currentAlert: null,
  fetchAlerts: async (filters?: Record<string, string>) => {
    set({ listLoading: true, listError: null });
    try {
      const params: Record<string, string> = { ...filters };
      const res = await api.get('/alerts', { params });
      const payload = res.data;
      set({
        alerts: payload.data ?? payload,
        total: payload.total ?? (payload.data ? payload.data.length : 0),
        listLoading: false,
      });
    } catch (err: any) {
      set({ listLoading: false, listError: err.response?.data?.message || 'Failed to fetch alerts' });
    }
  },
  fetchAlertDetail: async (id: string) => {
    set({ detailLoading: true, detailError: null });
    try {
      const res = await api.get(`/alerts/${id}`);
      set({ currentAlert: res.data, detailLoading: false });
    } catch (err: any) {
      set({ detailLoading: false, detailError: err.response?.data?.message || 'Failed to fetch alert detail' });
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
      set({ listError: err.response?.data?.message || 'Failed to acknowledge alert' });
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
      set({ listError: err.response?.data?.message || 'Failed to close alert' });
    }
  },
}));
