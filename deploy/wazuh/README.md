# WazuhX agent metrics (optional)

Use this bundle when syscollector data is too stale or you need **load average** and **realtime CPU/RAM/disk**.

## 1. Install script on each agent

```bash
sudo install -m 755 scripts/agent-metrics.sh /usr/local/bin/wazuhx-agent-metrics.sh
sudo touch /var/log/wazuhx-metrics.log
sudo chmod 640 /var/log/wazuhx-metrics.log
```

Cron (every minute):

```cron
* * * * * root /usr/local/bin/wazuhx-agent-metrics.sh
```

## 2. Logcollector (agent `ossec.conf` or shared agent config)

```xml
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/wazuhx-metrics.log</location>
</localfile>
```

Restart the agent after editing config.

## 3. Manager decoders and rules

Copy to the Wazuh manager:

- `decoders/wazuhx_metrics.xml` → `/var/ossec/etc/decoders/`
- `rules/wazuhx_metrics.xml` → `/var/ossec/etc/rules/`

Then restart the manager API/analysis:

```bash
/var/ossec/bin/wazuh-control restart
```

## 4. WazuhX backend

Set indexer credentials in `.env` (same as dashboard):

```env
WAZUH_INDEXER_URL=https://wazuh-indexer:9200
WAZUH_INDEXER_USER=admin
WAZUH_INDEXER_PASSWORD=...
```

WazuhX reads the latest `wazuhx_metrics` alert per agent and merges it with syscollector when newer.

## Log format

Each line:

```
wazuhx_metrics:{"cpu":45,"ram":78,"disk":62,"load":[1.2,0.8,0.5],"uptime":86400}
```

Compatible with Wazuh **4.7** and **4.8**.
