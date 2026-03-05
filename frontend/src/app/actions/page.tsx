'use client';
import { useEffect, useState } from 'react';
import { Table, Card, Select, Row, Col } from 'antd';
import { useActionStore } from '@/store/useActionStore';
import StatusTag from '@/components/common/StatusTag';
import RiskTag from '@/components/common/RiskTag';
import { ActionStatus, RiskLevel } from '@/types';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function ActionsPage() {
  const { actions, loading, fetchActions } = useActionStore();
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => { fetchActions(filters); }, [fetchActions, filters]);

  const updateFilter = (key: string, value: string | undefined) => {
    const next = { ...filters };
    if (value) next[key] = value; else delete next[key];
    setFilters(next);
  };

  const riskLabel = (score: number) => score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';

  const columns = [
    { title: '类型', dataIndex: 'type', width: 180, render: (v: string) => v.replace(/_/g, ' ') },
    { title: 'SKU', dataIndex: 'skuName', ellipsis: true, render: (v: string, r: any) => <Link href={`/actions/${r.id}`}>{v}</Link> },
    { title: '状态', dataIndex: 'status', width: 130, render: (v: string) => <StatusTag status={v} /> },
    { title: '风险', dataIndex: 'riskScore', width: 90, render: (v: number) => <RiskTag level={riskLabel(v)} /> },
    { title: '需审批', dataIndex: 'requiresApproval', width: 80, render: (v: boolean) => v ? '是' : '否' },
    { title: '创建人', dataIndex: 'createdBy', width: 120 },
    { title: '时间', dataIndex: 'createdAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>行动中心</h2>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col><Select allowClear placeholder="状态" style={{ width: 150 }} onChange={(v) => updateFilter('status', v)} options={Object.values(ActionStatus).map((s) => ({ value: s, label: s }))} /></Col>
          <Col><Select allowClear placeholder="风险级别" style={{ width: 130 }} onChange={(v) => updateFilter('riskLevel', v)} options={Object.values(RiskLevel).map((r) => ({ value: r, label: r }))} /></Col>
        </Row>
      </Card>
      <Card bordered={false}>
        <Table dataSource={actions} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
