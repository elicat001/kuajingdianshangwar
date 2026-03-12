'use client';
import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Statistic, Row, Col, message, Descriptions, Empty } from 'antd';
import { SwapOutlined, ArrowRightOutlined } from '@ant-design/icons';
import api from '@/lib/api';

interface CampaignROAS {
  campaignId: string;
  skuId: string;
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  dailyBudget: number;
}

interface Suggestion {
  from: CampaignROAS;
  to: CampaignROAS;
  amount: number;
  expectedRoasGain: number;
}

interface BudgetMigration {
  id: string;
  sourceCampaignId: string;
  targetCampaignId: string;
  sourceSkuId?: string;
  targetSkuId?: string;
  migratedAmount: number;
  sourceRoas: number;
  targetRoas: number;
  status: string;
  expectedImpact?: { roasGain: number; estimatedAdditionalRevenue: number };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'blue', APPROVED: 'cyan', EXECUTED: 'green', ROLLED_BACK: 'red',
};

const statusLabels: Record<string, string> = {
  PENDING: '待审批', APPROVED: '已审批', EXECUTED: '已执行', ROLLED_BACK: '已回滚',
};

export default function BudgetMigrationPage() {
  const [tab, setTab] = useState<'analysis' | 'history'>('analysis');
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState<CampaignROAS[]>([]);
  const [receivers, setReceivers] = useState<CampaignROAS[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [migrations, setMigrations] = useState<BudgetMigration[]>([]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.get('/budget-migrations/analyze');
      setDonors(res.data.donors || []);
      setReceivers(res.data.receivers || []);
      setSuggestions(res.data.suggestions || []);
    } catch { message.error('Failed to analyze campaigns'); }
    setLoading(false);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/budget-migrations', { params: { limit: 50 } });
      setMigrations(res.data.data || res.data || []);
    } catch { message.error('Failed to load migration history'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalysis();
    fetchHistory();
  }, []);

  const handleCreateMigration = async (suggestion: Suggestion) => {
    try {
      await api.post('/budget-migrations', {
        sourceCampaignId: suggestion.from.campaignId,
        targetCampaignId: suggestion.to.campaignId,
        sourceSkuId: suggestion.from.skuId,
        targetSkuId: suggestion.to.skuId,
        migratedAmount: suggestion.amount,
      });
      message.success('Budget migration created');
      fetchHistory();
    } catch { message.error('Failed to create migration'); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/budget-migrations/${id}/approve`);
      message.success('Migration approved');
      fetchHistory();
    } catch { message.error('Failed'); }
  };

  const handleExecute = async (id: string) => {
    try {
      await api.patch(`/budget-migrations/${id}/execute`);
      message.success('Migration executed');
      fetchHistory();
    } catch { message.error('Failed'); }
  };

  const handleRollback = async (id: string) => {
    try {
      await api.patch(`/budget-migrations/${id}/rollback`);
      message.success('Migration rolled back');
      fetchHistory();
    } catch { message.error('Failed'); }
  };

  const campaignColumns = [
    { title: 'Campaign', dataIndex: 'campaignId', key: 'campaignId',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 12)}...</span> },
    { title: 'SKU', dataIndex: 'skuId', key: 'skuId',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 8)}...</span> },
    { title: 'ROAS', dataIndex: 'roas', key: 'roas',
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 1.5 ? '#cf1322' : v > 3 ? '#3f8600' : undefined }}>{v?.toFixed(2)}</span> },
    { title: '30日花费', dataIndex: 'totalSpend', key: 'totalSpend',
      render: (v: number) => `$${v?.toFixed(2)}` },
    { title: '30日收入', dataIndex: 'totalRevenue', key: 'totalRevenue',
      render: (v: number) => `$${v?.toFixed(2)}` },
    { title: '日预算', dataIndex: 'dailyBudget', key: 'dailyBudget',
      render: (v: number) => `$${v?.toFixed(2)}` },
  ];

  const migrationColumns = [
    { title: '来源Campaign', dataIndex: 'sourceCampaignId', key: 'source',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 12)}</span> },
    { title: '', key: 'arrow', width: 40, render: () => <ArrowRightOutlined /> },
    { title: '目标Campaign', dataIndex: 'targetCampaignId', key: 'target',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 12)}</span> },
    { title: '迁移金额', dataIndex: 'migratedAmount', key: 'amount',
      render: (v: number) => <span style={{ fontWeight: 600 }}>${v?.toFixed(2)}</span> },
    { title: '来源ROAS', dataIndex: 'sourceRoas', key: 'sourceRoas',
      render: (v: number) => <span style={{ color: '#cf1322' }}>{v?.toFixed(2)}</span> },
    { title: '目标ROAS', dataIndex: 'targetRoas', key: 'targetRoas',
      render: (v: number) => <span style={{ color: '#3f8600' }}>{v?.toFixed(2)}</span> },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: '操作', key: 'actions', render: (_: unknown, r: BudgetMigration) => (
      <Space>
        {r.status === 'PENDING' && <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>审批</Button>}
        {r.status === 'APPROVED' && <Button size="small" type="primary" onClick={() => handleExecute(r.id)}>执行</Button>}
        {r.status === 'EXECUTED' && <Button size="small" danger onClick={() => handleRollback(r.id)}>回滚</Button>}
      </Space>
    )},
  ];

  const totalDonorSpend = donors.reduce((s, d) => s + d.totalSpend, 0);
  const totalReceiverSpend = receivers.reduce((s, d) => s + d.totalSpend, 0);
  const potentialSavings = suggestions.reduce((s, sg) => s + sg.amount, 0);

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="低效Campaign" value={donors.length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="高效Campaign" value={receivers.length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="可迁移预算" value={potentialSavings} prefix="$" precision={2} /></Card></Col>
        <Col span={6}><Card><Statistic title="迁移记录" value={migrations.length} /></Card></Col>
      </Row>

      <Card
        tabList={[
          { key: 'analysis', tab: '预算分析' },
          { key: 'history', tab: '迁移记录' },
        ]}
        activeTabKey={tab}
        onTabChange={(k) => setTab(k as 'analysis' | 'history')}
      >
        {tab === 'analysis' ? (
          <div>
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Card title="迁移建议" size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                {suggestions.map((sg, idx) => (
                  <div key={idx} style={{ padding: '8px 0', borderBottom: idx < suggestions.length - 1 ? '1px solid #f0f0f0' : undefined }}>
                    <Space align="center">
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{sg.from.campaignId?.slice(0, 12)}</span>
                      <Tag color="red">ROAS {sg.from.roas.toFixed(2)}</Tag>
                      <SwapOutlined />
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{sg.to.campaignId?.slice(0, 12)}</span>
                      <Tag color="green">ROAS {sg.to.roas.toFixed(2)}</Tag>
                      <span style={{ fontWeight: 600 }}>迁移 ${sg.amount.toFixed(2)}/天</span>
                      <Tag color="gold">预期ROAS提升 +{sg.expectedRoasGain.toFixed(2)}</Tag>
                      <Button size="small" type="primary" onClick={() => handleCreateMigration(sg)}>创建迁移</Button>
                    </Space>
                  </div>
                ))}
              </Card>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Card title={`低效捐赠者 (ROAS < 1.5) — ${donors.length}个`} size="small">
                  <Table dataSource={donors} columns={campaignColumns} rowKey="campaignId" size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={`高效接收者 (ROAS > 3.0) — ${receivers.length}个`} size="small">
                  <Table dataSource={receivers} columns={campaignColumns} rowKey="campaignId" size="small" pagination={false} />
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <Table dataSource={migrations} columns={migrationColumns} rowKey="id" loading={loading} />
        )}
      </Card>
    </div>
  );
}
