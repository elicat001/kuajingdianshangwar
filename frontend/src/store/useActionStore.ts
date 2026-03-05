'use client';
import { create } from 'zustand';
import { type Action, ActionStatus } from '@/types';
import { mockActions } from '@/lib/mock-data';

interface ActionState {
  actions: Action[];
  loading: boolean;
  fetchActions: (filters?: Record<string, string>) => Promise<void>;
  submitAction: (id: string) => void;
  approveAction: (id: string) => void;
  rejectAction: (id: string) => void;
}

export const useActionStore = create<ActionState>((set, get) => ({
  actions: [], loading: false,
  fetchActions: async (_filters?: Record<string, string>) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    let filtered = [...mockActions];
    if (_filters?.status) filtered = filtered.filter((a) => a.status === _filters.status);
    if (_filters?.riskLevel) filtered = filtered.filter((a) => a.riskScore >= (_filters.riskLevel === 'HIGH' ? 5 : _filters.riskLevel === 'MEDIUM' ? 3 : 0));
    set({ actions: filtered, loading: false });
  },
  submitAction: (id) => set({ actions: get().actions.map((a) => a.id === id && a.status === ActionStatus.DRAFT ? { ...a, status: ActionStatus.SUBMITTED } : a) }),
  approveAction: (id) => set({ actions: get().actions.map((a) => a.id === id && a.status === ActionStatus.SUBMITTED ? { ...a, status: ActionStatus.APPROVED } : a) }),
  rejectAction: (id) => set({ actions: get().actions.map((a) => a.id === id && a.status === ActionStatus.SUBMITTED ? { ...a, status: ActionStatus.REJECTED } : a) }),
}));
