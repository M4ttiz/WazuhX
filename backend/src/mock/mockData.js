const OS_LIST = [
  { name: 'Ubuntu 22.04', platform: 'linux', icon: 'linux' },
  { name: 'Windows Server 2022', platform: 'windows', icon: 'windows' },
  { name: 'RHEL 9.3', platform: 'linux', icon: 'linux' },
  { name: 'Debian 12', platform: 'linux', icon: 'linux' },
  { name: 'macOS Sonoma 14', platform: 'darwin', icon: 'apple' },
  { name: 'CentOS Stream 9', platform: 'linux', icon: 'linux' },
  { name: 'Windows 11 Pro', platform: 'windows', icon: 'windows' },
  { name: 'Amazon Linux 2023', platform: 'linux', icon: 'linux' },
  { name: 'Fedora 39', platform: 'linux', icon: 'linux' },
];

const GROUPS = ['default', 'servers', 'workstations', 'dmz', 'critical'];
const STATUSES = ['active', 'active', 'active', 'active', 'disconnected', 'active', 'never_connected', 'active', 'active'];

const MITRE_TACTICS = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Exfiltration'];
const MITRE_TECHNIQUES = [
  { id: 'T1059', name: 'Command and Scripting Interpreter' },
  { id: 'T1078', name: 'Valid Accounts' },
  { id: 'T1110', name: 'Brute Force' },
  { id: 'T1055', name: 'Process Injection' },
  { id: 'T1021', name: 'Remote Services' },
  { id: 'T1082', name: 'System Information Discovery' },
  { id: 'T1046', name: 'Network Service Discovery' },
  { id: 'T1003', name: 'OS Credential Dumping' },
  { id: 'T1566', name: 'Phishing' },
  { id: 'T1190', name: 'Exploit Public-Facing Application' },
];

const RULES = [
  { id: 5710, desc: 'SSHD brute force trying to get access' },
  { id: 5712, desc: 'SSHD authentication success' },
  { id: 5503, desc: 'User login failed' },
  { id: 554, desc: 'File added to the system' },
  { id: 550, desc: 'Integrity checksum changed' },
  { id: 31103, desc: 'VirusTotal: malware detected' },
  { id: 23504, desc: 'Privilege escalation attempt' },
  { id: 100002, desc: 'Suspicious PowerShell command' },
  { id: 60122, desc: 'Windows: suspicious process creation' },
  { id: 80790, desc: 'CIS: Password policy check failed' },
];

const CVE_LIST = [
  { id: 'CVE-2024-21762', pkg: 'openssl', cvss: 9.8, severity: 'critical', fix: '3.0.13' },
  { id: 'CVE-2024-1086', pkg: 'linux-kernel', cvss: 7.8, severity: 'high', fix: '6.1.76' },
  { id: 'CVE-2023-44487', pkg: 'nginx', cvss: 7.5, severity: 'high', fix: '1.25.3' },
  { id: 'CVE-2024-21412', pkg: 'windows', cvss: 8.1, severity: 'high', fix: 'KB5034763' },
  { id: 'CVE-2023-48795', pkg: 'openssh', cvss: 5.9, severity: 'medium', fix: '9.6p1' },
  { id: 'CVE-2024-23897', pkg: 'jenkins', cvss: 9.8, severity: 'critical', fix: '2.426.3' },
  { id: 'CVE-2023-38545', pkg: 'curl', cvss: 9.8, severity: 'critical', fix: '8.4.0' },
  { id: 'CVE-2024-3400', pkg: 'paloalto', cvss: 10.0, severity: 'critical', fix: '11.1.2-h3' },
  { id: 'CVE-2023-22515', pkg: 'confluence', cvss: 10.0, severity: 'critical', fix: '8.5.4' },
  { id: 'CVE-2024-27198', pkg: 'teamcity', cvss: 9.8, severity: 'critical', fix: '2023.11.4' },
];

