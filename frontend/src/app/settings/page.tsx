'use client';
import { Tabs, Card, Form, InputNumber, Button, Table, Select, message } from 'antd';

const thresholdFields = [
  { key: 'stockout_days_high', label: '缺货高危阈值(天)', value: 3 },
  { key: 'stockout_days_med', label: '缺货中危阈值(天)', value: 7 },
  { key: 'slow_moving_days', label: '滞销阈值(天)', value: 90 },
  { key: 'ads_waste_spend', label: '浪费花费阈值($)', value: 50 },
  { key: 'ads_waste_acos', label: 'ACOS浪费阈值(%)', value: 50 },
  { key: 'competitor_price_drop_pct', label: '竞品降价阈值(%)', value: 10 },
  { key: 'price_max_delta_pct', label: '改价最大幅度(%)', value: 3 },
  { key: 'price_min_margin_floor', label: '最低毛利底线(%)', value: 15 },
  { key: 'price_cooldown_hours', label: '改价冷却时间(h)', value: 6 },
  { key: 'price_max_changes_per_day', label: '日最大改价次数', value: 2 },
  { key: 'budget_max_delta_pct', label: '预算调整上限(%)', value: 20 },
  { key: 'batch_max_impact_usd', label: '批量影响上限($)', value: 5000 },
];

const metricDefs = [
  { id: '1', name: 'TACOS', formula: 'ads_spend / total_sales * 100', version: 1, effectiveFrom: '2026-01-01' },
  { id: '2', name: 'Days of Cover', formula: 'available / avg_daily_units_7d', version: 1, effectiveFrom: '2026-01-01' },
  { id: '3', name: 'Waste Score', formula: 'weighted(spend, orders, acos_duration)', version: 1, effectiveFrom: '2026-01-01' },
  { id: '4', name: 'Threat Score', formula: 'weighted(price_delta, rank_change, review_growth)', version: 1, effectiveFrom: '2026-01-01' },
];

const users = [
  { id: '1', name: 'Admin', email: 'admin@demo.com', role: 'SUPER_ADMIN' },
  { id: '2', name: 'Manager Wang', email: 'manager@demo.com', role: 'MANAGER' },
  { id: '3', name: 'Operator Li', email: 'operator@demo.com', role: 'OPERATOR' },
];

export default function SettingsPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#16213e' }}>系统设置</h2>
      <Card bordered={false}>
        <Tabs items={[
          {
            key: 'thresholds', label: '阈值配置',
            children: (
              <Form layout="vertical" onFinish={() => message.success('已保存')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {thresholdFields.map((f) => (
                    <Form.Item key={f.key} label={f.label} name={f.key} initialValue={f.value}>
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  ))}
                </div>
                <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>保存配置</Button>
              </Form>
            ),
          },
          {
            key: 'metrics', label: '口径管理',
            children: (
              <Table dataSource={metricDefs} rowKey="id" pagination={false} columns={[
                { title: '指标名称', dataIndex: 'name', width: 150 },
                { title: '计算公式', dataIndex: 'formula' },
                { title: '版本', dataIndex: 'version', width: 80 },
                { title: '生效日期', dataIndex: 'effectiveFrom', width: 120 },
              ]} />
            ),
          },
          {
            key: 'rbac', label: '权限管理',
            children: (
              <Table dataSource={users} rowKey="id" pagination={false} columns={[
                { title: '姓名', dataIndex: 'name', width: 150 },
                { title: '邮箱', dataIndex: 'email', width: 200 },
                { title: '角色', dataIndex: 'role', width: 180, render: (v: string) => (
                  <Select defaultValue={v} style={{ width: 160 }} options={[
                    { value: 'SUPER_ADMIN', label: '超级管理员' },
                    { value: 'ADMIN', label: '管理员' },
                    { value: 'MANAGER', label: '运营经理' },
                    { value: 'OPERATOR', label: '操作员' },
                    { value: 'VIEWER', label: '只读' },
                  ]} onChange={() => message.success('角色已更新')} />
                )},
              ]} />
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
