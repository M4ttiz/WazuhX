import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wazuhx-noise-rule-ids';

export const DEFAULT_NOISE_RULE_IDS = [
  '5710',
  '5711',
  '5716',
  '5503',
  '1002',
  '31101',
  '31151',
];

function loadIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_NOISE_RULE_IDS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [...DEFAULT_NOISE_RULE_IDS];
  } catch {
    return [...DEFAULT_NOISE_RULE_IDS];
  }
}

export function useNoiseRuleIds() {
  const [ruleIds, setRuleIds] = useState(loadIds);

  const save = useCallback((ids) => {
    const next = ids.map(String);
    setRuleIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetDefaults = useCallback(() => {
    save([...DEFAULT_NOISE_RULE_IDS]);
  }, [save]);

  const addRuleId = useCallback(
    (id) => {
      const s = String(id).trim();
      if (!s || ruleIds.includes(s)) return;
      save([...ruleIds, s]);
    },
    [ruleIds, save]
  );

  const removeRuleId = useCallback(
    (id) => {
      save(ruleIds.filter((r) => r !== String(id)));
    },
    [ruleIds, save]
  );

  const isNoiseRule = useCallback(
    (ruleId) => ruleIds.includes(String(ruleId)),
    [ruleIds]
  );

  return { ruleIds, save, resetDefaults, addRuleId, removeRuleId, isNoiseRule };
}

export function filterClientNoise(alerts, ruleIds, showNoise) {
  if (showNoise) return alerts;
  const noiseSet = new Set(ruleIds.map(String));
  return alerts.filter((a) => !noiseSet.has(String(a.ruleId ?? '')));
}