const CRITICAL_PATHS = ['/etc/passwd', '/etc/shadow', '/etc/sudoers', 'C:\\Windows\\System32\\config\\SAM'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function severityLabel(level) {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'high';
  if (level >= 5) return 'medium';
  return 'low';
}

const agents = OS_LIST.map((os, i) => {
  const id = String(i + 1).padStart(3, '0');
  const status = STATUSES[i];
  const lastSeen = status === 'never_connected' ? null : daysAgo(0, i * 2);
  const alertCount = 15 + Math.floor(Math.random() * 80);
  const criticalCount = status === 'active' ? Math.floor(Math.random() * 12) : 0;
  return {
    id,
    name: `endpoint-${id}`,
    ip: `10.0.${Math.floor(i / 3) + 1}.${(i % 254) + 10}`,
    status,
    os: os.name,
    osPlatform: os.platform,
    osIcon: os.icon,
    group: GROUPS[i % GROUPS.length],
    version: '4.9.2',
    lastKeepAlive: lastSeen,
    dateAdd: daysAgo(90 + i),
    alertCount,
    criticalCount,
    compromised: criticalCount > 8 && status === 'active',
    hostname: `host-${id}.corp.local`,
    architecture: os.platform === 'windows' ? 'x86_64' : 'x86_64',
    kernel: os.platform === 'windows' ? '10.0.22631' : '6.1.0-26-generic',
    ramTotal: os.platform === 'windows' ? 32768 : 16384,
    cpuModel: os.platform === 'windows' ? 'Intel Xeon E5-2680' : 'AMD EPYC 7763',
    cpuUsage: 20 + Math.floor(Math.random() * 60),
    ramUsage: 30 + Math.floor(Math.random() * 50),
    disks: [
      { mount: os.platform === 'windows' ? 'C:\\' : '/', used: 45 + i * 3, total: 100 },
      { mount: os.platform === 'windows' ? 'D:\\' : '/var', used: 60 + i, total: 200 },
    ],
    network: { rx: 1024 * (100 + i * 50), tx: 1024 * (80 + i * 40) },
    uptime: 86400 * (5 + i),
    complianceScore: 55 + Math.floor(Math.random() * 40),
  };
});

const alerts = [];
for (let d = 0; d < 7; d++) {
  for (let i = 0; i < 30; i++) {
    const agent = randomItem(agents);
    const rule = randomItem(RULES);
    const mitre = randomItem(MITRE_TECHNIQUES);
    const level = Math.floor(Math.random() * 15) + 1;
    alerts.push({
      id: `alert-${d}-${i}`,
      timestamp: daysAgo(d, Math.floor(Math.random() * 24)),
      severity: level,
      severityLabel: severityLabel(level),
      agentId: agent.id,
      agentName: agent.name,
      ruleId: rule.id,
      ruleDescription: rule.desc,
      description: `${rule.desc} on ${agent.name}`,
      mitreTactic: randomItem(MITRE_TACTICS),
      mitreTechnique: mitre.id,
      mitreTechniqueName: mitre.name,
      rawLog: JSON.stringify({
        rule: { id: rule.id, level, description: rule.desc },
        agent: { id: agent.id, name: agent.name },
        data: { srcip: agent.ip, dstip: '10.0.0.1' },
      }),
      responseSuggestion:
        level >= 12
          ? 'Isolare immediatamente l\'endpoint e avviare incident response.'
          : level >= 8
            ? 'Verificare i log e applicare le regole di contenimento.'
            : 'Monitorare e correlare con altri eventi.',
    });
  }
}
alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

const vulnerabilities = [];
CVE_LIST.forEach((cve, ci) => {
  agents.slice(0, 6 + (ci % 3)).forEach((agent, ai) => {
    vulnerabilities.push({
      id: `${cve.id}-${agent.id}`,
      cve: cve.id,
      agentId: agent.id,
      agentName: agent.name,
      package: cve.pkg,
      version: '1.0.' + (ai + ci),
      fixVersion: cve.fix,
      cvss: cve.cvss,
      severity: cve.severity,
      hasFix: true,
      detectedAt: daysAgo(ci % 30),
    });
  });
});

const fimEvents = [];
const fimTypes = ['added', 'modified', 'deleted'];
for (let i = 0; i < 40; i++) {
  const agent = randomItem(agents);
  const type = randomItem(fimTypes);
  const path =
    i < 5
      ? CRITICAL_PATHS[i % CRITICAL_PATHS.length]
      : agent.osPlatform === 'windows'
        ? `C:\\Program Files\\app\\file${i}.dll`
        : `/var/www/html/file${i}.php`;
  fimEvents.push({
    id: `fim-${i}`,
    timestamp: daysAgo(Math.floor(i / 8), i % 24),
    agentId: agent.id,
    agentName: agent.name,
    path,
    type,
    size: 1024 * (i + 1),
    permissions: type === 'deleted' ? null : 'rw-r--r--',
    user: 'root',
    critical: CRITICAL_PATHS.some((p) => path.includes(p.replace(/\\/g, ''))),
    md5Before: type === 'modified' ? 'abc123' + i : null,
    md5After: type === 'modified' ? 'def456' + i : type === 'added' ? 'new789' + i : null,
    sha256Before: type === 'modified' ? 'sha-before-' + i : null,
    sha256After: type === 'modified' ? 'sha-after-' + i : null,
  });
}

const benchmarks = {
  cis: { name: 'CIS Benchmark', checks: 120 },
  pci: { name: 'PCI-DSS', checks: 95 },
  gdpr: { name: 'GDPR', checks: 45 },
  hipaa: { name: 'HIPAA', checks: 60 },
  nist: { name: 'NIST 800-53', checks: 150 },
};

function generateCompliance(benchmark = 'cis') {
  const bm = benchmarks[benchmark] || benchmarks.cis;
  return agents.map((agent) => {
    const passed = Math.floor((agent.complianceScore / 100) * bm.checks);
    const checks = [];
    for (let i = 0; i < 20; i++) {
      const pass = Math.random() < agent.complianceScore / 100;
      checks.push({
        id: `${benchmark.toUpperCase()}-${1000 + i}`,
        description: `Security check ${i + 1} for ${bm.name}`,
        result: pass ? 'passed' : 'failed',
        remediation: pass ? null : 'Apply hardening policy and re-run scan.',
        reference: `${benchmark.toUpperCase()} Section ${i + 1}.2`,
      });
    }
    return {
      agentId: agent.id,
      agentName: agent.name,
      benchmark,
      benchmarkName: bm.name,
      score: agent.complianceScore,
      passed,
      total: bm.checks,
      checks,
    };
  });
}

function getOverview() {
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const disconnected = agents.filter((a) => a.status === 'disconnected').length;
  const compromised = agents.filter((a) => a.compromised).length;
  const criticalAlerts = alerts.filter((a) => a.severity >= 12).length;
  const avgCompliance = Math.round(
    agents.reduce((s, a) => s + a.complianceScore, 0) / agents.length
  );

  const severityTrend = [];
  for (let d = 6; d >= 0; d--) {
    const day = daysAgo(d).split('T')[0];
    const dayAlerts = alerts.filter((a) => a.timestamp.startsWith(day));
    severityTrend.push({
      date: day,
      critical: dayAlerts.filter((a) => a.severity >= 12).length,
      high: dayAlerts.filter((a) => a.severity >= 8 && a.severity < 12).length,
      medium: dayAlerts.filter((a) => a.severity >= 5 && a.severity < 8).length,
      low: dayAlerts.filter((a) => a.severity < 5).length,
    });
  }

  const severityDist = {
    critical: alerts.filter((a) => a.severity >= 12).length,
    high: alerts.filter((a) => a.severity >= 8 && a.severity < 12).length,
    medium: alerts.filter((a) => a.severity >= 5 && a.severity < 8).length,
    low: alerts.filter((a) => a.severity < 5).length,
  };

  const ruleCounts = {};
  alerts.forEach((a) => {
    ruleCounts[a.ruleId] = ruleCounts[a.ruleId] || { id: a.ruleId, description: a.ruleDescription, count: 0 };
    ruleCounts[a.ruleId].count++;
  });
  const topRules = Object.values(ruleCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const mitreCounts = {};
  alerts.forEach((a) => {
    mitreCounts[a.mitreTechnique] = mitreCounts[a.mitreTechnique] || {
      id: a.mitreTechnique,
      name: a.mitreTechniqueName,
      count: 0,
    };
    mitreCounts[a.mitreTechnique].count++;
  });

  return {
    kpis: {
      totalAlerts: alerts.length,
      criticalAlerts,
      agentsOnline: activeAgents,
      agentsOffline: disconnected,
      agentsCompromised: compromised,
      threatsBlocked: 1247 + Math.floor(Math.random() * 100),
      totalCve: vulnerabilities.length,
      avgCompliance,
    },
    severityTrend,
    severityDist,
    topRules,
    mitreHeatmap: Object.values(mitreCounts),
    recentActivity: alerts.slice(0, 10),
    hasCriticalIncident: criticalAlerts > 0,
  };
}

function filterAgents({ status, os, group, search } = {}) {
  return agents.filter((a) => {
    if (status && a.status !== status) return false;
    if (os && !a.os.toLowerCase().includes(os.toLowerCase())) return false;
    if (group && a.group !== group) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.ip.includes(q)) return false;
    }
    return true;
  });
}

