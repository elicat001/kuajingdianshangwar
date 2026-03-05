'use client';
import { create } from 'zustand';
import { type Sku } from '@/types';
import api from '@/lib/api';

interface SkuState {
  skus: Sku[];
  total: number;
  loading: boolean;
  error: string | null;
  currentSku: Sku | null;
  fetchSkus: (params?: Record<string, string>) => Promise<void>;
  fetchSkuDetail: (id: string) => Promise<void>;
}

export const useSkuStore = create<SkuState>((set) => ({
  skus: [],
  total: 0,
  loading: false,
  error: null,
  currentSku: null,
  fetchSkus: async (params?: Record<string, string>) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/data/skus', { params });
      const payload = res.data;
      set({
        skus: payload.data ?? payload,
        total: payload.total ?? (payload.data ? payload.data.length : 0),
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch SKUs' });
    }
  },
  fetchSkuDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/data/skus/${id}`);
      set({ currentSku: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch SKU detail' });
    }
  },
}));
