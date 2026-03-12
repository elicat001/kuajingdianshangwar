'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Descriptions, Tag, Button, Space, Steps, Statistic,
  Row, Col, Timeline, Spin, message, Popconfirm, Input,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import type { ProductTest, ProductTestGate, ProductTestBudget, GateMetrics } from '@/types';

const gateColors: Record<string, string> = {
  GATE_0: 'default', GATE_1: 'blue', GATE_2: 'cyan',
  GATE_3: 'green', GRADUATED: 'gold', KILLED: 'red',
};

const gateDescriptions: Record<string, string> = {
  GATE_0: '上架验证 — Listing/图片/库存就绪',
  GATE_1: '验证期 (7天) — 订单>5, CVR>1%',
  GATE_2: '放量期 (14天) — ACOS<40%, 自然单>20%',
  GATE_3: '稳定期 (30天) — 利润率>10%, 排名稳定',
  GRADUATED: '已毕业 — 转正式SKU',
  KILLED: '已终止',
};

const GATE_ORDER = ['GATE_0', 'GATE_1', 'GATE_2', 'GATE_3', 'GRADUATED'];

export default function ProductTestDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();

  const [test, setTest] = useState<ProductTest | null>(null);
  const [metrics, setMetrics] = useState<GateMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [killReason, setKillReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testRes, metricsRes] = await Promise.all([
        api.get(`/product-tests/${id}`),
        api.get(`/product-tests/${id}/metrics`).catch(() => ({ data: null })),
      ]);
      setTest(testRes.data);
      setMetrics(metricsRes.data);
    } catch {
      message.error('Failed to load test data');
    }
    setLoading(false);
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const handleAdvance = async () => {
    try {
      await api.patch(`/product-tests/${id}/advance`, { decision: 'ADVANCE' });
      message.success('Gate advanced successfully');
      fetchData();
    } catch {
      message.error('Failed to advance gate');
    }
  };

  const handleKill = async () => {
    try {
      await api.patch(`/product-tests/${id}/advance`, { decision: 'KILL', comment: killReason || 'Manual termination' });
      message.success('Test terminated');
      fetchData();
    } catch {
      message.error('Failed to kill test');
    }
  };

  if (loading || !test) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  const gates: ProductTestGate[] = test.gates || [];
  const budgets: ProductTestBudget[] = test.budgets || [];
  const currentStepIdx = GATE_ORDER.indexOf(test.currentGate);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/product-tests')}>返回</Button>
        <span style={{ fontSize: 20, fontWeight: 600 }}>{test.testName}</span>
        <Tag color={gateColors[test.currentGate]}>{test.currentGate}</Tag>
        <Tag color={test.status === 'ACTIVE' ? 'processing' : test.status === 'GRADUATED' ? 'success' : test.status === 'KILLED' ? 'error' : 'warning'}>
          {test.status}
        </Tag>
      </Space>

      {/* Gate Progress */}
      <Card title="Gate 进度" style={{ marginBottom: 16 }}>
        <Steps
          current={currentStepIdx >= 0 ? currentStepIdx : 0}
          status={test.status === 'KILLED' ? 'error' : test.status === 'GRADUATED' ? 'finish' : 'process'}
          items={GATE_ORDER.map((gate) => ({
            title: gate === 'GRADUATED' ? '毕业' : gate.replace('_', ' '),
            description: gateDescriptions[gate],
          }))}
        />
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Current Gate Metrics */}
        <Col span={16}>
          <Card title="当前 Gate 指标">
            {metrics ? (
              <Row gutter={16}>
                <Col span={6}><Statistic title="Gate 内天数" value={metrics.daysInGate} suffix="天" /></Col>
                <Col span={6}><Statistic title="总订单" value={metrics.totalOrders} /></Col>
                <Col span={6}><Statistic title="CVR" value={metrics.cvr} suffix="%" precision={2} /></Col>
                <Col span={6}><Statistic title="ACOS" value={metrics.acos} suffix="%" precision={1}
                  valueStyle={{ color: metrics.acos > 40 ? '#cf1322' : '#3f8600' }} /></Col>
                <Col span={6} style={{ marginTop: 16 }}><Statistic title="自然单占比" value={metrics.organicOrderPct} suffix="%" precision={1} /></Col>
                <Col span={6} style={{ marginTop: 16 }}><Statistic title="利润率" value={metrics.marginPct} suffix="%" precision={1} /></Col>
                <Col span={6} style={{ marginTop: 16 }}><Statistic title="总广告花费" value={metrics.totalAdSpend} prefix="$" precision={2} /></Col>
                <Col span={6} style={{ marginTop: 16 }}><Statistic title="总收入" value={metrics.totalRevenue} prefix="$" precision={2} /></Col>
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无指标数据</div>
            )}
          </Card>
        </Col>

        {/* Test Info */}
        <Col span={8}>
          <Card title="测试信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="SKU ID">
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{test.skuId}</span>
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {test.startedAt ? new Date(test.startedAt).toLocaleDateString() : '-'}
              </Descriptions.Item>
              {test.graduatedAt && (
                <Descriptions.Item label="毕业时间">
                  {new Date(test.graduatedAt).toLocaleDateString()}
                </Descriptions.Item>
              )}
              {test.killedAt && (
                <Descriptions.Item label="终止时间">
                  {new Date(test.killedAt).toLocaleDateString()}
                </Descriptions.Item>
              )}
              {test.killReason && (
                <Descriptions.Item label="终止原因">
                  <span style={{ color: '#cf1322' }}>{test.killReason}</span>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {new Date(test.createdAt).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Gate Timeline */}
      <Card title="Gate 时间线" style={{ marginBottom: 16 }}>
        <Timeline
          items={gates.map((gate) => ({
            color: gate.exitDecision === 'KILL' ? 'red' : gate.exitDecision === 'ADVANCE' ? 'green' : 'blue',
            dot: gate.exitDecision === 'KILL' ? <CloseCircleOutlined /> :
                 gate.exitDecision === 'ADVANCE' ? <CheckCircleOutlined /> :
                 !gate.exitedAt ? <ClockCircleOutlined /> : undefined,
            children: (
              <div>
                <div style={{ fontWeight: 600 }}>
                  <Tag color={gateColors[gate.gateName]}>{gate.gateName}</Tag>
                  {gate.exitDecision && <Tag>{gate.exitDecision}</Tag>}
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  进入: {new Date(gate.enteredAt).toLocaleString()}
                  {gate.exitedAt && ` → 退出: ${new Date(gate.exitedAt).toLocaleString()}`}
                </div>
                {gate.metricsAtExit && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                    退出指标: 订单 {(gate.metricsAtExit as GateMetrics).totalOrders},
                    CVR {(gate.metricsAtExit as GateMetrics).cvr?.toFixed(2)}%,
                    ACOS {(gate.metricsAtExit as GateMetrics).acos?.toFixed(1)}%
                  </div>
                )}
              </div>
            ),
          }))}
        />
      </Card>

      {/* Budget Burndown */}
      {budgets.length > 0 && (
        <Card title="预算消耗" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {budgets.map((b) => (
              <Col span={6} key={b.id}>
                <Card size="small" title={b.gateName}>
                  <Statistic
                    title="已花费 / 限额"
                    value={b.spentToDate}
                    suffix={b.totalBudgetLimit ? ` / $${b.totalBudgetLimit}` : ''}
                    prefix="$"
                    precision={2}
                    valueStyle={{
                      color: b.totalBudgetLimit && b.spentToDate > b.totalBudgetLimit ? '#cf1322' : undefined,
                    }}
                  />
                  {b.dailyBudgetLimit && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      日预算上限: ${b.dailyBudgetLimit}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Actions */}
      {test.status === 'ACTIVE' && (
        <Card title="操作">
          <Space>
            <Button type="primary" onClick={handleAdvance}>
              晋级到下一 Gate
            </Button>
            <Popconfirm
              title="确定终止该测试?"
              description={
                <Input.TextArea
                  placeholder="终止原因"
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  rows={2}
                />
              }
              onConfirm={handleKill}
              okText="确定终止"
              okType="danger"
              cancelText="取消"
            >
              <Button danger>终止测试</Button>
            </Popconfirm>
          </Space>
        </Card>
      )}
    </div>
  );
}
