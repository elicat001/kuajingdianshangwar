'use client';
import { useState, useEffect } from 'react';
import {
  Card, Upload, Button, Select, Table, Tag, Tabs, message,
  Typography, Space, Input, DatePicker, Progress,
} from 'antd';
import { UploadOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DATA_TYPES = [
  { value: 'sales_report', label: 'SKU销量表' },
  { value: 'inventory_report', label: '库存表' },
  { value: 'promotion_fee', label: '推广费' },
  { value: 'product_performance', label: '商品表现' },
  { value: 'product_info', label: '产品信息' },
];

const DATA_TYPE_LABEL_MAP: Record<string, string> = {
  sales_report: 'SKU销量表',
  inventory_report: '库存表',
  promotion_fee: '推广费',
  product_performance: '商品表现',
  product_info: '产品信息',
};

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待处理' },
  processing: { color: 'processing', text: '处理中' },
  completed: { color: 'success', text: '导入成功' },
  failed: { color: 'error', text: '导入失败' },
};

interface StoreOption {
  id: string;
  name: string;
}

export default function ImportPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataType, setDataType] = useState('sales_report');
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [reportDate, setReportDate] = useState<string>('');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [feishuJson, setFeishuJson] = useState('');
  const [feishuSubmitting, setFeishuSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ show: boolean; total: number; imported: number }>({
    show: false, total: 0, imported: 0,
  });

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/upload', { params: { page: 1, pageSize: 50 } });
      const body = res.data?.data || res.data;
      setUploads(body?.data || []);
      setTotal(body?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchStores = async () => {
    try {
      const res = await api.get('/data/stores');
      const body = res.data?.data || res.data;
      const list = Array.isArray(body) ? body : body?.data || [];
      setStores(list.map((s: any) => ({ id: s.id, name: s.name || s.id })));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchUploads();
    fetchStores();
  }, []);

  const handleUpload = async (info: any) => {
    const file = info.file;
    if (!dataType) { message.error('请选择数据类型'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataType', dataType);
    if (storeId) formData.append('storeId', storeId);
    if (reportDate) formData.append('reportDate', reportDate);

    setUploading(true);
    setImportProgress({ show: false, total: 0, imported: 0 });
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const body = res.data?.data || res.data;
      const rowCount = body?.rowCount || body?.imported || 0;
      setImportProgress({ show: true, total: rowCount, imported: rowCount });
      message.success(`上传并导入成功，共 ${rowCount} 行`);
      fetchUploads();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '上传失败');
    }
    setUploading(false);
  };

  const handleFeishuSubmit = async () => {
    if (!feishuJson.trim()) {
      message.error('请粘贴飞书JSON数据');
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(feishuJson);
    } catch {
      message.error('JSON格式不正确，请检查');
      return;
    }
    setFeishuSubmitting(true);
    try {
      const res = await api.post('/upload/product-info', parsed);
      const body = res.data?.data || res.data;
      const rowCount = body?.rowCount || body?.imported || 0;
      setImportProgress({ show: true, total: rowCount, imported: rowCount });
      message.success(`飞书数据导入成功，共 ${rowCount} 条`);
      setFeishuJson('');
      fetchUploads();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '飞书数据导入失败');
    }
    setFeishuSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/upload/${id}`);
      message.success('删除成功');
      fetchUploads();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { title: '文件名', dataIndex: 'filename', width: 200, ellipsis: true },
    {
      title: '数据类型', dataIndex: 'dataType', width: 120,
      render: (v: string) => (
        <Tag color="blue">{DATA_TYPE_LABEL_MAP[v] || v}</Tag>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const s = STATUS_MAP[v] || { color: 'default', text: v };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '导入行数', dataIndex: 'rowCount', width: 100,
      render: (v: number) => v != null ? <Text strong>{v.toLocaleString()}</Text> : '-',
    },
    { title: '店铺', dataIndex: 'storeId', width: 120, ellipsis: true },
    { title: '备注', dataIndex: 'message', width: 160, ellipsis: true },
    {
      title: '上传时间', dataIndex: 'createdAt', width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
          删除
        </Button>
      ),
    },
  ];

  const fileUploadContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Select value={dataType} onChange={setDataType} style={{ width: 200 }} placeholder="选择数据类型">
          {DATA_TYPES.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
        </Select>
        <Select
          value={storeId}
          onChange={setStoreId}
          style={{ width: 200 }}
          placeholder="选择店铺（可选）"
          allowClear
          showSearch
          optionFilterProp="children"
        >
          {stores.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
        </Select>
        <DatePicker
          placeholder="报表日期（可选）"
          style={{ width: 200 }}
          onChange={(date) => setReportDate(date ? date.format('YYYY-MM-DD') : '')}
          value={reportDate ? dayjs(reportDate) : null}
        />
      </Space>
      <Upload beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".xlsx,.xls,.csv">
        <Button type="primary" icon={<UploadOutlined />} loading={uploading}>选择Excel文件上传</Button>
      </Upload>
      <div style={{ color: '#999', fontSize: 13 }}>支持 .xlsx / .xls / .csv 格式，表头需包含对应字段（SKU、销量、销售额等）</div>
    </Space>
  );

  const feishuUploadContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">将飞书多维表格导出的JSON数据粘贴到下方，点击提交即可导入产品信息。</Text>
      <TextArea
        rows={10}
        value={feishuJson}
        onChange={e => setFeishuJson(e.target.value)}
        placeholder='粘贴飞书JSON数据，例如: [{"sku":"ABC-001","title":"产品名称",...}]'
        style={{ fontFamily: 'monospace', fontSize: 13 }}
      />
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        loading={feishuSubmitting}
        onClick={handleFeishuSubmit}
      >
        提交飞书数据
      </Button>
    </Space>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>数据导入</Title>
      <Card title="上传报表" style={{ marginBottom: 24 }}>
        <Tabs
          defaultActiveKey="file"
          items={[
            { key: 'file', label: '文件上传', children: fileUploadContent },
            { key: 'feishu', label: '飞书JSON上传', children: feishuUploadContent },
          ]}
        />
        {importProgress.show && (
          <div style={{ marginTop: 16 }}>
            <Text>导入完成：共 {importProgress.imported} 行</Text>
            <Progress
              percent={100}
              status="success"
              format={() => `${importProgress.imported} 行`}
            />
          </div>
        )}
      </Card>
      <Card title="导入历史">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={uploads}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ total, pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
}
