'use client';
import { Tag } from 'antd';

const colorMap: Record<string, string> = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };

export default function RiskTag({ level }: { level: string }) {
  return <Tag color={colorMap[level] || 'default'}>{level}</Tag>;
}
