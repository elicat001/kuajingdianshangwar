'use client';
import { create } from 'zustand';
import { type Alert, AlertStatus } from '@/types';
import { mockAlerts } from '@/lib/mock-data';

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  fetchAlerts: (filters?: Record<string, string>) => Promise<void>;
  acknowledgeAlert: (id: string) => void;
  closeAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [], loading: false,
  fetchAlerts: async (_filters?: Record<string, string>) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    let filtered = [...mockAlerts];
    if (_filters?.type) filtered = filtered.filter((a) => a.type === _filters.type);
    if (_filters?.severity) filtered = filtered.filter((a) => a.severity === _filters.severity);
    if (_filters?.status) filtered = filtered.filter((a) => a.status === _filters.status);
    set({ alerts: filtered, loading: false });
  },
  acknowledgeAlert: (id) => set({ alerts: get().alerts.map((a) => a.id === id ? { ...a, status: AlertStatus.ACKNOWLEDGED } : a) }),
  closeAlert: (id) => set({ alerts: get().alerts.map((a) => a.id === id ? { ...a, status: AlertStatus.CLOSED } : a) }),
}));