function filterAlerts(filters = {}) {
  let result = [...alerts];
  if (filters.agentId) result = result.filter((a) => a.agentId === filters.agentId);
  if (filters.severityMin)
    result = result.filter((a) => a.severity >= parseInt(filters.severityMin, 10));
  if (filters.severityMax)
    result = result.filter((a) => a.severity <= parseInt(filters.severityMax, 10));
  if (filters.mitreTactic)
    result = result.filter((a) => a.mitreTactic === filters.mitreTactic);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (a) =>
        a.description.toLowerCase().includes(q) ||
        a.agentName.toLowerCase().includes(q) ||
        String(a.ruleId).includes(q)
    );
  }
  if (filters.from) result = result.filter((a) => a.timestamp >= filters.from);
  if (filters.to) result = result.filter((a) => a.timestamp <= filters.to);
  return result;
}

function paginate(items, page = 1, limit = 25) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 25;
  const start = (p - 1) * l;
  return {
    data: items.slice(start, start + l),
    pagination: {
      page: p,
      limit: l,
      total: items.length,
      totalPages: Math.ceil(items.length / l),
    },
  };
}

function getAgentById(id) {
  return agents.find((a) => a.id === id);
}

function getAgentProcesses(id) {
  const procs = [
    'sshd', 'nginx', 'node', 'docker', 'systemd', 'chrome', 'powershell',
    'wazuh-agent', 'cron', 'python3',
  ];
  return procs.slice(0, 10).map((name, i) => ({
    pid: 1000 + i,
    name,
    cpu: Math.floor(Math.random() * 30),
    memory: Math.floor(Math.random() * 500),
    user: i % 2 === 0 ? 'root' : 'www-data',
  }));
}

