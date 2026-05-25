import { describe, it, expect } from 'vitest';
import {
  getHostStatus,
  HOST_STATUS,
  buildKpiRow,
  aggregateProblemsByHost,
  buildHostProblemsMatrix,
  filterAndPaginate,
  buildAlertSeverityBars,
  getAlertSeverityBucket,
} from '../src/utils/dashboardHelpers';

describe('dashboardHelpers', () => {
  it('getHostStatus returns OK for healthy agent', () => {
    expect(getHostStatus({ status: 'active', criticalCount: 0, compromised: false })).toBe(
      HOST_STATUS.OK
    );
  });

  it('buildKpiRow includes percentages', () => {
    const kpis = buildKpiRow(
      [
        { status: 'active', criticalCount: 0, compromised: false, lastKeepAlive: new Date().toISOString() },
        { status: 'disconnected' },
      ],
      { kpis: { criticalAlerts: 2 } },
      []
    );
    expect(kpis.totalHosts).toBe(2);
    expect(kpis.upHostsPct).toBe(50);
    expect(kpis.downHostsPct).toBe(50);
  });

  it('aggregateProblemsByHost merges alert counts', () => {
    const rows = aggregateProblemsByHost(
      [{ id: '1', name: 'host-a', status: 'active', criticalCount: 0 }],
      [
        { agentId: '1', timestamp: '2026-05-20T10:00:00Z', severity: 12 },
        { agentId: '1', timestamp: '2026-05-21T10:00:00Z', severity: 6 },
      ]
    );
    expect(rows[0].problems).toBe(2);
    expect(rows[0].lastChange).toBe('2026-05-21T10:00:00Z');
  });

  it('filterAndPaginate searches and pages', () => {
    const rows = [
      { id: '1', host: 'alpha', ip: '10.0.0.1' },
      { id: '2', host: 'beta', ip: '10.0.0.2' },
    ];
    const p1 = filterAndPaginate(rows, { search: 'beta', page: 1, pageSize: 10 });
    expect(p1.total).toBe(1);
    expect(p1.rows[0].host).toBe('beta');
  });

  it('getAlertSeverityBucket classifies levels', () => {
    expect(getAlertSeverityBucket({ severity: 15 })).toBe('Critical');
    expect(getAlertSeverityBucket({ severity: 7 })).toBe('Warning');
    expect(getAlertSeverityBucket({ severity: 2 })).toBe('Unknown');
  });

  it('buildAlertSeverityBars aggregates', () => {
    const bars = buildAlertSeverityBars([
      { severity: 12 },
      { severity: 6 },
      { severity: 1 },
    ]);
    expect(bars.find((b) => b.name === 'Critical').value).toBe(1);
    expect(bars.find((b) => b.name === 'Warning').value).toBe(1);
  });

  it('buildHostProblemsMatrix returns pivot rows', () => {
    const matrix = buildHostProblemsMatrix([
      { status: 'active', compromised: true, criticalCount: 0 },
      { status: 'never_connected' },
    ]);
    expect(matrix.find((r) => r.state === 'Critical').count).toBe(1);
    expect(matrix.find((r) => r.state === 'Unknown').count).toBe(1);
  });
});
