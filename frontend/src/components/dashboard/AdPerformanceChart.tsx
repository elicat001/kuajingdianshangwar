'use client';
import ReactECharts from 'echarts-for-react';
import type { AdsTrendPoint } from '@/types';

export default function AdPerformanceChart({ data }: { data: AdsTrendPoint[] }) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['广告花费', 'ACOS%'], top: 0 },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.map((d) => d.date), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '花费($)', axisLabel: { fontSize: 11 } },
      { type: 'value', name: 'ACOS(%)', axisLabel: { fontSize: 11 } },
    ],
    series: [
      { name: '广告花费', type: 'bar', data: data.map((d) => d.spend), itemStyle: { color: '#16213e', borderRadius: [3, 3, 0, 0] } },
      { name: 'ACOS%', type: 'line', yAxisIndex: 1, data: data.map((d) => d.acos), smooth: true, itemStyle: { color: '#e94560' }, lineStyle: { width: 2 } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 320 }} />;
}
