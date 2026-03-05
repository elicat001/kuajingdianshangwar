'use client';
import { useEffect, useState } from 'react';
import { Tabs, Card, Form, InputNumber, Button, Table, Select, Spin, message } from 'antd';
import api from '@/lib/api';

interface Threshold {
  id: string;
  metricCode: string;
  warnValue: number;
  criticalValue: number;
}

interface MetricDef {
  id: string;
  name: string;
  versions?: { id: string; formula: string; version: number; effectiveFrom: string }[];
}

interface UserItem {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

const defaultThresholdFields = [
  { key: 'stockout_days_high', label: '缺货高危阈值(天)' },
  { key: 'stockout_days_med', label: '缺货中危阈值(天)' },
  { key: 'slow_moving_days', label: '滞销阈值(天)' },
  { key: 'ads_waste_spend', label: '浪费花费阈值($)' },
  { key: 'ads_waste_acos', label: 'ACOS浪费阈值(%)' },
  { key: 'competitor_price_drop_pct', label: '竞品降价阈值(%)' },
  { key: 'price_max_delta_pct', label: '改价最大幅度(%)' },
  { key: 'price_min_margin_floor', label: '最低毛利底线(%)' },
  { key: 'price_cooldown_hours', label: '改价冷却时间(h)' },
  { key: 'price_max_changes_per_day', label: '日最大改价次数' },
  { key: 'budget_max_delta_pct', label: '预算调整上限(%)' },
  { key: 'batch_max_impact_usd', label: '批量影响上限($)' },
];

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [metricDefs, setMetricDefs] = useState<MetricDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    Promise.all([
      api.get('/data/thresholds').catch(() => ({ data: [] })),
      api.get('/data/metric-defs').catch(() => ({ data: [] })),
    ]).then(([thresRes, metricRes]) => {
      const thresData = thresRes.data?.data ?? thresRes.data ?? [];
      setThresholds(thresData);
      const metData = metricRes.data?.data ?? metricRes.data ?? [];
      setMetricDefs(metData);

      // Pre-fill form with existing threshold values
      const formValues: Record<string, number> = {};
      thresData.forEach((t: Threshold) => {
        formValues[`${t.metricCode}_warn`] = t.warnValue;
        formValues[`${t.metricCode}_critical`] = t.criticalValue;
      });
      form.setFieldsValue(formValues);
      setLoading(false);
    });
  }, [form]);

  const onSaveThresholds = async (values: Record<string, number>) => {
    try {
      // Save each threshold that has a value
      for (const field of defaultThresholdFields) {
        const warnVal = values[`${field.key}_warn`];
        const critVal = values[`${field.key}_critical`];
        if (warnVal !== undefined || critVal !== undefined) {
          await api.put('/data/thresholds', {
            metricCode: field.key,
            warnValue: warnVal ?? 0,
            criticalValue: critVal ?? 0,
          });
        }
      }
      message.success('配置已保存');
    } catch {
      message.error('保存失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  // Flatten metric defs with versions for table display
  const metricRows = metricDefs.flatMap((m) =>
    (m.versions && m.versions.length > 0)
      ? m.versions.map((v) => ({ id: v.id, name: m.name, formula: v.formula, version: v.version, effectiveFrom: v.effectiveFrom }))
      : [{ id: m.id, name: m.name, formula: '-', version: 1, effectiveFrom: '-' }]
  );

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>系统设置</h2>
      <Card bordered={false}>
        <Tabs items={[
          {
            key: 'thresholds', label: '阈值配置',
            children: (
              <Form form={form} layout="vertical" onFinish={onSaveThresholds}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {defaultThresholdFields.map((f) => (
                    <div key={f.key}>
                      <strong style={{ fontSize: 13 }}>{f.label}</strong>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Form.Item name={`${f.key}_warn`} style={{ margin: 0, flex: 1 }}>
                          <InputNumber placeholder="警告值" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name={`${f.key}_critical`} style={{ margin: 0, flex: 1 }}>
                          <InputNumber placeholder="严重值" style={{ width: '100%' }} />
                        </Form.Item>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>保存配置</Button>
              </Form>
            ),
          },
          {
            key: 'metrics', label: '口径管理',
            children: (
              <Table dataSource={metricRows} rowKey="id" pagination={false} columns={[
                { title: '指标名称', dataIndex: 'name', width: 150 },
                { title: '计算公式', dataIndex: 'formula' },
                { title: '版本', dataIndex: 'version', width: 80 },
                { title: '生效日期', dataIndex: 'effectiveFrom', width: 120 },
              ]} />
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
