'use client';
import { useEffect, useState } from 'react';
import { Table, Card, Input, Select, Row, Col, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSkuStore } from '@/store/useSkuStore';
import StatusTag from '@/components/common/StatusTag';
import Link from 'next/link';

export default function SkusPage() {
  const { skus, total, loading, fetchSkus } = useSkuStore();
  const [keyword, setKeyword] = useState('');

  useEffect(() => { fetchSkus(keyword ? { keyword } : {}); }, [fetchSkus, keyword]);

  const columns = [
    { title: 'ASIN', dataIndex: 'asin', width: 130, render: (v: string, r: any) => <Link href={`/skus/${r.id}`}><Tag color="blue">{v}</Tag></Link> },
    { title: 'SKU', dataIndex: 'sku', width: 130 },
    { title: '商品名称', dataIndex: 'title', ellipsis: true },
    { title: '店铺', dataIndex: 'storeName', width: 140 },
    { title: '站点', dataIndex: 'siteName', width: 80 },
    { title: '类目', dataIndex: 'category', width: 120 },
    { title: '成本($)', dataIndex: 'costUnit', width: 90, render: (v: number) => v.toFixed(2) },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <StatusTag status={v} /> },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>SKU 管理</h2>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col flex="300px">
            <Input placeholder="搜索 ASIN / SKU / 商品名" prefix={<SearchOutlined />} allowClear onChange={(e) => setKeyword(e.target.value)} />
          </Col>
        </Row>
      </Card>
      <Card bordered={false}>
        <Table dataSource={skus} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10, total, showTotal: (t) => `共 ${t} 条` }} />
      </Card>
    </div>
  );
}
