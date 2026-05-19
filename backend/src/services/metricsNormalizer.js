function getThresholds() {
  return {
    cpu: parseInt(process.env.METRICS_CPU_THRESHOLD || '90', 10),
    ram: parseInt(process.env.METRICS_RAM_THRESHOLD || '90', 10),
    disk: parseInt(process.env.METRICS_DISK_THRESHOLD || '85', 10),
  };
}

function parseLoadAverage(load) {
  if (!load) return [0, 0, 0];
  if (Array.isArray(load)) {
    return [Number(load[0]) || 0, Number(load[1]) || 0, Number(load[2]) || 0];
  }
  if (typeof load === 'string') {
    const parts = load.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }
  return [0, 0, 0];
}

function normalizeDisksFromHardware(hw) {
  const disks = hw?.disk || hw?.disks || [];
  if (!Array.isArray(disks) || disks.length === 0) return [];

  return disks.map((d) => {
    const usedPercent = d.usage != null
      ? Math.round(Number(d.usage))
      : d.size > 0
        ? Math.round(((d.size - (d.free || 0)) / d.size) * 100)
        : 0;
    return {
      mount: d.mount || d.path || '/',
      usedPercent: Math.min(100, Math.max(0, usedPercent)),
      totalGb: Math.round((d.size || 0) / 1024 / 1024 / 1024) || 0,
    };
  });
}

function estimateCpuFromProcesses(processes) {
  if (!processes?.length) return 0;
  const sum = processes.reduce(
    (acc, p) => acc + (Number(p.cpu_usage_percent ?? p.cpu ?? 0) || 0),
    0
  );
  return Math.min(100, Math.round(sum));
}

function normalizeAgentMetrics(agentMeta, hardware, osInfo, processes, customSnapshot) {
  const hw = hardware?.affected_items?.[0] || {};
  const os = osInfo?.affected_items?.[0] || {};
  const procs = processes?.affected_items || [];

  const ramTotal = parseInt(hw.ram?.total || hw.ram_total || 0, 10);
  const ramFree = parseInt(hw.ram?.free || hw.ram_free || 0, 10);
  let ramPercent = hw.ram?.usage != null ? Math.round(Number(hw.ram.usage)) : 0;
  if (!ramPercent && ramTotal > 0) {
    ramPercent = Math.round(((ramTotal - ramFree) / ramTotal) * 100);
  }

  let cpuPercent = estimateCpuFromProcesses(procs);
  let disks = normalizeDisksFromHardware(hw);
  let uptimeSeconds = parseInt(os.uptime || hw.uptime || 0, 10);
  let loadAverage = parseLoadAverage(os.load_average || hw.load_average);
  let source = 'syscollector';
  const scanTime = hw.scan?.time || os.scan?.time || null;

  if (customSnapshot) {
    const customTime = customSnapshot.timestamp
      ? new Date(customSnapshot.timestamp).getTime()
      : 0;
    const scanMs = scanTime ? new Date(scanTime).getTime() : 0;
    const useCustom = !scanMs || customTime >= scanMs;

    if (useCustom) {
      if (customSnapshot.cpu != null) cpuPercent = Math.round(Number(customSnapshot.cpu));
      if (customSnapshot.ram != null) ramPercent = Math.round(Number(customSnapshot.ram));
      if (customSnapshot.uptime != null) uptimeSeconds = parseInt(customSnapshot.uptime, 10);
      if (customSnapshot.load) loadAverage = parseLoadAverage(customSnapshot.load);
      if (customSnapshot.disk != null) {
        const diskPct = Math.round(Number(customSnapshot.disk));
        disks = disks.length
          ? disks.map((d, i) => (i === 0 ? { ...d, usedPercent: diskPct } : d))
          : [{ mount: '/', usedPercent: diskPct, totalGb: 0 }];
      }
      if (customSnapshot.disks?.length) {
        disks = customSnapshot.disks.map((d) => ({
          mount: d.mount || '/',
          usedPercent: Math.round(Number(d.used ?? d.usedPercent ?? 0)),
          totalGb: d.totalGb || 0,
        }));
      }
      source = scanTime ? 'mixed' : 'custom';
    }
  }

  const maxDiskPercent = disks.length
    ? Math.max(...disks.map((d) => d.usedPercent))
    : customSnapshot?.disk != null
      ? Math.round(Number(customSnapshot.disk))
      : 0;

  return {
    agentId: String(agentMeta.id),
    agentName: agentMeta.name,
    cpuPercent: Math.min(100, Math.max(0, cpuPercent)),
    ramPercent: Math.min(100, Math.max(0, ramPercent)),
    disks,
    maxDiskPercent,
    uptimeSeconds,
    loadAverage,
    scanTime: customSnapshot?.timestamp || scanTime,
    source,
    cpuModel: hw.cpu?.name || hw.cpu_name || null,
    ramTotalMb: ramTotal ? Math.round(ramTotal / 1024 / 1024) : null,
    network: {
      rx: hw.rx?.bytes || 0,
      tx: hw.tx?.bytes || 0,
    },
  };
}

