import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the correct label for "draft"', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders the correct label for "submitted"', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('renders the correct label for "approved"', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders "consolidated" label', () => {
    render(<StatusBadge status="consolidated" />);
    expect(screen.getByText('Consolidated')).toBeInTheDocument();
  });

  it('falls back to status key for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('applies color class for known status', () => {
    const { container } = render(<StatusBadge status="for_revision" />);
    const badge = container.querySelector('.badge');
    expect(badge?.className).toMatch(/amber/);
  });
});
