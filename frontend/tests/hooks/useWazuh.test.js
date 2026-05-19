import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWazuh } from '../../src/hooks/useWazuh';
import { RefreshProvider } from '../../src/context/RefreshContext';

vi.mock('../../src/utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../src/utils/api';

function wrapper({ children }) {
  return <RefreshProvider>{children}</RefreshProvider>;
}

describe('useWazuh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data on mount', async () => {
    apiFetch.mockResolvedValue([{ id: '001' }]);
    const { result } = renderHook(() => useWazuh('/agents'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiFetch).toHaveBeenCalledWith('/agents');
    expect(result.current.data).toEqual([{ id: '001' }]);
  });

  it('sets error on failure', async () => {
    apiFetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useWazuh('/agents'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Network error'));
    expect(result.current.loading).toBe(false);
  });

  it('skips fetch when skip is true', async () => {
    const { result } = renderHook(() => useWazuh('/agents', { skip: true }), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('refetches when refetch is called', async () => {
    apiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useWazuh('/agents'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiFetch.mockClear();
    apiFetch.mockResolvedValue([{ id: '002' }]);
    await result.current.refetch();

    expect(apiFetch).toHaveBeenCalled();
    await waitFor(() => expect(result.current.data).toEqual([{ id: '002' }]));
  });
});
