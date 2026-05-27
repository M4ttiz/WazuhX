# Scripts

Utility scripts for WazuhX operators.

## deploy/wazuh/scripts/agent-metrics.sh

Bash script to be deployed on Wazuh agents. Collects system metrics and sends them as Wazuh events for ingestion by the custom decoders in `deploy/wazuh/`.

### Usage

```bash
# On each agent:
chmod +x agent-metrics.sh
./agent-metrics.sh
# Or add to cron for periodic collection:
# */1 * * * * /path/to/agent-metrics.sh
```
