import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * ActionQueue component - displays pending actions and their status.
 */
interface Action {
  id: string;
  type: string;
  status: string;
  skuId: string;
  createdBy: string;
  requiresApproval: boolean;
  createdAt: string;
}

interface ActionQueueProps {
  actions: Action[];
  onSubmit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

function ActionQueue({ actions, onSubmit, onApprove, onReject }: ActionQueueProps) {
  if (actions.length === 0) {
    return <p data-testid="empty-queue">No pending actions</p>;
  }

  return (
    <div data-testid="action-queue">
      <h2 data-testid="queue-title">Action Queue ({actions.length})</h2>
      <ul>
        {actions.map((action) => (
          <li key={action.id} data-testid={`action-item-${action.id}`} className="border-b py-2">
            <div className="flex items-center justify-between">
              <div>
                <span data-testid={`action-type-${action.id}`} className="font-medium">
                  {action.type.replace(/_/g, ' ')}
                </span>
                <span
                  data-testid={`action-status-${action.id}`}
                  className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100"
                >
                  {action.status}
                </span>
              </div>
              <div className="flex gap-1">
                {action.status === 'DRAFT' && onSubmit && (
                  <button
                    data-testid={`submit-btn-${action.id}`}
                    onClick={() => onSubmit(action.id)}
                    className="text-xs text-blue-600"
                  >
                    Submit
                  </button>
                )}
                {action.status === 'SUBMITTED' && onApprove && (
                  <button
                    data-testid={`approve-btn-${action.id}`}
                    onClick={() => onApprove(action.id)}
                    className="text-xs text-green-600"
                  >
                    Approve
                  </button>
                )}
                {action.status === 'SUBMITTED' && onReject && (
                  <button
                    data-testid={`reject-btn-${action.id}`}
                    onClick={() => onReject(action.id)}
                    className="text-xs text-red-600"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              SKU: {action.skuId} | By: {action.createdBy}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('ActionQueue', () => {
  const mockActions: Action[] = [
    {
      id: 'act-1',
      type: 'ADJUST_PRICE',
      status: 'DRAFT',
      skuId: 'SKU-001',
      createdBy: 'user-1',
      requiresApproval: true,
      createdAt: '2024-06-15T10:00:00Z',
    },
    {
      id: 'act-2',
      type: 'PAUSE_ADGROUP',
      status: 'SUBMITTED',
      skuId: 'SKU-002',
      createdBy: 'user-2',
      requiresApproval: true,
      createdAt: '2024-06-15T11:00:00Z',
    },
    {
      id: 'act-3',
      type: 'ADJUST_BID',
      status: 'APPROVED',
      skuId: 'SKU-003',
      createdBy: 'user-1',
      requiresApproval: false,
      createdAt: '2024-06-15T12:00:00Z',
    },
  ];

  it('should render all actions', () => {
    render(<ActionQueue actions={mockActions} />);

    expect(screen.getByTestId('action-queue')).toBeInTheDocument();
    expect(screen.getByTestId('action-item-act-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-item-act-2')).toBeInTheDocument();
    expect(screen.getByTestId('action-item-act-3')).toBeInTheDocument();
  });

  it('should display action count in title', () => {
    render(<ActionQueue actions={mockActions} />);

    expect(screen.getByTestId('queue-title')).toHaveTextContent('Action Queue (3)');
  });

  it('should display type and status for each action', () => {
    render(<ActionQueue actions={mockActions} />);

    expect(screen.getByTestId('action-type-act-1')).toHaveTextContent('ADJUST PRICE');
    expect(screen.getByTestId('action-status-act-1')).toHaveTextContent('DRAFT');
    expect(screen.getByTestId('action-status-act-2')).toHaveTextContent('SUBMITTED');
  });

  it('should show Submit button only for DRAFT actions', () => {
    const onSubmit = jest.fn();
    render(<ActionQueue actions={mockActions} onSubmit={onSubmit} />);

    expect(screen.getByTestId('submit-btn-act-1')).toBeInTheDocument();
    expect(screen.queryByTestId('submit-btn-act-2')).not.toBeInTheDocument();
  });

  it('should show Approve/Reject buttons only for SUBMITTED actions', () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    render(<ActionQueue actions={mockActions} onApprove={onApprove} onReject={onReject} />);

    expect(screen.getByTestId('approve-btn-act-2')).toBeInTheDocument();
    expect(screen.getByTestId('reject-btn-act-2')).toBeInTheDocument();
    expect(screen.queryByTestId('approve-btn-act-1')).not.toBeInTheDocument();
  });

  it('should call onSubmit when clicking Submit', () => {
    const onSubmit = jest.fn();
    render(<ActionQueue actions={mockActions} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId('submit-btn-act-1'));
    expect(onSubmit).toHaveBeenCalledWith('act-1');
  });

  it('should call onApprove when clicking Approve', () => {
    const onApprove = jest.fn();
    render(<ActionQueue actions={mockActions} onApprove={onApprove} />);

    fireEvent.click(screen.getByTestId('approve-btn-act-2'));
    expect(onApprove).toHaveBeenCalledWith('act-2');
  });

  it('should call onReject when clicking Reject', () => {
    const onReject = jest.fn();
    render(<ActionQueue actions={mockActions} onReject={onReject} />);

    fireEvent.click(screen.getByTestId('reject-btn-act-2'));
    expect(onReject).toHaveBeenCalledWith('act-2');
  });

  it('should show empty state when no actions', () => {
    render(<ActionQueue actions={[]} />);

    expect(screen.getByTestId('empty-queue')).toHaveTextContent('No pending actions');
  });
});
