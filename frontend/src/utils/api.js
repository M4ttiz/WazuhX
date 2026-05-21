let onDataSourceChange = null;

export function setDataSourceListener(fn) {
  onDataSourceChange = fn;
}

function normalizeJsonResponse(json) {
  if (json && typeof json === 'object' && 'data' in json) {
    const { data, pagination, stats } = json;
    if (pagination !== undefined || stats !== undefined) {
      const out = { data };
      if (pagination !== undefined) out.pagination = pagination;
      if (stats !== undefined) out.stats = stats;
      return out;
    }
    return data;
  }
  return json;
}

export async function apiFetch(path, options = {}) {
  const { signal, ...fetchOptions } = options;
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
    signal,
    ...fetchOptions,
  });

  const source = res.headers.get('X-Data-Source');
  if (source && onDataSourceChange) {
    onDataSourceChange(source);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const payload = normalizeJsonResponse(err);
    throw new Error(err.error || payload?.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return normalizeJsonResponse(json);
  }
  return res;
}

export async function apiDownload(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `report-${Date.now()}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
