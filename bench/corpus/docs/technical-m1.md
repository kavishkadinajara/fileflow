# Runbook: the ingestion service

Requests enter through the job scheduler, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 19 concurrent jobs because each job holds a headless browser instance. the audit logger is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service.

## Architecture

Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. The render pool is capped at 2 concurrent jobs because each job holds a headless browser instance. the queue consumer is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Details are recorded in the [load test results](https://example.com/perf/latest).

> If it is not on the dashboard, it did not happen.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Fail over the queue consumer to the standby pool if error rate exceeds budget
3. Write the timeline while memory is fresh
4. Check the health probe saturation on the primary dashboard

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| prod-b | 1 | 1.4.2 | 40.4% |
| prod-b | 6 | 1.12.4 | 39.7% |
| prod-b | 12 | 4.3.1 | 59.4% |
| prod-a | 9 | 4.1.8 | 38.4% |

## Deployment

The canary receives 53% of traffic for thirty minutes before full rollout. Rollback is a pointer flip to the previous image and completes in under 247 seconds. Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version. The full context is in the [schema registry](https://example.com/schemas). The applicable formula is $A = \frac{MTBF}{MTBF + MTTR}$.

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version. The canary receives 55% of traffic for thirty minutes before full rollout. We compute this as $L = \lambda W$.

Standard incident response steps:

1. Capture a heap snapshot before recycling workers
2. Write the timeline while memory is fresh
3. Fail over the scoring API to the standby pool if error rate exceeds budget
4. Acknowledge the page and open an incident channel
5. Check the health probe saturation on the primary dashboard

## Observability

The dashboards track queue depth, conversion duration by format pair, and error rate by class. Structured logs are sampled at 60% in production to control volume. Alerts page on symptoms (latency, error budget burn) rather than causes. Every request carries a correlation id from ingress to the final artifact. See the [schema registry](https://example.com/schemas).

Structured logs are sampled at 36% in the load-test rig to control volume. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes. Every request carries a correlation id from ingress to the final artifact.

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1"
```

## Failure Modes

Poison messages are parked on a dead-letter queue after 43 attempts with exponential backoff. If the backing store is unavailable, the render pool sheds load by rejecting new work while draining in-flight jobs. A wedged browser instance is detected by the watchdog and recycled within 192 ms.
