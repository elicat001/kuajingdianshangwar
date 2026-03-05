'use client';
import { create } from 'zustand';
import { type Action } from '@/types';
import api from '@/lib/api';

interface ActionState {
  actions: Action[];
  total: number;
  loading: boolean;
  error: string | null;
  currentAction: Action | null;
  fetchActions: (filters?: Record<string, string>) => Promise<void>;
  fetchActionDetail: (id: string) => Promise<void>;
  createAction: (data: Partial<Action>) => Promise<void>;
  submitAction: (id: string) => Promise<void>;
  approveAction: (id: string) => Promise<void>;
  rejectAction: (id: string) => Promise<void>;
  executeAction: (id: string) => Promise<void>;
  rollbackAction: (id: string) => Promise<void>;
}

export const useActionStore = create<ActionState>((set, get) => ({
  actions: [],
  total: 0,
  loading: false,
  error: null,
  currentAction: null,
  fetchActions: async (filters?: Record<string, string>) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = { ...filters };
      const res = await api.get('/actions', { params });
      const payload = res.data;
      set({
        actions: payload.data ?? payload,
        total: payload.total ?? (payload.data ? payload.data.length : 0),
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch actions' });
    }
  },
  fetchActionDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/actions/${id}`);
      set({ currentAction: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch action detail' });
    }
  },
  createAction: async (data: Partial<Action>) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/actions', data);
      set({ actions: [...get().actions, res.data], loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to create action' });
    }
  },
  submitAction: async (id: string) => {
    try {
      const res = await api.patch(`/actions/${id}/submit`);
      set({
        actions: get().actions.map((a) => (a.id === id ? res.data : a)),
        currentAction: get().currentAction?.id === id ? res.data : get().currentAction,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to submit action' });
    }
  },
  approveAction: async (id: string) => {
    try {
      const res = await api.patch(`/actions/${id}/approve`);
      set({
        actions: get().actions.map((a) => (a.id === id ? res.data : a)),
        currentAction: get().currentAction?.id === id ? res.data : get().currentAction,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to approve action' });
    }
  },
  rejectAction: async (id: string) => {
    try {
      const res = await api.patch(`/actions/${id}/reject`);
      set({
        actions: get().actions.map((a) => (a.id === id ? res.data : a)),
        currentAction: get().currentAction?.id === id ? res.data : get().currentAction,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to reject action' });
    }
  },
  executeAction: async (id: string) => {
    try {
      const res = await api.patch(`/actions/${id}/execute`);
      set({
        actions: get().actions.map((a) => (a.id === id ? res.data : a)),
        currentAction: get().currentAction?.id === id ? res.data : get().currentAction,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to execute action' });
    }
  },
  rollbackAction: async (id: string) => {
    try {
      const res = await api.patch(`/actions/${id}/rollback`);
      set({
        actions: get().actions.map((a) => (a.id === id ? res.data : a)),
        currentAction: get().currentAction?.id === id ? res.data : get().currentAction,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to rollback action' });
    }
  },
}));
