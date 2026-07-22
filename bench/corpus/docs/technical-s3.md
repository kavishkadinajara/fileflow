# Design Note — the job scheduler

Requests enter through the retry policy, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 23 concurrent jobs because each job holds a headless browser instance. the conversion worker is stateless; all durable state lives in the backing store, which simplifies horizontal scaling.

## Architecture

Requests enter through the job scheduler, are validated against a versioned schema, and are enqueued with an idempotency key. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. the scoring API is stateless; all durable state lives in the backing store, which simplifies horizontal scaling.

Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. The render pool is capped at 31 concurrent jobs because each job holds a headless browser instance. the audit logger is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Supporting material is available in the [dashboard](https://example.com/grafana/the audit logger).

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Write the timeline while memory is fresh
3. Fail over the ingestion service to the standby pool if error rate exceeds budget
4. Check the cache layer saturation on the primary dashboard

## Observability

Every request carries a correlation id from ingress to the final artifact. Alerts page on symptoms (latency, error budget burn) rather than causes. The dashboards track queue depth, conversion duration by format pair, and error rate by class.

## Failure Modes

Poison messages are parked on a dead-letter queue after 19 attempts with exponential backoff. Partial outages in the load-test rig have historically traced to DNS caching in the cache layer.
