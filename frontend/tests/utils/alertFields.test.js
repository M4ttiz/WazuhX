import { describe, it, expect } from 'vitest';
import {
  normalizeAlertForUi,
  normalizeAlertsForUi,
  severityDistribution,
} from '../../src/utils/alertFields';

describe('alertFields', () => {
  it('maps indexer fields to UI aliases', () => {
    const alert = {
      id: '1',
      ruleDescription: 'SSH brute force',
      fullLog: 'raw line',
      mitre: [{ id: 'T1110', technique: 'Brute Force', tactic: 'credential-access' }],
    };
    const ui = normalizeAlertForUi(alert);
    expect(ui.description).toBe('SSH brute force');
    expect(ui.rawLog).toBe('raw line');
    expect(ui.mitreTechnique).toBe('T1110');
    expect(ui.mitreTactic).toBe('credential-access');
  });

  it('preserves existing UI fields', () => {
    const alert = { description: 'Already set', severityLabel: 'high' };
    expect(normalizeAlertForUi(alert).description).toBe('Already set');
  });

  it('builds severity distribution from levels', () => {
    const dist = severityDistribution([
      { severity: 15 },
      { severity: 10 },
      { level: 5 },
    ]);
    expect(dist.find((d) => d.name === 'critical')?.value).toBe(1);
    expect(dist.find((d) => d.name === 'high')?.value).toBe(1);
    expect(dist.find((d) => d.name === 'low')?.value).toBe(1);
  });

  it('normalizes arrays', () => {
    const out = normalizeAlertsForUi([{ ruleDescription: 'x' }]);
    expect(out[0].description).toBe('x');
  });
});
