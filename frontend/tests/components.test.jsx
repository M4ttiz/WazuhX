import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeverityBadge from '../src/components/SeverityBadge';
import KpiCard from '../src/components/KpiCard';
import { computeKpis, filterAlerts } from '../src/utils/formatters';

describe('SeverityBadge', () => {
  it('renders critical for level >= 12', () => {
    render(<SeverityBadge level={15} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('renders level number', () => {
    render(<SeverityBadge level={10} label="high" />);
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Alert" value={42} />);
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    const { container } = render(<KpiCard label="X" loading />);
    expect(container.querySelector('.skeleton')).toBeTruthy();
  });
});

describe('formatters', () => {
  it('computeKpis extracts kpis from overview', () => {
    const kpis = computeKpis({ kpis: { totalAlerts: 100, criticalAlerts: 5 } });
    expect(kpis.totalAlerts).toBe(100);
    expect(kpis.criticalAlerts).toBe(5);
  });

  it('filterAlerts filters by severity', () => {
    const alerts = [
      { severity: 5, description: 'low', agentName: 'a' },
      { severity: 12, description: 'crit', agentName: 'b' },
    ];
    const filtered = filterAlerts(alerts, { severityMin: 10 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].severity).toBe(12);
  });
});
