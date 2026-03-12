'use client';
import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Steps, Input, Select, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { ProductTest } from '@/types';

const gateColors: Record<string, string> = {
  GATE_0: 'default', GATE_1: 'blue', GATE_2: 'cyan',
  GATE_3: 'green', GRADUATED: 'gold', KILLED: 'red',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'processing', GRADUATED: 'success', KILLED: 'error', PAUSED: 'warning',
};

export default function ProductTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ProductTest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [keyword, setKeyword] = useState('');

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/product-tests', { params });
      setTests(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch { message.error('Failed to load tests'); }
    setLoading(false);
  };

  useEffect(() => { fetchTests(); }, [page, statusFilter]);

  const columns = [
    { title: '测试名称', dataIndex: 'testName', key: 'testName',
      render: (v: string, r: ProductTest) => <a onClick={() => router.push(`/product-tests/${r.id}`)}>{v}</a> },
    { title: 'SKU', dataIndex: 'skuId', key: 'skuId', width: 120,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 8)}...</span> },
    { title: '当前Gate', dataIndex: 'currentGate', key: 'currentGate',
      render: (v: string) => <Tag color={gateColors[v] || 'default'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag> },
    { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="新品测试 (Gate System)"
        extra={
          <Space>
            <Select placeholder="状态筛选" allowClear style={{ width: 120 }}
              onChange={setStatusFilter}
              options={[
                { value: 'ACTIVE', label: '进行中' },
                { value: 'GRADUATED', label: '已毕业' },
                { value: 'KILLED', label: '已终止' },
              ]}
            />
          </Space>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Steps size="small" style={{ flex: 1 }} items={[
            { title: 'Gate 0', description: '上架验证' },
            { title: 'Gate 1', description: '验证期 7天' },
            { title: 'Gate 2', description: '放量期 14天' },
            { title: 'Gate 3', description: '稳定期 30天' },
            { title: '毕业', description: '转正式SKU' },
          ]} />
        </div>

        <Table
          dataSource={tests}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        />
      </Card>
    </div>
  );
}
