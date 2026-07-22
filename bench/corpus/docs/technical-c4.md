# Runbook: the conversion worker

Ownership sits with the platform team; K. Bandara is the current on-call escalation point. the render pool exposes a gRPC interface and delegates heavy work to a pool of 21 workers. The design goal is predictable latency: p99 under 820 ms with graceful degradation under load. This document describes the scoring API, its dependencies, and the operational procedures for production.

## Overview

This document describes the audit logger, its dependencies, and the operational procedures for the load-test rig. Ownership sits with the platform team; R. Wickramasinghe is the current on-call escalation point. the audit logger exposes a gRPC interface and delegates heavy work to a pool of 19 workers. The design goal is predictable latency: p99 under 262 ms with graceful degradation under load. Supporting material is available in the [load test results](https://example.com/perf/latest). The governing relation is $p_{99} \leq c \cdot \bar{t} + k\sigma$.

The design goal is predictable latency: p99 under 572 ms with graceful degradation under load. the audit logger exposes a WebSocket interface and delegates heavy work to a pool of 49 workers. Ownership sits with the platform team; M. Silva is the current on-call escalation point. This document describes the queue consumer, its dependencies, and the operational procedures for the load-test rig. The full context is in the [dashboard](https://example.com/grafana/the scoring API).

### Overview — Timeline

This document describes the conversion worker, its dependencies, and the operational procedures for the load-test rig. The design goal is predictable latency: p99 under 516 ms with graceful degradation under load. the conversion worker exposes a REST interface and delegates heavy work to a pool of 31 workers. Ownership sits with the platform team; N. Perera is the current on-call escalation point.

> Hope is not a strategy; a warm rollback image is.

Standard incident response steps:

1. Fail over the queue consumer to the standby pool if error rate exceeds budget
2. Check the rate limiter saturation on the primary dashboard
3. Capture a heap snapshot before recycling workers

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| Cold start | 300 ms | 36.99 | 42.2% |
| Availability | 99.9% | 79.04 | 28.0% |
| Error rate | 99.9% | 97.68 | 94.5% |
| Cold start | 99.9% | 0.73 | 85.9% |
| Queue age | 99.9% | 45.26 | 7.0% |

```python
@app.post("/convert")
async def convert(job: Job):
    key = idempotency_key(job)
    if cached := store.get(key):
        return cached
    result = await pool.run(job)
    store.put(key, result, ttl=3600)
    return result
```

## Architecture

Requests enter through the retry policy, are validated against a versioned schema, and are enqueued with an idempotency key. the scoring API is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. The render pool is capped at 61 concurrent jobs because each job holds a headless browser instance. We compute this as $A = \frac{MTBF}{MTBF + MTTR}$.

the audit logger is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Requests enter through the rate limiter, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 41 concurrent jobs because each job holds a headless browser instance. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service.

Requests enter through the health probe, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 23 concurrent jobs because each job holds a headless browser instance. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. the render pool is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. The full context is in the [load test results](https://example.com/perf/latest).

Pre-deploy checklist:

- Feature flags default to off
- On-call briefed on the change
- Load test against staging within 49% of production traffic
- Schema changes reviewed for backward compatibility
- Rollback image verified and warm

```typescript
export async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < max; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(2 ** i * 100); }
  }
  throw last;
}
```

## Deployment

Database migrations run separately from code deploys and must be backward compatible for one version. Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. The canary receives 39% of traffic for thirty minutes before full rollout. Details are recorded in the [dashboard](https://example.com/grafana/the queue consumer).

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version. Rollback is a pointer flip to the previous image and completes in under 387 seconds. The canary receives 7% of traffic for thirty minutes before full rollout. The full context is in the [dependency policy](https://example.com/security/deps).

### Deployment — Timeline

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Rollback is a pointer flip to the previous image and completes in under 107 seconds. The canary receives 39% of traffic for thirty minutes before full rollout. Database migrations run separately from code deploys and must be backward compatible for one version.

Pre-deploy checklist:

- Rollback image verified and warm
- On-call briefed on the change
- Schema changes reviewed for backward compatibility
- Load test against production within 29% of production traffic

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Message queue | telemetry | hard | degrade |
| Object store | scoring | soft | none |
| Embedding model | job dispatch | hard | none |
| Message queue | job dispatch | hard | retry |
| Message queue | scoring | hard | none |
| Embedding model | rendering | hard | retry |
| Embedding model | job dispatch | soft | retry |

## Observability

Alerts page on symptoms (latency, error budget burn) rather than causes. Every request carries a correlation id from ingress to the final artifact. Structured logs are sampled at 62% in production to control volume. Details are recorded in the [load test results](https://example.com/perf/latest).

Structured logs are sampled at 39% in the load-test rig to control volume. Alerts page on symptoms (latency, error budget burn) rather than causes. Every request carries a correlation id from ingress to the final artifact. The dashboards track queue depth, conversion duration by format pair, and error rate by class. See the [dependency policy](https://example.com/security/deps).

> If it is not on the dashboard, it did not happen.

Standard incident response steps:

1. Fail over the ingestion service to the standby pool if error rate exceeds budget
2. Acknowledge the page and open an incident channel
3. Capture a heap snapshot before recycling workers
4. Write the timeline while memory is fresh

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| dev | 6 | 4.9.9 | 58.0% |
| canary | 4 | 1.10.6 | 2.9% |
| staging | 12 | 2.0.4 | 5.5% |
| prod-a | 8 | 3.1.1 | 43.6% |
| prod-a | 3 | 4.0.0 | 38.1% |
| prod-b | 6 | 3.12.2 | 51.1% |
| staging | 7 | 4.2.2 | 17.3% |
| staging | 6 | 3.12.2 | 26.2% |

## Failure Modes

Partial outages in the load-test rig have historically traced to DNS caching in the health probe. A wedged browser instance is detected by the watchdog and recycled within 763 ms. Poison messages are parked on a dead-letter queue after 40 attempts with exponential backoff. If the backing store is unavailable, the scoring API sheds load by rejecting new work while draining in-flight jobs. See the [dashboard](https://example.com/grafana/the audit logger).

If the backing store is unavailable, the scoring API sheds load by rejecting new work while draining in-flight jobs. Partial outages in production have historically traced to DNS caching in the schema validator. A wedged browser instance is detected by the watchdog and recycled within 119 ms. Poison messages are parked on a dead-letter queue after 33 attempts with exponential backoff. Supporting material is available in the [dashboard](https://example.com/grafana/the conversion worker).

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Embedding model | artifacts | hard | retry |
| Object store | artifacts | hard | queue locally |
| Headless browser | job dispatch | hard | queue locally |
| Embedding model | job dispatch | soft | retry |
| Metrics sink | job dispatch | soft | none |
| Embedding model | job dispatch | hard | degrade |

## Performance

The steady-state benchmark sustains 57 conversions per second with p95 at 681 ms. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. Batching writes to the store reduced tail latency by 495 ms in the last release. Profiling showed serialization, not I/O, as the dominant cost in the render pool.

The steady-state benchmark sustains 33 conversions per second with p95 at 791 ms. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. Profiling showed serialization, not I/O, as the dominant cost in the conversion worker.

### Performance — Supporting Evidence

Batching writes to the store reduced tail latency by 818 ms in the last release. Profiling showed serialization, not I/O, as the dominant cost in the ingestion service. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. The steady-state benchmark sustains 56 conversions per second with p95 at 438 ms.

## Security Notes

Dependency updates are automated; the build fails on known-vulnerable versions. The service enforces a strict size cap and rejects archives that expand beyond it. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress.

Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. Dependency updates are automated; the build fails on known-vulnerable versions. The service enforces a strict size cap and rejects archives that expand beyond it.

Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it. Dependency updates are automated; the build fails on known-vulnerable versions.
