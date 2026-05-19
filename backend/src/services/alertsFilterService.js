const DEFAULT_NOISE_RULE_IDS = [
  '5710',
  '5711',
  '5716',
  '5503',
  '1002',
  '31101',
  '31151',
];

function extractSrcIp(alert) {
  if (alert?.data?.srcip) return String(alert.data.srcip);
  if (alert?.srcip) return String(alert.srcip);

  const raw = alert?.rawLog || alert?.fullLog;
  if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.data?.srcip) return String(parsed.data.srcip);
    } catch {
      const m = raw.match(/"srcip"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
    }
  }
  return '';
}

function deduplicateAlerts(alerts) {
  const grouped = {};

  for (const alert of alerts) {
    const ruleId = String(alert.ruleId ?? alert.rule?.id ?? '');
    const agentId = String(alert.agentId ?? alert.agent?.id ?? '');
    const srcip = extractSrcIp(alert);
    const key = `${ruleId}_${agentId}_${srcip}`;

    if (!grouped[key]) {
      grouped[key] = {
        ...alert,
        count: 1,
        first_seen: alert.timestamp,
      };
    } else {
      grouped[key].count += 1;
      if (alert.timestamp > grouped[key].timestamp) {
        grouped[key].timestamp = alert.timestamp;
      }
      if (alert.timestamp < grouped[key].first_seen) {
        grouped[key].first_seen = alert.timestamp;
      }
    }
  }

  return Object.values(grouped);
}

function filterNoise(alerts, showNoise = false, noiseRuleIds = DEFAULT_NOISE_RULE_IDS) {
  if (showNoise) return alerts;
  const noiseSet = new Set(noiseRuleIds.map(String));
  return alerts.filter((a) => !noiseSet.has(String(a.ruleId ?? a.rule?.id ?? '')));
}

function processAlerts(alerts, options = {}) {
  const { showNoise = false, noiseRuleIds = DEFAULT_NOISE_RULE_IDS } = options;
  const totalRaw = alerts.length;
  const afterNoise = filterNoise(alerts, showNoise, noiseRuleIds);
  const hiddenNoise = totalRaw - afterNoise.length;
  const deduped = deduplicateAlerts(afterNoise);
  const dedupedGroups = afterNoise.length - deduped.length;

  return {
    alerts: deduped,
    meta: {
      hiddenNoise,
      dedupedGroups,
      totalRaw,
      totalVisible: deduped.length,
    },
  };
}

module.exports = {
  DEFAULT_NOISE_RULE_IDS,
  extractSrcIp,
  deduplicateAlerts,
  filterNoise,
  processAlerts,
};
