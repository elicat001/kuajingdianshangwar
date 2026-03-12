'use client';
import { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Select, Space, Typography, Tooltip, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface StoreOption {
  id: string;
  name: string;
}

function renderDaysOfSale(v: number) {
  if (v == null) return '-';
  let color: string;
  if (v < 7) color = 'red';
  else if (v < 14) color = 'orange';
  else color = 'green';
  return <Tag color={color}>{v} 天</Tag>;
}

function renderTrend(trend: number[] | string | undefined) {
  if (!trend) return '-';
  let arr: number[];
  if (typeof trend === 'string') {
    arr = trend.split(',').map(Number);
  } else if (Array.isArray(trend)) {
    arr = trend;
  } else {
    return '-';
  }
  if (!arr.length) return '-';
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  return (
    <Tooltip title={`7日趋势: ${arr.join(', ')}`}>
      <span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}>
        {arr.map((v, i) => {
          let color = '#666';
          if (max > min) {
            const ratio = (v - min) / (max - min);
            if (ratio > 0.66) color = '#52c41a';
            else if (ratio > 0.33) color = '#faad14';
            else color = '#f5222d';
          }
          return (
            <span key={i} style={{ color, fontWeight: 600 }}>
              {v}{i < arr.length - 1 ? ',' : ''}
            </span>
          );
        })}
      </span>
    </Tooltip>
  );
}

const buildColumns = () => [
  { title: 'SKU', dataIndex: 'skuId', width: 140, ellipsis: true, fixed: 'left' as const },
  { title: '店铺', dataIndex: 'storeName', width: 120, ellipsis: true,
    render: (v: string, r: any) => v || r.storeId || '-',
  },
  {
    title: '销售额', dataIndex: 'revenue', width: 110,
    sorter: (a: any, b: any) => (a.revenue || 0) - (b.revenue || 0),
    render: (v: number) => v != null ? `$${v.toLocaleString()}` : '-',
  },
  {
    title: '销量', dataIndex: 'units', width: 80,
    sorter: (a: any, b: any) => (a.units || 0) - (b.units || 0),
  },
  {
    title: '可售天数', dataIndex: 'daysOfSale', width: 100,
    sorter: (a: any, b: any) => (a.daysOfSale || 0) - (b.daysOfSale || 0),
    render: renderDaysOfSale,
  },
  {
    title: '7日趋势', dataIndex: 'salesTrend7d', width: 140,
    render: renderTrend,
  },
  {
    title: '广告花费', dataIndex: 'adSpend', width: 110,
    sorter: (a: any, b: any) => (a.adSpend || 0) - (b.adSpend || 0),
    render: (v: number) => v != null ? `$${v.toLocaleString()}` : '-',
  },
  {
    title: '广告收入', dataIndex: 'adRevenue', width: 110,
    render: (v: number) => v != null ? `$${v.toLocaleString()}` : '-',
  },
  {
    title: 'ACOS', dataIndex: 'acos', width: 80,
    sorter: (a: any, b: any) => (a.acos || 0) - (b.acos || 0),
    render: (v: number) => {
      if (v == null) return '-';
      const color = v > 40 ? 'red' : v > 25 ? 'orange' : 'green';
      return <Tag color={color}>{v}%</Tag>;
    },
  },
  {
    title: 'TACOS', dataIndex: 'tacos', width: 80,
    sorter: (a: any, b: any) => (a.tacos || 0) - (b.tacos || 0),
    render: (v: number) => {
      if (v == null) return '-';
      const color = v > 15 ? 'red' : v > 8 ? 'orange' : 'green';
      return <Tag color={color}>{v}%</Tag>;
    },
  },
  {
    title: 'ROAS', dataIndex: 'roas', width: 80,
    sorter: (a: any, b: any) => (a.roas || 0) - (b.roas || 0),
    render: (v: number) => v != null ? v.toFixed(2) : '-',
  },
  {
    title: 'CTR', dataIndex: 'ctr', width: 80,
    render: (v: number) => v != null ? `${v}%` : '-',
  },
  {
    title: 'CPC', dataIndex: 'cpc', width: 80,
    render: (v: number) => v != null ? `$${v}` : '-',
  },
  {
    title: '转化率', dataIndex: 'avgCvr', width: 80,
    render: (v: number) => v != null ? `${v}%` : '-',
  },
  {
    title: '利润', dataIndex: 'profit', width: 110,
    sorter: (a: any, b: any) => (a.profit || 0) - (b.profit || 0),
    render: (v: number) => {
      if (v == null) return '-';
      const color = v < 0 ? '#f5222d' : '#52c41a';
      return <span style={{ color, fontWeight: 600 }}>${v.toLocaleString()}</span>;
    },
  },
];

export default function LinkAnalysisPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await api.get('/data/stores');
      const body = res.data?.data || res.data;
      const list = Array.isArray(body) ? body : body?.data || [];
      setStores(list.map((s: any) => ({ id: s.id, name: s.name || s.id })));
    } catch { /* ignore */ }
  };

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, pageSize };
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      if (selectedStore) {
        params.storeId = selectedStore;
      }
      const res = await api.get('/metrics/link-analysis-enhanced', { params });
      const body = res.data?.data || res.data;
      setData(body?.data || []);
      setTotal(body?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);
  useEffect(() => { setPage(1); fetchData(1); }, [dateRange, selectedStore]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const exportData = data.map((row) => ({
        SKU: row.skuId,
        '店铺': row.storeName || row.storeId,
        '销售额': row.revenue,
        '销量': row.units,
        '可售天数': row.daysOfSale,
        '7日趋势': Array.isArray(row.salesTrend7d) ? row.salesTrend7d.join(',') : row.salesTrend7d || '',
        '广告花费': row.adSpend,
        '广告收入': row.adRevenue,
        'ACOS': row.acos,
        'TACOS': row.tacos,
        'ROAS': row.roas,
        'CTR': row.ctr,
        'CPC': row.cpc,
        '转化率': row.avgCvr,
        '利润': row.profit,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '链接分析');
      XLSX.writeFile(wb, `链接分析_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('导出成功');
    } catch (err) {
      message.error('导出失败，请重试');
    }
    setExporting(false);
  };

  const columns = buildColumns();

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>链接分析</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <RangePicker
            onChange={(_, dateStrings) => {
              if (dateStrings[0] && dateStrings[1]) {
                setDateRange(dateStrings as [string, string]);
              } else {
                setDateRange(null);
              }
            }}
          />
          <Select
            value={selectedStore}
            onChange={setSelectedStore}
            style={{ width: 200 }}
            placeholder="筛选店铺"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {stores.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
          </Select>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={!data.length}
          >
            导出Excel
          </Button>
        </Space>
        <Table
          rowKey={(r) => `${r.skuId}_${r.storeId}`}
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            current: page,
            total,
            pageSize,
            onChange: (p) => { setPage(p); fetchData(p); },
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </div>
  );
}
