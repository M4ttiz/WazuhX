const { withCache, clearCache, cache } = require('../../src/middleware/cache');

describe('cache middleware', () => {
  beforeEach(() => {
    clearCache();
  });

  const mockRes = () => ({
    headers: {},
    set(key, val) {
      this.headers[key] = val;
    },
  });

  it('returns cached value on cache hit', async () => {
    const res = mockRes();
    const fetchFn = jest.fn().mockResolvedValue([{ id: 1 }]);

    await withCache({}, res, 'test-hit', 60, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(res.headers['X-Cache-Hit']).toBe('false');

    const res2 = mockRes();
    const fetchFn2 = jest.fn().mockResolvedValue([{ id: 2 }]);
    const cached = await withCache({}, res2, 'test-hit', 60, fetchFn2);

    expect(cached).toEqual([{ id: 1 }]);
    expect(fetchFn2).not.toHaveBeenCalled();
    expect(res2.headers['X-Cache-Hit']).toBe('true');
  });

  it('does not cache null results', async () => {
    const res = mockRes();
    await withCache({}, res, 'test-null', 60, async () => null);

    expect(cache.get('test-null')).toBeUndefined();

    const res2 = mockRes();
    const fetchFn = jest.fn().mockResolvedValue({ data: 'ok' });
    await withCache({}, res2, 'test-null', 60, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not cache empty arrays', async () => {
    const res = mockRes();
    await withCache({}, res, 'test-empty', 60, async () => []);

    expect(cache.get('test-empty')).toBeUndefined();
  });

  it('caches non-empty arrays and objects', async () => {
    const res = mockRes();
    const payload = { data: [{ id: 1 }], source: 'mock' };
    await withCache({}, res, 'test-data', 60, async () => payload);

    expect(cache.get('test-data')).toEqual(payload);
  });
});
