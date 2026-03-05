import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * StatusTag component - renders a colored badge for various status values.
 */
interface StatusTagProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-800' },
  ACKNOWLEDGED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' },
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600' },
  SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  EXECUTED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  EXECUTED_FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
  VERIFIED: { bg: 'bg-teal-100', text: 'text-teal-700' },
  ROLLED_BACK: { bg: 'bg-orange-100', text: 'text-orange-700' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ACCEPTED: { bg: 'bg-green-100', text: 'text-green-700' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-3 py-1',
};

function StatusTag({ status, size = 'md' }: StatusTagProps) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      data-testid="status-tag"
      data-status={status}
      className={`inline-block rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClass}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

describe('StatusTag', () => {
  it('should render the status text', () => {
    render(<StatusTag status="OPEN" />);
    expect(screen.getByTestId('status-tag')).toHaveTextContent('OPEN');
  });

  it('should replace underscores with spaces', () => {
    render(<StatusTag status="EXECUTED_FAILED" />);
    expect(screen.getByTestId('status-tag')).toHaveTextContent('EXECUTED FAILED');
  });

  it('should render with data-status attribute', () => {
    render(<StatusTag status="APPROVED" />);
    expect(screen.getByTestId('status-tag')).toHaveAttribute('data-status', 'APPROVED');
  });

  it('should render all known statuses without error', () => {
    const statuses = [
      'OPEN', 'ACKNOWLEDGED', 'CLOSED',
      'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED',
      'EXECUTED', 'EXECUTED_FAILED', 'VERIFIED', 'ROLLED_BACK',
      'PENDING', 'ACCEPTED', 'ACTIVE', 'INACTIVE',
    ];

    statuses.forEach((status) => {
      const { unmount } = render(<StatusTag status={status} />);
      const tag = screen.getByTestId('status-tag');
      expect(tag).toBeInTheDocument();
      expect(tag).toHaveAttribute('data-status', status);
      unmount();
    });
  });

  it('should handle unknown status gracefully', () => {
    render(<StatusTag status="UNKNOWN_STATUS" />);
    expect(screen.getByTestId('status-tag')).toHaveTextContent('UNKNOWN STATUS');
  });

  it('should apply size classes', () => {
    const { unmount } = render(<StatusTag status="OPEN" size="sm" />);
    expect(screen.getByTestId('status-tag')).toBeInTheDocument();
    unmount();

    render(<StatusTag status="OPEN" size="lg" />);
    expect(screen.getByTestId('status-tag')).toBeInTheDocument();
  });

  it('should default to md size', () => {
    render(<StatusTag status="OPEN" />);
    expect(screen.getByTestId('status-tag')).toBeInTheDocument();
  });
});
