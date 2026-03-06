'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Row, Col, Card, Statistic, Button, List, Timeline, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useSkuStore } from '@/store/useSkuStore';
import { useMetricsStore } from '@/store/useMetricsStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useActionStore } from '@/store/useActionStore';
import StatusTag from '@/components/common/StatusTag';
import SeverityBadge from '@/components/common/SeverityBadge';
import api from '@/lib/api';
import { type Recommendation } from '@/types';
import dayjs from 'dayjs';

export default function BattleCardPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();
  const { currentSku, fetchSkuDetail, loading: skuLoading } = useSkuStore();
  const { skuMetrics, fetchSkuMetrics, skuMetricsLoading: metLoading } = useMetricsStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { actions, fetchActions } = useActionStore();
  const [skuRecs, setSkuRecs] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchSkuDetail(id);
    fetchSkuMetrics(id);
    fetchAlerts({ skuId: id });
    fetchActions({ skuId: id });
    api.get('/recommendations', { params: { skuId: id } })
      .then((res) => setSkuRecs(res.data?.data ?? res.data ?? []))
      .catch((err) => { message.error(err.response?.data?.message || '加载建议失败'); });
  }, [id, fetchSkuDetail, fetchSkuMetrics, fetchAlerts, fetchActions]);

  if (skuLoading || metLoading || !currentSku || !skuMetrics) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const skuAlerts = alerts.filter((a) => a.skuId === id);
  const skuActions = actions.filter((a) => a.skuId === id);
  const days = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];

  const salesChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: days },
    yAxis: { type: 'value' as const },
    series: [{ type: 'line' as const, data: skuMetrics.sales7d, smooth: true, areaStyle: { color: 'rgba(15,52,96,0.15)' }, itemStyle: { color: '#0f3460' } }],
  }), [skuMetrics.sales7d]);

  const adsChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['花费', 'ACOS%'] },
    xAxis: { type: 'category' as const, data: days },
    yAxis: [{ type: 'value' as const, name: '$' }, { type: 'value' as const, name: '%' }],
    series: [
      { name: '花费', type: 'bar' as const, data: skuMetrics.adsSpend7d, itemStyle: { color: '#16213e' } },
      { name: 'ACOS%', type: 'line' as const, yAxisIndex: 1, data: skuMetrics.acos7d, itemStyle: { color: '#e94560' } },
    ],
  }), [skuMetrics.adsSpend7d, skuMetrics.acos7d]);

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>返回</Button>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#16213e' }}>{currentSku.title}</h2>
        <p style={{ color: '#999', margin: '4px 0 0' }}>ASIN: {currentSku.asin} | SKU: {currentSku.sku} | {currentSku.storeName} / {currentSku.siteName}</p>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="销售额(7d)" value={skuMetrics.revenue} prefix="$" valueStyle={{ fontSize: 20, color: '#0f3460' }} /></Card></Col>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="利润(7d)" value={skuMetrics.profit} prefix="$" valueStyle={{ fontSize: 20, color: '#3f8600' }} /></Card></Col>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="TACOS" value={skuMetrics.tacos} suffix="%" valueStyle={{ fontSize: 20 }} /></Card></Col>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="库存天数" value={skuMetrics.daysOfCover} suffix="天" valueStyle={{ fontSize: 20, color: skuMetrics.daysOfCover < 7 ? '#cf1322' : '#16213e' }} /></Card></Col>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="7日均销" value={skuMetrics.units7d.length > 0 ? Math.round(skuMetrics.units7d.reduce((a, b) => a + b, 0) / 7) : 0} suffix="件" valueStyle={{ fontSize: 20 }} /></Card></Col>
        <Col xs={8} lg={4}><Card bordered={false}><Statistic title="成本" value={currentSku.costUnit} prefix="$" valueStyle={{ fontSize: 20 }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card title="销售趋势(7天)" bordered={false}><ReactECharts option={salesChartOption} style={{ height: 260 }} /></Card></Col>
        <Col xs={24} lg={12}><Card title="广告表现(7天)" bordered={false}><ReactECharts option={adsChartOption} style={{ height: 260 }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={`当前预警 (${skuAlerts.length})`} bordered={false}>
            {skuAlerts.length === 0 ? <p style={{ color: '#999' }}>暂无预警</p> : (
              <List dataSource={skuAlerts} renderItem={(a) => (
                <List.Item><List.Item.Meta title={<><SeverityBadge severity={a.severity} /> {a.title}</>} description={a.message} /></List.Item>
              )} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={`建议 (${skuRecs.length})`} bordered={false}>
            {skuRecs.length === 0 ? <p style={{ color: '#999' }}>暂无建议</p> : (
              <List dataSource={skuRecs} renderItem={(r) => (
                <List.Item actions={r.status === 'PENDING' ? [
                  <Button key="accept" type="primary" size="small" onClick={() => message.success('已接受')}>接受</Button>,
                  <Button key="reject" size="small" danger onClick={() => message.info('已拒绝')}>拒绝</Button>,
                ] : [<StatusTag key="s" status={r.status} />]}>
                  <List.Item.Meta title={r.rationale} description={`预期收益: $${r.expectedGain} | 风险: ${r.riskLevel}`} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="动作历史" bordered={false} style={{ marginTop: 16 }}>
        {skuActions.length === 0 ? <p style={{ color: '#999' }}>暂无动作记录</p> : (
          <Timeline items={skuActions.map((a) => ({
            color: a.status === 'EXECUTED' || a.status === 'VERIFIED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'blue',
            children: <><StatusTag status={a.status} /> {a.type.replace(/_/g, ' ')} - {dayjs(a.createdAt).format('MM-DD HH:mm')} <span style={{ color: '#999' }}>{a.createdBy}</span></>,
          }))} />
        )}
      </Card>
    </div>
  );
}
