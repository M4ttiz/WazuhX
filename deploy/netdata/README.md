# Netdata per WazuhX

WazuhX legge le metriche **solo da Netdata**. Per ogni agente Wazuh, Netdata deve essere installato sullo **stesso host** dell'agente; il backend scopre automaticamente l'IP registrato in Wazuh e interroga la porta **19999**.

Non è necessario configurare `NETDATA_HOST`: l'IP deriva dall'agente Wazuh.

## Installazione su ogni host agente

```bash
bash <(curl -Ss https://get.netdata.cloud/kickstart.sh) --stable-channel --disable-telemetry
```

In `/etc/netdata/netdata.conf`:

```ini
[web]
    bind to = 0.0.0.0
    allow connections from = 127.0.0.1 IP_WAZUHX_BACKEND
```

```bash
sudo systemctl restart netdata
```

## Variabili backend (`.env`)

```env
NETDATA_PORT=19999
NETDATA_SCHEME=http
NETDATA_TIMEOUT_MS=2500
NETDATA_ENABLED=true
METRICS_CACHE_TTL_SECONDS=5
```

Dopo un nuovo agente Wazuh con Netdata attivo, compare automaticamente nella pagina **Metriche** e nel tab **Risorse live** (badge ⚡ nella lista agenti). Se Netdata non risponde, l'UI mostra metriche non disponibili senza errori invasivi.
