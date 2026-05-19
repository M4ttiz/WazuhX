import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalEntityStatus, filterByStatusTab } from '../../src/hooks/useLocalEntityStatus';

describe('useLocalEntityStatus', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults status to new', () => {
    const { result } = renderHook(() => useLocalEntityStatus('test-status', 'new'));
    expect(result.current.getStatus('a1')).toBe('new');
  });

  it('persists status updates', () => {
    const { result } = renderHook(() => useLocalEntityStatus('test-status', 'new'));
    act(() => result.current.setStatus('a1', 'seen'));
    expect(result.current.getStatus('a1')).toBe('seen');
    const stored = JSON.parse(localStorage.getItem('test-status'));
    expect(stored.a1).toBe('seen');
  });

  it('bulk updates multiple ids', () => {
    const { result } = renderHook(() => useLocalEntityStatus('test-status', 'new'));
    act(() => result.current.bulkSetStatus(['a1', 'a2'], 'dismissed'));
    expect(result.current.getStatus('a2')).toBe('dismissed');
  });

  it('tracks deleted ids', () => {
    const { result } = renderHook(() => useLocalEntityStatus('test-status', 'new'));
    act(() => result.current.deleteIds(['x1']));
    expect(result.current.isDeleted('x1')).toBe(true);
  });
});

describe('filterByStatusTab', () => {
  const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
  const getStatus = (id) => ({ '1': 'new', '2': 'seen', '3': 'dismissed' }[id]);
  const isDeleted = () => false;

  it('filters by tab', () => {
    expect(filterByStatusTab(items, { getStatus, isDeleted, tab: 'seen' })).toHaveLength(1);
    expect(filterByStatusTab(items, { getStatus, isDeleted, tab: 'dismissed' })[0].id).toBe('3');
  });
});
