'use client';
import { useEffect } from 'react';
import { Row, Col, Card, Table, Spin } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, FundOutlined, WarningOutlined } from '@ant-design/icons';
import KpiCard from '@/components/dashboard/KpiCard';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import AdPerformanceChart from '@/components/dashboard/AdPerformanceChart';
import RiskHeatmap from '@/components/dashboard/RiskHeatmap';
import SeverityBadge from '@/components/common/SeverityBadge';
import StatusTag from '@/components/common/StatusTag';
import { useMetricsStore } from '@/store/useMetricsStore';
import { mockAlerts, mockActions } from '@/lib/mock-data';
import Link from 'next/link';

export default function WarRoom() {
  const { metrics, salesTrend, adsTrend, loading, fetchWarRoomMetrics } = useMetricsStore();
  useEffect(() => { fetchWarRoomMetrics(); }, [fetchWarRoomMetrics]);

  if (loading || !metrics) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>作战室 War Room</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><KpiCard title="总销售额" value={`$${metrics.totalSales.toLocaleString()}`} prefix={<DollarOutlined />} trend={8.2} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="广告花费" value={`$${metrics.adsSpend.toLocaleString()}`} prefix={<FundOutlined />} trend={-3.1} /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="TACOS" value={`${metrics.tacos}%`} prefix={<ShoppingCartOutlined />} trend={-1.5} color="#3f8600" /></Col>
        <Col xs={24} sm={12} lg={6}><KpiCard title="缺货SKU" value={metrics.stockoutSkus} prefix={<WarningOutlined />} color="#cf1322" /></Col>
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
            <Table dataSource={mockAlerts.slice(0, 5)} rowKey="id" size="small" pagination={false} columns={[
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
            <Table dataSource={mockActions.filter((a) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(a.status)).slice(0, 5)} rowKey="id" size="small" pagination={false} columns={[
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
