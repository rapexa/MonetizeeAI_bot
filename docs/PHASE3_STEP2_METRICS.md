# Phase 3 Step 2: Prometheus Metrics

**Date:** January 2026  
**Goal:** Add Prometheus metrics to the Gin backend with a secured `/metrics` endpoint.

---

## 1. Metrics List

### Base HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status | Total number of HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path, status | HTTP request duration |
| `http_inflight_requests` | Gauge | - | Number of requests currently being processed |

Path label uses Gin's route pattern (e.g. `/api/v1/web/verify`) to avoid high cardinality. Unmatched routes use `__noroute__`.

### Business Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `verify_requests_total` | Counter | status | Verify endpoint requests (ok, no_token, bad_request, invalid_token, expired, mismatch) |
| `payment_checks_total` | Counter | result | Payment checker operations (success, pending, failed, error, skipped) |
| `payments_pending_count` | Gauge | - | Current number of pending payments |

---

## 2. Secured /metrics Endpoint

- **Path:** `GET /metrics`
- **Access:** IP allowlist only
  - Default: `127.0.0.1`, `::1`
  - Extra: `METRICS_ALLOWLIST` env var (comma-separated IPs)
- **Denied:** Returns 403 JSON `{"success":false,"error":"Access denied"}`

---

## 3. Curl Commands (Local Testing)

With backend running on `http://127.0.0.1:8080`:

```bash
# Metrics from localhost (allowed)
curl -sS -i http://127.0.0.1:8080/metrics | head -50

# Metrics from non-local (403 when accessed via server IP)
curl -sS -i http://<server-ip>:8080/metrics | head -20

# Generate some traffic to see metrics increment
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/health
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8080/api/v1/web/verify?telegram_id=123"

# Then scrape metrics again to verify increments
curl -sS http://127.0.0.1:8080/metrics | grep -E "http_requests_total|verify_requests"
```

---

## 4. Prometheus + Grafana via Docker Compose

Create `docker/observability/docker-compose.yml`:

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: monetizee-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:10.2.2
    container_name: monetizee-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  grafana-data:
```

Create `docker/observability/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "monetizee-api"
    static_configs:
      - targets: ["host.docker.internal:8080"]
    metrics_path: /metrics
    # If backend runs on host, use host.docker.internal (Mac/Windows) or host IP (Linux)
```

**Run:**

```bash
cd docker/observability
docker-compose up -d

# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)

# Add Prometheus as data source in Grafana:
# URL: http://prometheus:9090
```

**Note:** For Linux, replace `host.docker.internal` with your host IP or use `network_mode: host` for Prometheus.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `metrics/registry.go` | **New** – metric definitions and helper functions |
| `middleware/prom_metrics.go` | **New** – HTTP metrics middleware |
| `web_api.go` | PromMetrics middleware, /metrics route, IncVerify, handleMetrics |
| `payment_checker.go` | IncPaymentCheck, SetPaymentsPendingCount |
| `web_api_test.go` | TestMetricsReturns403FromNonLocal, TestMetricsReturns200FromLocal |

---

## 6. Verification

```bash
./scripts/verify-backend.sh
./scripts/verify-all.sh
```

---

**End of document.**
