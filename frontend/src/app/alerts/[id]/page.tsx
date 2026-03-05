'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Button, Space, List, message, Spin } from 'antd';
import SeverityBadge from '@/components/common/SeverityBadge';
import StatusTag from '@/components/common/StatusTag';
import { mockRecommendations } from '@/lib/mock-data';
import { useAlertStore } from '@/store/useAlertStore';
import dayjs from 'dayjs';

export default function AlertDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { alerts, loading, fetchAlerts, acknowledgeAlert, closeAlert } = useAlertStore();

  useEffect(() => {
    if (alerts.length === 0) fetchAlerts();
  }, [alerts.length, fetchAlerts]);

  const alert = alerts.find((a) => a.id === id);
  const recs = mockRecommendations.filter((r) => r.alertId === id);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!alert) return <Card>预警不存在</Card>;

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
          {JSON.stringify(alert.evidenceJson, null, 2)}
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
        {alert.status === 'OPEN' && <Button type="primary" onClick={() => { acknowledgeAlert(alert.id); message.success('已确认'); }}>确认预警</Button>}
        {alert.status !== 'CLOSED' && <Button danger onClick={() => { closeAlert(alert.id); message.success('已关闭'); }}>关闭预警</Button>}
      </Space>
    </div>
  );
}
