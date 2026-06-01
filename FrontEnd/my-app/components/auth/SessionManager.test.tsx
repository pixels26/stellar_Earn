import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionManager } from './SessionManager';

const mockLogout = vi.fn();
const mockRefreshProfile = vi.fn();
const mockSetWalletModalOpen = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    refreshProfile: mockRefreshProfile,
    logout: mockLogout,
    user: { stellarAddress: 'GABCD...', username: 'testuser' },
  }),
}));

vi.mock('../../lib/store', () => ({
  useStore: (selector: any) => {
    const state = { setWalletModalOpen: mockSetWalletModalOpen };
    return selector(state);
  },
}));

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing by default', () => {
    const { container } = render(<SessionManager />);
    expect(container.textContent).toBe('');
  });

  it('shows session-expired modal when session-expired event is dispatched', async () => {
    render(<SessionManager />);

    window.dispatchEvent(
      new CustomEvent('session-expired', {
        detail: { reason: 'token_refresh_failed' },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Your session has expired. Please sign in again to continue.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /connect wallet/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /dismiss/i })
    ).toBeInTheDocument();
  });

  it('calls logout and opens wallet modal when Connect Wallet is clicked', async () => {
    render(<SessionManager />);

    window.dispatchEvent(
      new CustomEvent('session-expired', {
        detail: { reason: 'token_refresh_failed' },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockSetWalletModalOpen).toHaveBeenCalledWith(true);
    });
  });

  it('calls logout when Dismiss button is clicked', async () => {
    render(<SessionManager />);

    window.dispatchEvent(
      new CustomEvent('session-expired', {
        detail: { reason: 'token_refresh_failed' },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('removes event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<SessionManager />);
    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      'session-expired',
      expect.any(Function)
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
