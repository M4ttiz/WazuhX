# Netdata per WazuhX

WazuhX legge le metriche **solo da Netdata** (nessun fallback syscollector). Per ogni agente Wazuh, Netdata deve essere installato sullo **stesso host** dell’agente; il backend interroga l’IP registrato in Wazuh sulla porta **19999**.

## Manager (es. 192.168.50.136)

```env
NETDATA_HOST=http://192.168.50.136:19999
```

Usato come default quando l’IP agente non è valido. Gli agenti remoti usano `http://<agent-ip>:19999`.

## Installazione su ogni host agente

```bash
bash <(curl -Ss https://get.netdata.cloud/kickstart.sh) --stable-channel --disable-telemetry
```

In `/etc/netdata/netdata.conf`:

```ini
[web]
    allow connections from = 127.0.0.1 IP_WAZUHX_BACKEND
```

## Variabili backend (`.env`)

```env
NETDATA_HOST=http://192.168.50.136:19999
NETDATA_PORT=19999
NETDATA_SCHEME=http
NETDATA_TIMEOUT_MS=5000
NETDATA_ENABLED=true
METRICS_CACHE_TTL_SECONDS=5
```

Dopo un nuovo agente Wazuh con Netdata attivo, compare automaticamente nella pagina **Metriche** (refresh ogni 5 secondi). Se Netdata non risponde, viene mostrato il banner di errore.
