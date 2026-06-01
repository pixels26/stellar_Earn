import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders offline banner when isOffline is true', () => {
    render(<OfflineIndicator isOffline={true} />);

    expect(
      screen.getByText('You appear to be offline. Some features may not work.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not render when isOffline is false', () => {
    const { container } = render(<OfflineIndicator isOffline={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('displays custom message when provided', () => {
    const customMessage = 'Custom offline message';
    render(<OfflineIndicator isOffline={true} message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('shows dismiss button and calls onDismiss when clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <OfflineIndicator isOffline={true} onDismiss={onDismiss} />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows success message when coming back online', async () => {
    const { rerender } = render(<OfflineIndicator isOffline={true} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<OfflineIndicator isOffline={false} />);

    await waitFor(() => {
      expect(screen.getByText('Connection restored')).toBeInTheDocument();
    });
  });

  it('auto-dismisses after 3 seconds when coming back online', async () => {
    const onDismiss = vi.fn();
    vi.useFakeTimers();

    const { rerender } = render(
      <OfflineIndicator isOffline={true} onDismiss={onDismiss} />
    );

    rerender(<OfflineIndicator isOffline={false} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('has proper accessibility attributes', () => {
    render(<OfflineIndicator isOffline={true} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-label', 'Offline notification');
  });

  it('shows success status with proper ARIA attributes', async () => {
    const { rerender } = render(<OfflineIndicator isOffline={true} />);

    rerender(<OfflineIndicator isOffline={false} />);

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});
