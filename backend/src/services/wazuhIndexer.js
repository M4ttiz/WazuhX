const axios = require('axios');
const https = require('https');

let client = null;
let lastIndexerError = null;

function isConfigured() {
  return Boolean(process.env.WAZUH_INDEXER_URL);
}

function formatAgentId(id) {
  const stripped = String(id).replace(/^0+/, '') || '0';
  const num = parseInt(stripped, 10);
  if (Number.isNaN(num)) return String(id).padStart(3, '0');
  return String(num).padStart(3, '0');
}

function getClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = axios.create({
      baseURL: process.env.WAZUH_INDEXER_URL.replace(/\/$/, ''),
      auth: {
        username: process.env.WAZUH_INDEXER_USER || process.env.WAZUH_USER,
        password: process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_PASSWORD,
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return client;
}

async function search(indexPattern, body) {
  const c = getClient();
  if (!c) return null;
  try {
    const { data } = await c.post(`/${indexPattern}/_search`, body);
    lastIndexerError = null;
    return data;
  } catch (err) {
    lastIndexerError = err.response?.data?.error?.reason || err.message;
    console.warn('Wazuh Indexer:', lastIndexerError);
    return null;
  }
}

function levelToSeverity(level) {
  if (level >= 12) return 'critical';
  if (level >= 10) return 'high';
  if (level >= 7) return 'medium';
  return 'low';
}

function extractMitreFields(mitre) {
  if (!mitre) return { mitreTechnique: '', mitreTechniqueName: '', mitreTactic: '' };
  const entry = Array.isArray(mitre) ? mitre[0] : mitre;
  return {
    mitreTechnique: entry?.id || '',
    mitreTechniqueName: entry?.technique || entry?.name || '',
    mitreTactic: entry?.tactic || '',
  };
}

function normalizeAlert(hit) {
  const src = hit._source || {};
  const rule = src.rule || {};
  const agent = src.agent || {};
  const level = rule.level || 0;
  const sev = levelToSeverity(level);
  const mitreFields = extractMitreFields(rule.mitre);
  const base = {
    id: hit._id || `${agent.id}-${src.timestamp}`,
    timestamp: src.timestamp || src['@timestamp'],
    agentId: String(agent.id || ''),
    agentName: agent.name || `agent-${agent.id}`,
    ruleId: String(rule.id || ''),
    ruleDescription: rule.description || 'Unknown',
    level,
    severity: level,
    severityLabel: sev,
    groups: rule.groups || [],
    mitre: rule.mitre || null,
    fullLog: src.full_log || null,
    description: rule.description || 'Unknown',
    rawLog: src.full_log || null,
    ...mitreFields,
  };
  return base;
}

function normalizeIndexerVuln(hit) {
  const src = hit._source || {};
  const vuln = src.vulnerability || {};
  const pkg = src.package || {};
  const agent = src.agent || {};
  const rawSev = (vuln.severity || '').toLowerCase();
  const severity =
    rawSev === 'critical' || rawSev === 'high' || rawSev === 'medium' || rawSev === 'low'
      ? rawSev
      : (vuln.score?.base || 0) >= 9
        ? 'critical'
        : (vuln.score?.base || 0) >= 7
          ? 'high'
          : (vuln.score?.base || 0) >= 4
            ? 'medium'
            : 'low';

  return {
    id: hit._id || `${vuln.id}-${agent.id}`,
    cve: vuln.id || vuln.cve || 'UNKNOWN',
    agentId: String(agent.id || ''),
    agentName: agent.name || `agent-${agent.id}`,
    package: pkg.name || 'unknown',
    version: pkg.version || 'N/A',
    fixVersion: vuln.fix_version || null,
    cvss: vuln.score?.base || vuln.cvss?.score || 0,
    severity,
    hasFix: Boolean(vuln.fix_version),
    detectedAt: src.detected_at || src['@timestamp'] || new Date().toISOString(),
    description: vuln.description || vuln.title || pkg.description || '',
  };
}

function normalizeFimFromAlert(src) {
  const agent = src.agent || {};
  const syscheck = src.syscheck || src.data || {};
  const path = syscheck.path || syscheck.file || '';
  const typeMap = { added: 'added', modified: 'modified', deleted: 'deleted' };
  const evt = syscheck.event || syscheck.type || 'modified';
  return {
    id: `fim-${agent.id}-${path}-${src.timestamp}`,
    timestamp: src.timestamp || src['@timestamp'],
    agentId: String(agent.id || ''),
    agentName: agent.name || `agent-${agent.id}`,
    path,
    type: typeMap[evt] || evt,
    size: syscheck.size_after || syscheck.size || 0,
    permissions: syscheck.perm_after || syscheck.permissions || null,
    user: syscheck.uname_after || syscheck.user || 'unknown',
    critical: ['/etc/', '/bin/', '/usr/bin/', '/sbin/', '/usr/sbin/', 'cron'].some((p) =>
      path.includes(p)
    ),
    md5Before: syscheck.md5_before || null,
    md5After: syscheck.md5_after || null,
    sha256Before: syscheck.sha256_before || null,
    sha256After: syscheck.sha256_after || null,
  };
}

function buildAlertQueryMust(filters = {}) {
  const must = [];

  if (filters.agentId) {
    must.push({ term: { 'agent.id': formatAgentId(filters.agentId) } });
  }
  if (filters.severity) {
    const ranges = {
      critical: { gte: 12 },
      high: { gte: 10, lt: 12 },
      medium: { gte: 7, lt: 10 },
      low: { lt: 7 },
      info: { lt: 4 },
    };
    const r = ranges[filters.severity.toLowerCase()];
    if (r) must.push({ range: { 'rule.level': r } });
  }
  if (filters.severityMin != null && filters.severityMin !== '') {
    must.push({ range: { 'rule.level': { gte: parseInt(filters.severityMin, 10) } } });
  }
  if (filters.severityMax != null && filters.severityMax !== '') {
    must.push({ range: { 'rule.level': { lte: parseInt(filters.severityMax, 10) } } });
  }
  if (filters.from || filters.to) {
    const range = {};
    if (filters.from) range.gte = filters.from;
    if (filters.to) range.lte = filters.to;
    must.push({ range: { '@timestamp': range } });
  }
  if (filters.mitreTactic) {
    must.push({
      wildcard: { 'rule.mitre.tactic': `*${filters.mitreTactic}*` },
    });
  }
  if (filters.ruleGroup) {
    must.push({ term: { 'rule.groups': filters.ruleGroup } });
  }
  if (filters.search) {
    must.push({
      simple_query_string: {
        query: filters.search,
        fields: ['rule.description', 'full_log', 'agent.name'],
        default_operator: 'and',
      },
    });
  }
  return must;
}

async function getAlerts(filters = {}) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = Math.min(parseInt(filters.limit, 10) || 25, 100);
  const from = (page - 1) * limit;
  const must = buildAlertQueryMust(filters);

  const result = await search('wazuh-alerts-*', {
    from,
    size: limit,
    sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
    query: must.length ? { bool: { must } } : { match_all: {} },
    track_total_hits: true,
  });

  if (!result?.hits) return null;

  const total =
    typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total || 0;

  return {
    data: result.hits.hits.map(normalizeAlert),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getVulnerabilities(agentId) {
  const must = [];
  if (agentId) {
    must.push({ term: { 'agent.id': formatAgentId(agentId) } });
  }

  const result = await search('wazuh-states-vulnerabilities-*', {
    size: 5000,
    query: must.length ? { bool: { must } } : { match_all: {} },
  });

  if (!result?.hits?.hits?.length) return null;
  return result.hits.hits.map(normalizeIndexerVuln);
}

async function getFimEvents(agentId, limit = 300) {
  const must = [
    {
      bool: {
        should: [
          { term: { 'rule.groups': 'syscheck' } },
          { match: { 'rule.groups': 'syscheck' } },
        ],
        minimum_should_match: 1,
      },
    },
  ];
  if (agentId) {
    must.push({ term: { 'agent.id': formatAgentId(agentId) } });
  }

  const result = await search('wazuh-alerts-*', {
    size: limit,
    sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
    query: { bool: { must } },
  });

  if (!result?.hits?.hits?.length) return null;
  return result.hits.hits.map((h) => normalizeFimFromAlert(h._source || {}));
}

async function getAlertOverview() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const result = await search('wazuh-alerts-*', {
    size: 10,
    sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
    query: {
      range: {
        timestamp: { gte: sevenDaysAgo.toISOString() },
      },
    },
    aggs: {
      severity: {
        filters: {
          filters: {
            critical: { range: { 'rule.level': { gte: 12 } } },
            high: { range: { 'rule.level': { gte: 10, lt: 12 } } },
            medium: { range: { 'rule.level': { gte: 7, lt: 10 } } },
            low: { range: { 'rule.level': { lt: 7 } } },
          },
        },
      },
      by_day: {
        date_histogram: {
          field: 'timestamp',
          calendar_interval: 'day',
          min_doc_count: 0,
        },
        aggs: {
          critical: { filter: { range: { 'rule.level': { gte: 12 } } } },
          high: { filter: { range: { 'rule.level': { gte: 10, lt: 12 } } } },
          medium: { filter: { range: { 'rule.level': { gte: 7, lt: 10 } } } },
          low: { filter: { range: { 'rule.level': { lt: 7 } } } },
        },
      },
      top_rules: {
        terms: { field: 'rule.id', size: 5 },
      },
    },
  });

  if (!result) return null;

  const sevBuckets = result.aggregations?.severity?.buckets || {};
  const severityDist = {
    critical: sevBuckets.critical?.doc_count || 0,
    high: sevBuckets.high?.doc_count || 0,
    medium: sevBuckets.medium?.doc_count || 0,
    low: sevBuckets.low?.doc_count || 0,
  };
  const totalAlerts = Object.values(severityDist).reduce((a, b) => a + b, 0);

  const dayBuckets = result.aggregations?.by_day?.buckets || [];
  const severityTrend = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    const key = day.toISOString().split('T')[0];
    const bucket =
      dayBuckets.find((b) => b.key_as_string?.startsWith(key) || b.key === key) || {};
    severityTrend.push({
      date: key,
      critical: bucket.critical?.doc_count || 0,
      high: bucket.high?.doc_count || 0,
      medium: bucket.medium?.doc_count || 0,
      low: bucket.low?.doc_count || 0,
    });
  }

  const topRules = (result.aggregations?.top_rules?.buckets || []).map((b) => ({
    ruleId: String(b.key),
    count: b.doc_count,
    description: `Rule ${b.key}`,
  }));

  const recentActivity = (result.hits?.hits || []).map((h) => {
    const a = normalizeAlert(h);
    return {
      id: a.id,
      timestamp: a.timestamp,
      agentName: a.agentName,
      description: a.ruleDescription,
      severity: a.severity,
    };
  });

  return {
    kpis: {
      totalAlerts,
      criticalAlerts: severityDist.critical,
    },
    severityTrend,
    severityDist,
    topRules,
    recentActivity,
    hasCriticalIncident: severityDist.critical > 0,
  };
}

async function getLiveAlertCount() {
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const result = await search('wazuh-alerts-*', {
    size: 0,
    track_total_hits: true,
    query: {
      range: { timestamp: { gte: oneMinAgo } },
    },
  });
  if (!result?.hits) return null;
  return typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total || 0;
}

function parseCustomMetricsPayload(src) {
  const raw = src.full_log || src.message || src.data || '';
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const match = text.match(/wazuhx_metrics:\s*(\{[\s\S]*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function getLatestCustomMetrics(agentId) {
  const must = [
    {
      bool: {
        should: [
          { term: { 'rule.groups': 'wazuhx_metrics' } },
          { match: { 'rule.groups': 'wazuhx_metrics' } },
        ],
        minimum_should_match: 1,
      },
    },
    { term: { 'agent.id': formatAgentId(agentId) } },
  ];

  const result = await search('wazuh-alerts-*', {
    size: 1,
    sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
    query: { bool: { must } },
  });

  const hit = result?.hits?.hits?.[0];
  if (!hit) return null;

  const src = hit._source || {};
  const payload = parseCustomMetricsPayload(src);
  if (!payload) return null;

  return {
    ...payload,
    timestamp: src.timestamp || src['@timestamp'],
  };
}

function getStatus() {
  return {
    configured: isConfigured(),
    lastError: lastIndexerError,
  };
}

async function getAlertsTimeline(filters = {}) {
  const must = buildAlertQueryMust(filters);
  const interval = filters.interval || '1h';
  const result = await search('wazuh-alerts-*', {
    size: 0,
    query: must.length ? { bool: { must } } : { match_all: {} },
    aggs: {
      over_time: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: interval,
          min_doc_count: 0,
        },
      },
    },
  });

  if (!result?.aggregations?.over_time?.buckets) return null;
  return {
    data: result.aggregations.over_time.buckets.map((b) => ({
      date: b.key_as_string || new Date(b.key).toISOString(),
      count: b.doc_count,
    })),
  };
}

module.exports = {
  isConfigured,
  formatAgentId,
  getAlerts,
  getAlertsTimeline,
  getVulnerabilities,
  getFimEvents,
  getAlertOverview,
  getLiveAlertCount,
  getLatestCustomMetrics,
  getStatus,
};
