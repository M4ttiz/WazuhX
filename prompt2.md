## METRICS PAGE — Remove Syscollector, use Netdata only

Remove ALL syscollector logic from the metrics page and related services.
Do not implement any fallback to syscollector. Netdata is the only data source.

### What to do:

1. Delete or gut any function/service that calls Wazuh syscollector endpoints
   (/syscollector/*). Remove them entirely, do not keep them as fallback.

2. Create (or replace) `services/metricsService.js` to fetch ONLY from Netdata:
   - Base URL from env variable: `NETDATA_HOST` (default: http://localhost:19999)
   - Endpoints to use:
     - CPU:      /api/v1/data?chart=system.cpu&points=60&after=-60&format=json
     - RAM:      /api/v1/data?chart=system.ram&points=60&after=-60&format=json
     - Network:  /api/v1/data?chart=system.net&points=60&after=-60&format=json
     - Disk I/O: /api/v1/data?chart=system.io&points=60&after=-60&format=json
     - Load avg: /api/v1/data?chart=system.load&points=60&after=-60&format=json
   - If Netdata is unreachable, return a clear error object `{ error: 'Netdata unreachable' }`
     and show an error banner in the UI. Do NOT fall back to anything else.

3. Add `NETDATA_HOST=http://<server-ip>:19999` to `.env` and `.env.example`.

4. In the Metrics page component:
   - Remove any code that handles syscollector data shape.
   - Show a red banner "Netdata not reachable — check that Netdata is running on
     the target host (port 19999)" if the API returns an error.
   - Auto-refresh data every 5 seconds using setInterval or React Query refetchInterval.

5. Do not add any "source" toggle, no fallback UI, no syscollector references anywhere.
   The metrics page works with Netdata or shows an error. That's it.