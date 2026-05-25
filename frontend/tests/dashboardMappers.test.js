import { describe, it, expect } from 'vitest';
import {
  getHostStatus,
  HOST_STATUS,
  buildOverviewKpis,
  buildTopProblemHosts,
  buildHostProblemsPivot,
  buildServiceProblemsPivot,
  buildSyntheticServices,
  buildHostStatusDistribution,
  SERVICE_STATUS,
} from '../src/utils/dashboardMappers';

describe('getHostStatus', () => {
  it('returns OK for healthy active agent', () => {
    expect(getHostStatus({ status: 'active', criticalCount: 0, compromised: false })).toBe(HOST_STATUS.OK);
  });

  it('returns Warning for active agent with critical alerts', () => {
    expect(getHostStatus({ status: 'active', criticalCount: 3, compromised: false })).toBe(
      HOST_STATUS.WARNING
    );
  });

  it('returns Down for disconnected agent', () => {
    expect(getHostStatus({ status: 'disconnected' })).toBe(HOST_STATUS.DOWN);
  });
});

describe('buildOverviewKpis', () => {
  it('computes host counts from agents', () => {
    const agents = [
      { status: 'active', criticalCount: 0, compromised: false, lastKeepAlive: new Date().toISOString() },
      { status: 'active', criticalCount: 2, compromised: false, lastKeepAlive: new Date().toISOString() },
      { status: 'disconnected', criticalCount: 0 },
    ];
    const kpis = buildOverviewKpis(agents, { kpis: { criticalAlerts: 5 } });
    expect(kpis.totalHosts).toBe(3);
    expect(kpis.upHosts).toBe(1);
    expect(kpis.warningHosts).toBe(1);
    expect(kpis.downHosts).toBe(1);
    expect(kpis.totalServices).toBe(9);
    expect(kpis.problems).toBe(5);
  });
});

describe('buildTopProblemHosts', () => {
  it('sorts by problems descending', () => {
    const rows = buildTopProblemHosts(
      [
        { id: '1', name: 'a', status: 'active', criticalCount: 1, alertCount: 2, lastKeepAlive: null },
        { id: '2', name: 'b', status: 'active', criticalCount: 5, alertCount: 10, lastKeepAlive: null },
      ],
      5
    );
    expect(rows[0].host).toBe('b');
    expect(rows[0].problems).toBe(15);
  });
});

describe('buildHostProblemsPivot', () => {
  it('returns percent rows that sum to meaningful counts', () => {
    const pivot = buildHostProblemsPivot([
      { status: 'active', compromised: true, criticalCount: 0 },
      { status: 'active', criticalCount: 2, compromised: false },
      { status: 'never_connected' },
    ]);
    expect(pivot.find((r) => r.state === 'Critical').count).toBe(1);
    expect(pivot.find((r) => r.state === 'Warning').count).toBe(1);
    expect(pivot.find((r) => r.state === 'Unknown').count).toBe(1);
  });
});

describe('buildSyntheticServices', () => {
  it('creates three services per agent', () => {
    const services = buildSyntheticServices([{ id: '1', name: 'h1', status: 'active', criticalCount: 0, complianceScore: 90 }]);
    expect(services).toHaveLength(3);
    expect(services[0].status).toBe(SERVICE_STATUS.OK);
  });

  it('buildServiceProblemsPivot aggregates service states', () => {
    const services = buildSyntheticServices([
      { id: '1', name: 'h1', status: 'active', criticalCount: 10, compromised: true, complianceScore: 50, alertCount: 70 },
    ]);
    const pivot = buildServiceProblemsPivot(services);
    expect(pivot.reduce((s, r) => s + r.count, 0)).toBe(3);
  });
});

describe('buildHostStatusDistribution', () => {
  it('groups hosts by status', () => {
    const dist = buildHostStatusDistribution([
      { status: 'active', criticalCount: 0, compromised: false },
      { status: 'disconnected' },
    ]);
    expect(dist.some((d) => d.name === HOST_STATUS.OK)).toBe(true);
    expect(dist.some((d) => d.name === HOST_STATUS.DOWN)).toBe(true);
  });
});
