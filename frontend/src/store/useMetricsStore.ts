'use client';
import { create } from 'zustand';
import { type WarRoomMetrics, type TrendPoint, type AdsTrendPoint, type SkuMetrics } from '@/types';
import api from '@/lib/api';

interface MetricsState {
  metrics: WarRoomMetrics | null;
  salesTrend: TrendPoint[];
  adsTrend: AdsTrendPoint[];
  skuMetrics: SkuMetrics | null;
  loading: boolean;
  error: string | null;
  fetchWarRoomMetrics: () => Promise<void>;
  fetchTrends: (days?: number) => Promise<void>;
  fetchSkuMetrics: (skuId: string) => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: null,
  salesTrend: [],
  adsTrend: [],
  skuMetrics: null,
  loading: false,
  error: null,
  fetchWarRoomMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const [metricsRes, trendsRes] = await Promise.all([
        api.get('/metrics/war-room'),
        api.get('/metrics/trends', { params: { days: 30 } }),
      ]);
      const trends = trendsRes.data;
      set({
        metrics: metricsRes.data,
        salesTrend: trends.salesTrend ?? trends.sales ?? [],
        adsTrend: trends.adsTrend ?? trends.ads ?? [],
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch war room metrics' });
    }
  },
  fetchTrends: async (days = 7) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/metrics/trends', { params: { days } });
      const trends = res.data;
      set({
        salesTrend: trends.salesTrend ?? trends.sales ?? [],
        adsTrend: trends.adsTrend ?? trends.ads ?? [],
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch trends' });
    }
  },
  fetchSkuMetrics: async (skuId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/metrics/sku/${skuId}`);
      set({ skuMetrics: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch SKU metrics' });
    }
  },
}));
