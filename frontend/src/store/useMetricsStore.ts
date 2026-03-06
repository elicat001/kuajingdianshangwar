'use client';
import { create } from 'zustand';
import { type WarRoomMetrics, type TrendPoint, type AdsTrendPoint, type SkuMetrics } from '@/types';
import api from '@/lib/api';

interface MetricsState {
  metrics: WarRoomMetrics | null;
  salesTrend: TrendPoint[];
  adsTrend: AdsTrendPoint[];
  skuMetrics: SkuMetrics | null;
  warRoomLoading: boolean;
  skuMetricsLoading: boolean;
  warRoomError: string | null;
  skuMetricsError: string | null;
  fetchWarRoomMetrics: () => Promise<void>;
  fetchTrends: (days?: number) => Promise<void>;
  fetchSkuMetrics: (skuId: string) => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: null,
  salesTrend: [],
  adsTrend: [],
  skuMetrics: null,
  warRoomLoading: false,
  skuMetricsLoading: false,
  warRoomError: null,
  skuMetricsError: null,
  fetchWarRoomMetrics: async () => {
    set({ warRoomLoading: true, warRoomError: null });
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
        warRoomLoading: false,
      });
    } catch (err: any) {
      set({ warRoomLoading: false, warRoomError: err.response?.data?.message || 'Failed to fetch war room metrics' });
    }
  },
  fetchTrends: async (days = 7) => {
    set({ warRoomLoading: true, warRoomError: null });
    try {
      const res = await api.get('/metrics/trends', { params: { days } });
      const trends = res.data;
      set({
        salesTrend: trends.salesTrend ?? trends.sales ?? [],
        adsTrend: trends.adsTrend ?? trends.ads ?? [],
        warRoomLoading: false,
      });
    } catch (err: any) {
      set({ warRoomLoading: false, warRoomError: err.response?.data?.message || 'Failed to fetch trends' });
    }
  },
  fetchSkuMetrics: async (skuId: string) => {
    set({ skuMetricsLoading: true, skuMetricsError: null });
    try {
      const res = await api.get(`/metrics/sku/${skuId}`);
      set({ skuMetrics: res.data, skuMetricsLoading: false });
    } catch (err: any) {
      set({ skuMetricsLoading: false, skuMetricsError: err.response?.data?.message || 'Failed to fetch SKU metrics' });
    }
  },
}));
