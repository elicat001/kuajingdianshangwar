import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * AlertList component - renders a list of alerts with status and actions.
 */
interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED';
  title: string;
  message: string;
  createdAt: string;
}

interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onClose?: (id: string) => void;
}

function AlertList({ alerts, onAcknowledge, onClose }: AlertListProps) {
  if (alerts.length === 0) {
    return <p data-testid="empty-state">No alerts found</p>;
  }

  return (
    <ul data-testid="alert-list">
      {alerts.map((alert) => (
        <li key={alert.id} data-testid={`alert-item-${alert.id}`} className="border-b py-3">
          <div className="flex items-center justify-between">
            <div>
              <span
                data-testid={`alert-severity-${alert.id}`}
                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-red-100 text-red-800'
                    : alert.severity === 'HIGH'
                      ? 'bg-orange-100 text-orange-800'
                      : alert.severity === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {alert.severity}
              </span>
              <span data-testid={`alert-title-${alert.id}`} className="ml-2 font-medium">
                {alert.title}
              </span>
            </div>
            <span data-testid={`alert-status-${alert.id}`} className="text-sm text-gray-500">
              {alert.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          <div className="mt-2 flex gap-2">
            {alert.status === 'OPEN' && onAcknowledge && (
              <button
                data-testid={`ack-btn-${alert.id}`}
                onClick={() => onAcknowledge(alert.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                Acknowledge
              </button>
            )}
            {alert.status !== 'CLOSED' && onClose && (
              <button
                data-testid={`close-btn-${alert.id}`}
                onClick={() => onClose(alert.id)}
                className="text-xs text-gray-600 hover:underline"
              >
                Close
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

describe('AlertList', () => {
  const mockAlerts: Alert[] = [
    {
      id: 'a1',
      type: 'STOCKOUT',
      severity: 'HIGH',
      status: 'OPEN',
      title: 'Low Stock Warning',
      message: 'SKU-001 has only 2 days of cover',
      createdAt: '2024-06-15T10:00:00Z',
    },
    {
      id: 'a2',
      type: 'ADS_WASTE',
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      title: 'Ad Spend Alert',
      message: 'High ACOS on campaign X',
      createdAt: '2024-06-14T08:00:00Z',
    },
  ];

  it('should render all alert items', () => {
    render(<AlertList alerts={mockAlerts} />);

    expect(screen.getByTestId('alert-list')).toBeInTheDocument();
    expect(screen.getByTestId('alert-item-a1')).toBeInTheDocument();
    expect(screen.getByTestId('alert-item-a2')).toBeInTheDocument();
  });

  it('should display severity badge', () => {
    render(<AlertList alerts={mockAlerts} />);

    expect(screen.getByTestId('alert-severity-a1')).toHaveTextContent('HIGH');
    expect(screen.getByTestId('alert-severity-a2')).toHaveTextContent('MEDIUM');
  });

  it('should display alert title and status', () => {
    render(<AlertList alerts={mockAlerts} />);

    expect(screen.getByTestId('alert-title-a1')).toHaveTextContent('Low Stock Warning');
    expect(screen.getByTestId('alert-status-a1')).toHaveTextContent('OPEN');
  });

  it('should show acknowledge button only for OPEN alerts', () => {
    const onAck = jest.fn();
    render(<AlertList alerts={mockAlerts} onAcknowledge={onAck} />);

    expect(screen.getByTestId('ack-btn-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('ack-btn-a2')).not.toBeInTheDocument();
  });

  it('should call onAcknowledge when clicking acknowledge button', () => {
    const onAck = jest.fn();
    render(<AlertList alerts={mockAlerts} onAcknowledge={onAck} />);

    fireEvent.click(screen.getByTestId('ack-btn-a1'));
    expect(onAck).toHaveBeenCalledWith('a1');
  });

  it('should call onClose when clicking close button', () => {
    const onClose = jest.fn();
    render(<AlertList alerts={mockAlerts} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn-a1'));
    expect(onClose).toHaveBeenCalledWith('a1');
  });

  it('should show empty state when no alerts', () => {
    render(<AlertList alerts={[]} />);

    expect(screen.getByTestId('empty-state')).toHaveTextContent('No alerts found');
  });
});