function getAgentStats(id) {
  const agent = getAgentById(id);
  if (!agent) return null;
  return {
    cpuUsage: agent.cpuUsage,
    ramUsage: agent.ramUsage,
    disks: agent.disks,
    network: agent.network,
    uptime: agent.uptime,
  };
}

function getVulnStats() {
  return {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
    high: vulnerabilities.filter((v) => v.severity === 'high').length,
    medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
    low: vulnerabilities.filter((v) => v.severity === 'low').length,
    withFix: vulnerabilities.filter((v) => v.hasFix).length,
  };
}

function getMetrics(agentId) {
  const thresholds = {
    cpu: parseInt(process.env.METRICS_CPU_THRESHOLD || '90', 10),
    ram: parseInt(process.env.METRICS_RAM_THRESHOLD || '90', 10),
    disk: parseInt(process.env.METRICS_DISK_THRESHOLD || '85', 10),
  };

  let list = agents.filter((a) => a.status === 'active');
  if (agentId) {
    list = list.filter((a) => a.id === String(agentId).padStart(3, '0'));
  }

  const agentMetrics = list.map((a) => {
    const maxDisk = Math.max(...(a.disks || []).map((d) => d.used), 0);
    const thresholdAlerts = [];
    if (a.cpuUsage > thresholds.cpu) {
      thresholdAlerts.push({
        id: `${a.id}-cpu`,
        agentId: a.id,
        agentName: a.name,
        metric: 'cpu',
        value: a.cpuUsage,
        threshold: thresholds.cpu,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }
    if (a.ramUsage > thresholds.ram) {
      thresholdAlerts.push({
        id: `${a.id}-ram`,
        agentId: a.id,
        agentName: a.name,
        metric: 'ram',
        value: a.ramUsage,
        threshold: thresholds.ram,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }
    if (maxDisk > thresholds.disk) {
      thresholdAlerts.push({
        id: `${a.id}-disk`,
        agentId: a.id,
        agentName: a.name,
        metric: 'disk',
        value: maxDisk,
        threshold: thresholds.disk,
        severity: 'medium',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      agentId: a.id,
      agentName: a.name,
      cpuPercent: a.cpuUsage,
      ramPercent: a.ramUsage,
      disks: (a.disks || []).map((d) => ({
        mount: d.mount,
        usedPercent: d.used,
        totalGb: d.total,
      })),
      maxDiskPercent: maxDisk,
      uptimeSeconds: a.uptime,
      loadAverage: [1.2, 0.9, 0.7],
      scanTime: new Date().toISOString(),
      source: 'glances',
      reachable: true,
      diskMetric: 'percent',
      diskUnit: '%',
      series: {
        cpu: [{ time: Date.now() / 1000, value: a.cpuUsage }],
        ram: [{ time: Date.now() / 1000, value: a.ramUsage }],
        net: [{ time: Date.now() / 1000, value: 100 }],
        io: [{ time: Date.now() / 1000, value: 50 }],
        load: [{ time: Date.now() / 1000, value: 1.2 }],
      },
      cpuModel: a.cpuModel,
      ramTotalMb: a.ramTotal,
      network: a.network,
      thresholdAlerts,
      history: [
        { t: new Date().toISOString(), cpu: a.cpuUsage, ram: a.ramUsage, diskMax: maxDisk },
      ],
    };
  });

  const alerts = agentMetrics.flatMap((m) => m.thresholdAlerts);

  return {
    thresholds,
    agents: agentMetrics,
    alerts,
    summary: {
      totalAgents: agentMetrics.length,
      agentsOverThreshold: agentMetrics.filter((m) => m.thresholdAlerts.length > 0).length,
      lastPollAt: new Date().toISOString(),
      glancesUnreachable: false,
    },
      source: 'glances',
  };
}

function getRealtimeMetrics(agentId) {
  const stripped = String(agentId).replace(/^0+/, '') || '0';
  const num = parseInt(stripped, 10);
  if (Number.isNaN(num)) return null;
  const padded = String(num).padStart(3, '0');
  const agent = getAgentById(padded);
  if (!agent) return null;

  const jitter = () => Math.floor(Math.random() * 6) - 3;
  const ioJitter = () => Math.floor(Math.random() * 400) - 200;

  return {
    agentId: agent.id,
    agentName: agent.name,
    hostIp: agent.ip,
    cpu: Math.min(100, Math.max(0, agent.cpuUsage + jitter())),
    ram: Math.min(100, Math.max(0, agent.ramUsage + jitter())),
    disk: Math.min(100, Math.max(0, (agent.disks?.[0]?.used ?? 50) + jitter())),
    diskUnit: '%',
    diskMetric: 'percent',
    timestamp: Date.now(),
    reachable: true,
    partial: false,
      source: 'glances',
  };
}

function getAIContext() {
  return {
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      os: a.os,
      criticalCount: a.criticalCount,
      complianceScore: a.complianceScore,
    })),
    criticalAlerts: alerts.filter((a) => a.severity >= 12).slice(0, 50),
    vulnerabilities: vulnerabilities.filter((v) => v.severity === 'critical').slice(0, 20),
    compliance: agents.map((a) => ({ name: a.name, score: a.complianceScore })),
    anomalies: agents
      .filter((a) => a.cpuUsage > 80 || a.ramUsage > 85)
      .map((a) => ({ name: a.name, cpu: a.cpuUsage, ram: a.ramUsage })),
  };
}

module.exports = {
  agents,
  alerts,
  vulnerabilities,
  fimEvents,
  getOverview,
  filterAgents,
  filterAlerts,
  paginate,
  getAgentById,
  getAgentProcesses,
  getAgentStats,
  getMetrics,
  getRealtimeMetrics,
  generateCompliance,
  getVulnStats,
  getAIContext,
  MITRE_TACTICS,
};
