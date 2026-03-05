'use client';
import { create } from 'zustand';
import { type Sku } from '@/types';
import { mockSkus } from '@/lib/mock-data';

interface SkuState {
  skus: Sku[];
  total: number;
  loading: boolean;
  currentSku: Sku | null;
  fetchSkus: (params?: Record<string, string>) => Promise<void>;
  fetchSkuDetail: (id: string) => Promise<void>;
}

export const useSkuStore = create<SkuState>((set) => ({
  skus: [], total: 0, loading: false, currentSku: null,
  fetchSkus: async (_params?: Record<string, string>) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    let filtered = [...mockSkus];
    if (_params?.storeId) filtered = filtered.filter((s) => s.storeId === _params.storeId);
    if (_params?.keyword) filtered = filtered.filter((s) => s.title.toLowerCase().includes(_params.keyword!.toLowerCase()) || s.asin.includes(_params.keyword!));
    set({ skus: filtered, total: filtered.length, loading: false });
  },
  fetchSkuDetail: async (id) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 200));
    set({ currentSku: mockSkus.find((s) => s.id === id) || null, loading: false });
  },
}));
