package metrics

import (
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// Registry is the custom Prometheus registry containing only our application metrics.
var Registry = prometheus.NewRegistry()

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	httpInflightRequests = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_inflight_requests",
			Help: "Number of HTTP requests currently being processed",
		},
	)

	verifyRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "verify_requests_total",
			Help: "Total number of verify endpoint requests",
		},
		[]string{"status"},
	)

	paymentChecksTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_checks_total",
			Help: "Total number of payment check operations",
		},
		[]string{"result"},
	)

	paymentsPendingCount = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "payments_pending_count",
			Help: "Current number of pending payments",
		},
	)
)

func init() {
	Registry.MustRegister(
		httpRequestsTotal,
		httpRequestDuration,
		httpInflightRequests,
		verifyRequestsTotal,
		paymentChecksTotal,
		paymentsPendingCount,
	)
}

// ObserveHTTPRequest records an HTTP request for metrics.
func ObserveHTTPRequest(method, path string, status int, duration time.Duration) {
	statusStr := strconv.Itoa(status)
	httpRequestsTotal.WithLabelValues(method, path, statusStr).Inc()
	httpRequestDuration.WithLabelValues(method, path, statusStr).Observe(duration.Seconds())
}

// IncInflight increments the in-flight requests gauge.
func IncInflight() {
	httpInflightRequests.Inc()
}

// DecInflight decrements the in-flight requests gauge.
func DecInflight() {
	httpInflightRequests.Dec()
}

// IncVerify increments verify_requests_total with the given status.
func IncVerify(status string) {
	verifyRequestsTotal.WithLabelValues(status).Inc()
}

// IncPaymentCheck increments payment_checks_total with the given result.
func IncPaymentCheck(result string) {
	paymentChecksTotal.WithLabelValues(result).Inc()
}

// SetPaymentsPendingCount sets the payments_pending_count gauge.
func SetPaymentsPendingCount(n int) {
	paymentsPendingCount.Set(float64(n))
}