function evaluateThresholds(metrics, thresholds, cooldownState, cooldownMs) {
  const alerts = [];
  const now = Date.now();
  const checks = [
    { metric: 'cpu', value: metrics.cpuPercent, threshold: thresholds.cpu },
    { metric: 'ram', value: metrics.ramPercent, threshold: thresholds.ram },
  ];

  if (metrics.diskMetric !== 'io') {
    checks.push({
      metric: 'disk',
      value: metrics.maxDiskPercent,
      threshold: thresholds.disk,
      detail: metrics.disks?.find((d) => d.usedPercent === metrics.maxDiskPercent)?.mount,
    });
  }

  for (const check of checks) {
    if (check.value <= check.threshold) continue;
    const key = `${metrics.agentId}:${check.metric}`;
    const last = cooldownState.get(key) || 0;
    if (now - last < cooldownMs) continue;
    cooldownState.set(key, now);
    alerts.push({
      id: `${key}-${now}`,
      agentId: metrics.agentId,
      agentName: metrics.agentName,
      metric: check.metric,
      value: check.value,
      threshold: check.threshold,
      mount: check.detail || null,
      severity: check.metric === 'disk' ? 'medium' : 'high',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function metricsToLegacyStats(metrics) {
  return {
    cpuUsage: metrics.cpuPercent,
    ramUsage: metrics.ramPercent,
    disks: (metrics.disks || []).map((d) => ({
      mount: d.mount,
      used: d.usedPercent,
      total: d.totalGb,
    })),
    network: metrics.network || { rx: 0, tx: 0 },
    uptime: metrics.uptimeSeconds,
    loadAverage: metrics.loadAverage,
    scanTime: metrics.scanTime,
    source: metrics.source,
  };
}

function normalizeNetdataAgentMetrics(agentMeta, hostIp, realtime, chartBundle) {
  const reachable = Boolean(realtime?.reachable && !realtime?.error);
  const cpu = realtime?.cpu ?? null;
  const ram = realtime?.ram ?? null;
  const diskIo = realtime?.disk ?? null;

  const loadPoints = chartBundle?.series?.load || [];
  const lastLoad = loadPoints.length ? loadPoints[loadPoints.length - 1]?.value : null;
  const loadAverage = lastLoad != null ? [lastLoad, lastLoad, lastLoad] : [0, 0, 0];

  const cpuPoints = chartBundle?.series?.cpu || [];
  const ramPoints = chartBundle?.series?.ram || [];
  const history = cpuPoints.map((p, i) => ({
    t:
      typeof p.time === 'number'
        ? new Date(p.time * 1000).toISOString()
        : String(p.time ?? new Date().toISOString()),
    cpu: p.value ?? 0,
    ram: ramPoints[i]?.value ?? ram ?? 0,
    diskMax: diskIo ?? 0,
  }));

  const netPoints = chartBundle?.series?.net || [];
  const lastNet = netPoints.length ? netPoints[netPoints.length - 1]?.value : null;

  return {
    agentId: String(agentMeta.id),
    agentName: agentMeta.name,
    hostIp: hostIp || 'unknown',
    cpuPercent: cpu != null ? Math.min(100, Math.max(0, cpu)) : 0,
    ramPercent: ram != null ? Math.min(100, Math.max(0, ram)) : 0,
    maxDiskPercent: diskIo != null ? diskIo : 0,
    disks: [],
    uptimeSeconds: 0,
    loadAverage,
    scanTime: new Date().toISOString(),
    source: 'netdata',
    network: { rx: 0, tx: 0 },
    netTraffic: lastNet,
    diskIo,
    diskUnit: realtime?.diskUnit || 'KiB/s',
    diskMetric: 'io',
    reachable,
    error: reachable ? undefined : chartBundle?.error || realtime?.error || 'Netdata unreachable',
    series: chartBundle?.series || {},
    history,
  };
}

function appendHistory(historyStore, agentId, point, maxPoints = 20) {
  if (!historyStore.has(agentId)) historyStore.set(agentId, []);
  const buf = historyStore.get(agentId);
  buf.push(point);
  if (buf.length > maxPoints) buf.shift();
  return [...buf];
}

module.exports = {
  getThresholds,
  normalizeAgentMetrics,
  normalizeNetdataAgentMetrics,
  evaluateThresholds,
  metricsToLegacyStats,
  appendHistory,
  parseLoadAverage,
};
