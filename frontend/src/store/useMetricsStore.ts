'use client';
import { create } from 'zustand';
import { type WarRoomMetrics, type TrendPoint, type AdsTrendPoint, type SkuMetrics } from '@/types';
import { mockMetrics, mockSalesTrend, mockAdsTrend, generateSkuMetrics } from '@/lib/mock-data';

interface MetricsState {
  metrics: WarRoomMetrics | null;
  salesTrend: TrendPoint[];
  adsTrend: AdsTrendPoint[];
  skuMetrics: SkuMetrics | null;
  loading: boolean;
  fetchWarRoomMetrics: () => Promise<void>;
  fetchSkuMetrics: (skuId: string) => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: null, salesTrend: [], adsTrend: [], skuMetrics: null, loading: false,
  fetchWarRoomMetrics: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ metrics: mockMetrics, salesTrend: mockSalesTrend, adsTrend: mockAdsTrend, loading: false });
  },
  fetchSkuMetrics: async (_skuId: string) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 200));
    set({ skuMetrics: generateSkuMetrics(), loading: false });
  },
}));
