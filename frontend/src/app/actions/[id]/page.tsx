'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Steps, Button, Space, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';
import RiskTag from '@/components/common/RiskTag';
import { useActionStore } from '@/store/useActionStore';
import { ActionStatus } from '@/types';
import dayjs from 'dayjs';

const statusSteps = [
  ActionStatus.DRAFT, ActionStatus.SUBMITTED, ActionStatus.APPROVED,
  ActionStatus.EXECUTED, ActionStatus.VERIFIED, ActionStatus.CLOSED,
];

export default function ActionDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();
  const { currentAction, detailLoading: loading, fetchActionDetail, submitAction, approveAction, rejectAction } = useActionStore();
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchActionDetail(id);
  }, [id, fetchActionDetail]);

  const action = currentAction;

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!action) return <Card>动作不存在</Card>;

  const currentStep = statusSteps.indexOf(action.status as ActionStatus);
  const riskLabel = action.riskScore >= 5 ? 'HIGH' : action.riskScore >= 3 ? 'MEDIUM' : 'LOW';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await approveAction(action.id);
      message.success('已批准');
      setApprovalComment('');
    } catch {
      message.error('批准失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await rejectAction(action.id);
      message.warning('已拒绝');
      setApprovalComment('');
    } catch {
      message.error('拒绝失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitAction(action.id);
      message.success('已提交');
    } catch {
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const safeStringify = (val: unknown) => {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return '{}';
    }
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>返回</Button>

      <Card title="动作状态流程" bordered={false} style={{ marginBottom: 16 }}>
        <Steps current={Math.max(currentStep, 0)} status={action.status === ActionStatus.REJECTED ? 'error' : action.status === ActionStatus.EXECUTED_FAILED ? 'error' : 'process'} items={statusSteps.map((s) => ({ title: s }))} />
      </Card>

      <Card title="动作详情" bordered={false} style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="类型">{action.type.replace(/_/g, ' ')}</Descriptions.Item>
          <Descriptions.Item label="状态"><StatusTag status={action.status} /></Descriptions.Item>
          <Descriptions.Item label="SKU">{action.skuName}</Descriptions.Item>
          <Descriptions.Item label="风险"><RiskTag level={riskLabel} /> (score: {action.riskScore})</Descriptions.Item>
          <Descriptions.Item label="需审批">{action.requiresApproval ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="创建人">{action.createdBy}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(action.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {action.executedAt && <Descriptions.Item label="执行时间">{dayjs(action.executedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card title="动作参数" bordered={false} style={{ marginBottom: 16 }}>
        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, fontSize: 13, overflow: 'auto' }}>
          {safeStringify(action.params)}
        </pre>
      </Card>

      <Card title="护栏配置" bordered={false} style={{ marginBottom: 16 }}>
        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, fontSize: 13, overflow: 'auto' }}>
          {safeStringify(action.guardrails)}
        </pre>
      </Card>

      {action.status === ActionStatus.SUBMITTED && (
        <Card title="审批操作" bordered={false} style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={3}
            placeholder="审批意见（可选）"
            style={{ marginBottom: 12 }}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
          />
          <Space>
            <Button type="primary" loading={submitting} onClick={handleApprove}>批准</Button>
            <Button danger loading={submitting} onClick={handleReject}>拒绝</Button>
          </Space>
        </Card>
      )}

      {action.status === ActionStatus.DRAFT && (
        <Button type="primary" loading={submitting} onClick={handleSubmit}>提交审批</Button>
      )}

      {action.verificationResult && (
        <Card title="验证结果" bordered={false} style={{ marginTop: 16 }}>
          <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, fontSize: 13, overflow: 'auto' }}>
            {safeStringify(action.verificationResult)}
          </pre>
        </Card>
      )}

      {action.status === ActionStatus.EXECUTED && (
        <Button danger style={{ marginTop: 16 }} onClick={() => message.info('回滚请求已发送')}>回滚此动作</Button>
      )}
    </div>
  );
}
