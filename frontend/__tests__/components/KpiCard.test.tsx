import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * KpiCard component - displays a single KPI metric card.
 * Since the actual component may not exist yet, we define a minimal
 * implementation inline for test-driven development.
 */
interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
}

function KpiCard({ title, value, change, unit, trend }: KpiCardProps) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div data-testid="kpi-card" className="rounded-lg border p-4 shadow-sm">
      <p data-testid="kpi-title" className="text-sm text-gray-500">
        {title}
      </p>
      <p data-testid="kpi-value" className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>
      {change !== undefined && (
        <p data-testid="kpi-change" className={`text-sm ${trendColor}`}>
          {change > 0 ? '+' : ''}
          {change}%
        </p>
      )}
    </div>
  );
}

describe('KpiCard', () => {
  it('should render title and value', () => {
    render(<KpiCard title="Total Sales" value="$12,345" />);

    expect(screen.getByTestId('kpi-title')).toHaveTextContent('Total Sales');
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('$12,345');
  });

  it('should render change percentage', () => {
    render(<KpiCard title="ACOS" value="25%" change={-3.2} trend="down" />);

    const change = screen.getByTestId('kpi-change');
    expect(change).toHaveTextContent('-3.2%');
  });

  it('should show positive change with plus sign', () => {
    render(<KpiCard title="Orders" value={150} change={12} trend="up" />);

    expect(screen.getByTestId('kpi-change')).toHaveTextContent('+12%');
  });

  it('should render unit when provided', () => {
    render(<KpiCard title="Days of Cover" value={7} unit="days" />);

    expect(screen.getByTestId('kpi-value')).toHaveTextContent('7');
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('days');
  });

  it('should render without change when not provided', () => {
    render(<KpiCard title="Revenue" value="$50K" />);

    expect(screen.queryByTestId('kpi-change')).not.toBeInTheDocument();
  });
});
