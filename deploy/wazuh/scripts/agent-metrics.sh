#!/bin/sh
# Collect host metrics and append one line for Wazuh logcollector.
# Install on agents: chmod +x && cron */1 * * * * /usr/local/bin/agent-metrics.sh

LOG_FILE="${WAZUHX_METRICS_LOG:-/var/log/wazuhx-metrics.log}"

cpu=$(awk '/^cpu / {u=$2+$4; t=$2+$4+$5; if (t>0) print int((u/t)*100); exit}' /proc/stat 2>/dev/null || echo 0)
ram=$(awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{if(t>0) print int((t-a)/t*100); else print 0}' /proc/meminfo 2>/dev/null || echo 0)
disk=$(df -P / 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}' || echo 0)
load=$(awk '{print $1","$2","$3}' /proc/loadavg 2>/dev/null || echo "0,0,0")
uptime=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)

load_json=$(echo "$load" | awk -F, '{printf "[%s,%s,%s]", $1, $2, $3}')

line="wazuhx_metrics:{\"cpu\":${cpu},\"ram\":${ram},\"disk\":${disk},\"load\":${load_json},\"uptime\":${uptime}}"
echo "$line" >> "$LOG_FILE"
