'use client';
import { useEffect } from 'react';
import { Row, Col, Card, Table, Spin, Result } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, FundOutlined, WarningOutlined } from '@ant-design/icons';
import KpiCard from '@/components/dashboard/KpiCard';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import AdPerformanceChart from '@/components/dashboard/AdPerformanceChart';
import RiskHeatmap from '@/components/dashboard/RiskHeatmap';
import SeverityBadge from '@/components/common/SeverityBadge';
import StatusTag from '@/components/common/StatusTag';
import { useMetricsStore } from '@/store/useMetricsStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useActionStore } from '@/store/useActionStore';
import Link from 'next/link';

export default function WarRoom() {
  const { metrics, salesTrend, adsTrend, warRoomLoading: loading, warRoomError: error, fetchWarRoomMetrics } = useMetricsStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { actions, fetchActions } = useActionStore();
  useEffect(() => { fetchWarRoomMetrics(); fetchAlerts(); fetchActions(); }, [fetchWarRoomMetrics, fetchAlerts, fetchActions]);

  if (loading || !metrics) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Result status="error" title="数据加载失败" subTitle={error} />;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>作战室 War Room</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><KpiCard title="总销售额" value={`$${metrics.totalSales.toLocaleString()}`} prefix={<DollarOutlined />} trend={metrics.salesTrend ?? undefined} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="广告花费" value={`$${metrics.adsSpend.toLocaleString()}`} prefix={<FundOutlined />} trend={metrics.adsSpendTrend ?? undefined} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="TACOS" value={`${metrics.tacos}%`} prefix={<ShoppingCartOutlined />} trend={metrics.tacosTrend ?? undefined} color="#3f8600" /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="缺货SKU" value={metrics.stockoutSkus} prefix={<WarningOutlined />} trend={metrics.stockoutTrend ?? undefined} color="#cf1322" /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="销售趋势（30天）" bordered={false}><SalesTrendChart data={salesTrend} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="广告表现（30天）" bordered={false}><AdPerformanceChart data={adsTrend} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="风险热力图" bordered={false}><RiskHeatmap /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最新预警 Top 5" bordered={false} extra={<Link href="/alerts">查看全部</Link>}>
            <Table dataSource={alerts.slice(0, 5)} rowKey="id" size="small" pagination={false} columns={[
              { title: '严重度', dataIndex: 'severity', width: 100, render: (v: string) => <SeverityBadge severity={v} /> },
              { title: '标题', dataIndex: 'title', ellipsis: true },
              { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <StatusTag status={v} /> },
            ]} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="待处理动作 Top 5" bordered={false} extra={<Link href="/actions">查看全部</Link>}>
            <Table dataSource={actions.filter((a) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(a.status)).slice(0, 5)} rowKey="id" size="small" pagination={false} columns={[
              { title: '类型', dataIndex: 'type', width: 160 },
              { title: 'SKU', dataIndex: 'skuName', ellipsis: true },
              { title: '状态', dataIndex: 'status', width: 120, render: (v: string) => <StatusTag status={v} /> },
              { title: '风险', dataIndex: 'riskScore', width: 80 },
            ]} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
