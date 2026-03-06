'use client';
import { useEffect, useMemo, useState } from 'react';
import { Table, Card, Select, Row, Col, Empty } from 'antd';
import { useAlertStore } from '@/store/useAlertStore';
import SeverityBadge from '@/components/common/SeverityBadge';
import StatusTag from '@/components/common/StatusTag';
import { AlertType, Severity, AlertStatus } from '@/types';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function AlertsPage() {
  const { alerts, listLoading: loading, fetchAlerts } = useAlertStore();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  useEffect(() => { fetchAlerts(stableFilters); }, [fetchAlerts, stableFilters]);

  const updateFilter = (key: string, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value; else delete next[key];
      return next;
    });
  };

  const columns = [
    { title: '类型', dataIndex: 'type', width: 180, render: (v: string) => v.replace(/_/g, ' ') },
    { title: '严重度', dataIndex: 'severity', width: 110, render: (v: string) => <SeverityBadge severity={v} /> },
    { title: 'ASIN', dataIndex: 'asin', width: 130 },
    { title: '标题', dataIndex: 'title', ellipsis: true, render: (v: string, r: { id: string }) => <Link href={`/alerts/${r.id}`}>{v}</Link> },
    { title: '状态', dataIndex: 'status', width: 120, render: (v: string) => <StatusTag status={v} /> },
    { title: '时间', dataIndex: 'createdAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>预警中心</h2>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col><Select allowClear placeholder="类型" style={{ width: 180 }} onChange={(v) => updateFilter('type', v)} options={Object.values(AlertType).map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} /></Col>
          <Col><Select allowClear placeholder="严重度" style={{ width: 130 }} onChange={(v) => updateFilter('severity', v)} options={Object.values(Severity).map((s) => ({ value: s, label: s }))} /></Col>
          <Col><Select allowClear placeholder="状态" style={{ width: 130 }} onChange={(v) => updateFilter('status', v)} options={Object.values(AlertStatus).map((s) => ({ value: s, label: s }))} /></Col>
        </Row>
      </Card>
      <Card bordered={false}>
        {!loading && alerts.length === 0 ? (
          <Empty description="暂无预警数据" />
        ) : (
          <Table dataSource={alerts} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        )}
      </Card>
    </div>
  );
}
