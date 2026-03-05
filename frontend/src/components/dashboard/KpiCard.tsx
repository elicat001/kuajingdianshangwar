'use client';
import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  trend?: number; // positive = up, negative = down
  color?: string;
}

export default function KpiCard({ title, value, prefix, suffix, trend, color }: Props) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <Statistic
        title={<span style={{ color: '#8c8c8c' }}>{title}</span>}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: color || '#16213e', fontWeight: 700 }}
      />
      {trend !== undefined && (
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {trend >= 0 ? (
            <span style={{ color: '#3f8600' }}><ArrowUpOutlined /> {Math.abs(trend)}%</span>
          ) : (
            <span style={{ color: '#cf1322' }}><ArrowDownOutlined /> {Math.abs(trend)}%</span>
          )}
          <span style={{ color: '#bbb', marginLeft: 8 }}>vs 上周</span>
        </div>
      )}
    </Card>
  );
}
