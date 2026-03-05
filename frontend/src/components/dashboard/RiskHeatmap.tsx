'use client';
import ReactECharts from 'echarts-for-react';

const sites = ['US', 'UK', 'DE', 'JP'];
const categories = ['Electronics', 'Sports', 'Kitchen', 'Home', 'Outdoors'];
const heatData = sites.flatMap((_, si) => categories.map((_, ci) => [si, ci, Math.round(Math.random() * 10)]));

export default function RiskHeatmap() {
  const option = {
    tooltip: { formatter: (p: any) => `${sites[p.value[0]]} / ${categories[p.value[1]]}: 风险 ${p.value[2]}` },
    grid: { left: 80, right: 40, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: sites, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'category', data: categories, axisLabel: { fontSize: 11 } },
    visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#e8f5e9', '#fff9c4', '#ffccbc', '#ef5350'] } },
    series: [{ type: 'heatmap', data: heatData, label: { show: true, fontSize: 12 }, itemStyle: { borderColor: '#fff', borderWidth: 2 } }],
  };
  return <ReactECharts option={option} style={{ height: 280 }} />;
}
