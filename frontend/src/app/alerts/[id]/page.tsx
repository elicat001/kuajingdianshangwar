'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Button, Space, List, message, Spin } from 'antd';
import SeverityBadge from '@/components/common/SeverityBadge';
import StatusTag from '@/components/common/StatusTag';
import { useAlertStore } from '@/store/useAlertStore';
import api from '@/lib/api';
import { type Recommendation } from '@/types';
import dayjs from 'dayjs';

export default function AlertDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();
  const { currentAlert, detailLoading: loading, fetchAlertDetail, acknowledgeAlert, closeAlert } = useAlertStore();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    if (id) fetchAlertDetail(id);
  }, [id, fetchAlertDetail]);

  useEffect(() => {
    if (!id) return;
    setRecsLoading(true);
    api.get('/recommendations', { params: { alertId: id } })
      .then((res) => setRecs(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        message.error(err.response?.data?.message || '加载建议失败');
      })
      .finally(() => setRecsLoading(false));
  }, [id]);

  const alert = currentAlert;

  if (loading || recsLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!alert) return <Card>预警不存在</Card>;

  const handleAck = async () => {
    try {
      await acknowledgeAlert(alert.id);
      message.success('已确认');
    } catch {
      message.error('确认失败');
    }
  };

  const handleClose = async () => {
    try {
      await closeAlert(alert.id);
      message.success('已关闭');
    } catch {
      message.error('关闭失败');
    }
  };

  const safeStringify = (val: unknown) => {
    try { return JSON.stringify(val, null, 2); }
    catch { return '{}'; }
  };

  return (
    <div>
      <Button onClick={() => router.back()} style={{ marginBottom: 16 }}>返回</Button>
      <Card title="预警详情" bordered={false}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="类型">{alert.type.replace(/_/g, ' ')}</Descriptions.Item>
          <Descriptions.Item label="严重度"><SeverityBadge severity={alert.severity} /></Descriptions.Item>
          <Descriptions.Item label="状态"><StatusTag status={alert.status} /></Descriptions.Item>
          <Descriptions.Item label="时间">{dayjs(alert.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="SKU">{alert.skuName}</Descriptions.Item>
          <Descriptions.Item label="ASIN">{alert.asin}</Descriptions.Item>
          <Descriptions.Item label="标题" span={2}>{alert.title}</Descriptions.Item>
          <Descriptions.Item label="消息" span={2}>{alert.message}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="证据链" bordered={false} style={{ marginTop: 16 }}>
        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, fontSize: 13, overflow: 'auto' }}>
          {safeStringify(alert.evidenceJson)}
        </pre>
      </Card>

      {recs.length > 0 && (
        <Card title="关联建议" bordered={false} style={{ marginTop: 16 }}>
          <List dataSource={recs} renderItem={(rec) => (
            <List.Item>
              <List.Item.Meta title={rec.rationale} description={`风险: ${rec.riskLevel} | 预期收益: $${rec.expectedGain} | 状态: ${rec.status}`} />
            </List.Item>
          )} />
        </Card>
      )}

      <Space style={{ marginTop: 16 }}>
        {alert.status === 'OPEN' && <Button type="primary" onClick={handleAck}>确认预警</Button>}
        {alert.status !== 'CLOSED' && <Button danger onClick={handleClose}>关闭预警</Button>}
      </Space>
    </div>
  );
}
