'use client';
import { Badge } from 'antd';
import type { PresetStatusColorType } from 'antd/es/_util/colors';

const map: Record<string, PresetStatusColorType> = {
  CRITICAL: 'error', HIGH: 'error', MEDIUM: 'warning', LOW: 'processing',
};
const textColor: Record<string, string> = {
  CRITICAL: '#cf1322', HIGH: '#fa541c', MEDIUM: '#faad14', LOW: '#1677ff',
};

export default function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge status={map[severity] || 'default'} text={<span style={{ color: textColor[severity], fontWeight: 600 }}>{severity}</span>} />
  );
}
