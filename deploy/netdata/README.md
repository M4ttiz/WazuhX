# Netdata per WazuhX

WazuhX legge serie temporali CPU/RAM/Network tramite `GET /api/metrics/netdata/series` (proxy backend verso Netdata sulla porta **19999** dell'agente).

## Installazione rapida (Linux agent)

```bash
bash <(curl -Ss https://get.netdata.cloud/kickstart.sh) --stable-channel --disable-telemetry
```

Su **Wazuh manager / agent**, consenti connessioni dal server WazuhX in `/etc/netdata/netdata.conf`:

```ini
[web]
    allow connections from = 127.0.0.1 SERVER_WAZUHX_IP
```

## Variabili backend (`.env`)

```env
NETDATA_PORT=19999
NETDATA_TIMEOUT_MS=5000
```

Riavvia il backend dopo le modifiche. In **Metriche** seleziona un agente con Netdata attivo; se non raggiungibile compare il banner di errore.
