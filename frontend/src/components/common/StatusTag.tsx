'use client';
import { Tag } from 'antd';

const colorMap: Record<string, string> = {
  OPEN: 'error', ACKNOWLEDGED: 'warning', CLOSED: 'default',
  DRAFT: 'default', SUBMITTED: 'processing', APPROVED: 'success', REJECTED: 'error',
  EXECUTED: 'blue', EXECUTED_FAILED: 'red', VERIFIED: 'green', ROLLED_BACK: 'orange', CLOSED_ACTION: 'default',
  PENDING: 'processing', ACCEPTED: 'success', EXPIRED: 'default',
  ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'error', TESTING: 'processing', DISCONTINUED: 'default',
};

export default function StatusTag({ status }: { status: string }) {
  return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
}
