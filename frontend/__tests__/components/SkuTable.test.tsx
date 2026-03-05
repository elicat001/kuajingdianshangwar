import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * SkuTable component - renders a table of SKUs with sortable columns.
 */
interface Sku {
  id: string;
  sku: string;
  asin: string;
  title: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'TESTING';
}

interface SkuTableProps {
  skus: Sku[];
  onRowClick?: (sku: Sku) => void;
  onSort?: (field: string) => void;
}

function SkuTable({ skus, onRowClick, onSort }: SkuTableProps) {
  if (skus.length === 0) {
    return <p data-testid="empty-table">No SKUs found</p>;
  }

  return (
    <table data-testid="sku-table">
      <thead>
        <tr>
          <th data-testid="header-sku" onClick={() => onSort?.('sku')}>
            SKU
          </th>
          <th data-testid="header-asin" onClick={() => onSort?.('asin')}>
            ASIN
          </th>
          <th data-testid="header-title" onClick={() => onSort?.('title')}>
            Title
          </th>
          <th data-testid="header-price" onClick={() => onSort?.('price')}>
            Price
          </th>
          <th data-testid="header-status">Status</th>
        </tr>
      </thead>
      <tbody>
        {skus.map((sku) => (
          <tr
            key={sku.id}
            data-testid={`sku-row-${sku.id}`}
            onClick={() => onRowClick?.(sku)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            <td data-testid={`sku-code-${sku.id}`}>{sku.sku}</td>
            <td data-testid={`sku-asin-${sku.id}`}>{sku.asin}</td>
            <td data-testid={`sku-title-${sku.id}`}>{sku.title}</td>
            <td data-testid={`sku-price-${sku.id}`}>${sku.price.toFixed(2)}</td>
            <td data-testid={`sku-status-${sku.id}`}>{sku.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe('SkuTable', () => {
  const mockSkus: Sku[] = [
    {
      id: 's1',
      sku: 'SKU-001',
      asin: 'B001234567',
      title: 'Widget Pro',
      price: 29.99,
      status: 'ACTIVE',
    },
    {
      id: 's2',
      sku: 'SKU-002',
      asin: 'B002345678',
      title: 'Gadget Plus',
      price: 49.99,
      status: 'TESTING',
    },
  ];

  it('should render table with all SKUs', () => {
    render(<SkuTable skus={mockSkus} />);

    expect(screen.getByTestId('sku-table')).toBeInTheDocument();
    expect(screen.getByTestId('sku-row-s1')).toBeInTheDocument();
    expect(screen.getByTestId('sku-row-s2')).toBeInTheDocument();
  });

  it('should display SKU details in each row', () => {
    render(<SkuTable skus={mockSkus} />);

    expect(screen.getByTestId('sku-code-s1')).toHaveTextContent('SKU-001');
    expect(screen.getByTestId('sku-asin-s1')).toHaveTextContent('B001234567');
    expect(screen.getByTestId('sku-title-s1')).toHaveTextContent('Widget Pro');
    expect(screen.getByTestId('sku-price-s1')).toHaveTextContent('$29.99');
    expect(screen.getByTestId('sku-status-s1')).toHaveTextContent('ACTIVE');
  });

  it('should call onRowClick when clicking a row', () => {
    const onClick = jest.fn();
    render(<SkuTable skus={mockSkus} onRowClick={onClick} />);

    fireEvent.click(screen.getByTestId('sku-row-s2'));
    expect(onClick).toHaveBeenCalledWith(mockSkus[1]);
  });

  it('should call onSort when clicking column header', () => {
    const onSort = jest.fn();
    render(<SkuTable skus={mockSkus} onSort={onSort} />);

    fireEvent.click(screen.getByTestId('header-price'));
    expect(onSort).toHaveBeenCalledWith('price');
  });

  it('should render all table headers', () => {
    render(<SkuTable skus={mockSkus} />);

    expect(screen.getByTestId('header-sku')).toBeInTheDocument();
    expect(screen.getByTestId('header-asin')).toBeInTheDocument();
    expect(screen.getByTestId('header-title')).toBeInTheDocument();
    expect(screen.getByTestId('header-price')).toBeInTheDocument();
    expect(screen.getByTestId('header-status')).toBeInTheDocument();
  });

  it('should show empty state when no SKUs', () => {
    render(<SkuTable skus={[]} />);

    expect(screen.getByTestId('empty-table')).toHaveTextContent('No SKUs found');
    expect(screen.queryByTestId('sku-table')).not.toBeInTheDocument();
  });
});
