/** Normalize alert from API (indexer or mock) for UI consumption */
export function normalizeAlertForUi(alert) {
  if (!alert) return alert;
  const mitre = alert.mitre;
  const mitreEntry = Array.isArray(mitre) ? mitre[0] : mitre;
  return {
    ...alert,
    description: alert.description || alert.ruleDescription || '',
    severityLabel: alert.severityLabel || alert.severity,
    level: alert.level ?? alert.severity,
    rawLog: alert.rawLog || alert.fullLog || '',
    mitreTechnique: alert.mitreTechnique || mitreEntry?.id || '',
    mitreTechniqueName: alert.mitreTechniqueName || mitreEntry?.technique || mitreEntry?.name || '',
    mitreTactic: alert.mitreTactic || mitreEntry?.tactic || '',
  };
}

export function normalizeAlertsForUi(alerts = []) {
  return alerts.map(normalizeAlertForUi);
}

export function severityDistribution(alerts = []) {
  const dist = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  alerts.forEach((a) => {
    const lvl = typeof a.severity === 'number' ? a.severity : a.level || 0;
    if (lvl >= 12) dist.critical += 1;
    else if (lvl >= 10) dist.high += 1;
    else if (lvl >= 7) dist.medium += 1;
    else if (lvl >= 4) dist.low += 1;
    else dist.info += 1;
  });
  return Object.entries(dist).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
}
