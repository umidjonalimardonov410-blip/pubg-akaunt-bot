import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const claimMutation = {
  mutate: vi.fn((_input: { code: string }, callbacks?: { onSuccess?: (result: { reward: number }) => void }) => callbacks?.onSuccess?.({ reward: 2500 })),
};

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 7, role: 'user', name: 'Test User' } }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    notifications: {
      getUnread: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      markAsRead: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    profile: {
      claimReferral: { useMutation: () => claimMutation },
      referral: { useQuery: () => ({ data: { code: 'IS7DEMO', totalInvites: 0, totalReward: 0, recentRewards: [] }, refetch: vi.fn() }) },
    },
  },
}));

import Home from './Home';

describe('Home Telegram referral attribution', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/referral');
    window.sessionStorage.clear();
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'ref_is42demo' } } };
    claimMutation.mutate.mockClear();
  });

  afterEach(() => {
    cleanup();
    delete window.Telegram;
  });

  it('invokes profile.claimReferral once with an authenticated Telegram payload', async () => {
    render(<Home />);
    await waitFor(() => expect(claimMutation.mutate).toHaveBeenCalledTimes(1));
    expect(claimMutation.mutate).toHaveBeenCalledWith({ code: 'IS42DEMO' }, expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
    expect(window.sessionStorage.getItem('inferno-referral-claimed:IS42DEMO')).toBe('1');
  });

  it('does not invoke profile.claimReferral again when the session marker already exists', async () => {
    window.sessionStorage.setItem('inferno-referral-claimed:IS42DEMO', '1');
    render(<Home />);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(claimMutation.mutate).not.toHaveBeenCalled();
  });
});
