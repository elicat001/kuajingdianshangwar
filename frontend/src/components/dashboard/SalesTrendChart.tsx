'use client';
import ReactECharts from 'echarts-for-react';
import type { TrendPoint } from '@/types';

export default function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['销售额', '订单数'], top: 0 },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.map((d) => d.date), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '销售额($)', axisLabel: { fontSize: 11 } },
      { type: 'value', name: '订单', axisLabel: { fontSize: 11 } },
    ],
    series: [
      { name: '销售额', type: 'line', data: data.map((d) => d.sales), smooth: true, itemStyle: { color: '#0f3460' }, areaStyle: { color: 'rgba(15,52,96,0.1)' } },
      { name: '订单数', type: 'line', yAxisIndex: 1, data: data.map((d) => d.orders), smooth: true, itemStyle: { color: '#e94560' } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 320 }} />;
}
