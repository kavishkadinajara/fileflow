# Design Note — the cache layer

This document describes the audit logger, its dependencies, and the operational procedures for the canary ring. Ownership sits with the platform team; A. Jayasuriya is the current on-call escalation point. The design goal is predictable latency: p99 under 416 ms with graceful degradation under load.

## Overview

The design goal is predictable latency: p99 under 357 ms with graceful degradation under load. This document describes the conversion worker, its dependencies, and the operational procedures for staging. the conversion worker exposes a REST interface and delegates heavy work to a pool of 50 workers. Ownership sits with the platform team; R. Wickramasinghe is the current on-call escalation point. The governing relation is $L = \lambda W$.

The design goal is predictable latency: p99 under 211 ms with graceful degradation under load. This document describes the scoring API, its dependencies, and the operational procedures for the canary ring. the render pool exposes a HTTP/2 interface and delegates heavy work to a pool of 63 workers. Ownership sits with the platform team; S. Fernando is the current on-call escalation point. Details are recorded in the [load test results](https://example.com/perf/latest).

> If it is not on the dashboard, it did not happen.

Pre-deploy checklist:

- On-call briefed on the change
- Load test against the canary ring within 37% of production traffic
- Rollback image verified and warm
- Feature flags default to off
- Schema changes reviewed for backward compatibility

## Architecture

The render pool is capped at 49 concurrent jobs because each job holds a headless browser instance. Requests enter through the health probe, are validated against a versioned schema, and are enqueued with an idempotency key. the conversion worker is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. We compute this as $A = \frac{MTBF}{MTBF + MTTR}$.

Requests enter through the job scheduler, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 48 concurrent jobs because each job holds a headless browser instance. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. the conversion worker is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Supporting material is available in the [dashboard](https://example.com/grafana/the queue consumer).

Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. The render pool is capped at 24 concurrent jobs because each job holds a headless browser instance. Requests enter through the retry policy, are validated against a versioned schema, and are enqueued with an idempotency key. the scoring API is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Details are recorded in the [load test results](https://example.com/perf/latest).

> Hope is not a strategy; a warm rollback image is.

Standard incident response steps:

1. Fail over the conversion worker to the standby pool if error rate exceeds budget
2. Acknowledge the page and open an incident channel
3. Capture a heap snapshot before recycling workers
4. Write the timeline while memory is fresh

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| staging | 6 | 2.2.1 | 3.5% |
| dev | 2 | 1.6.5 | 11.0% |
| staging | 9 | 2.11.9 | 14.2% |
| prod-a | 7 | 1.4.3 | 23.4% |
| canary | 12 | 3.1.8 | 58.6% |

## Configuration

Secrets are injected at runtime; nothing sensitive is present in the repository or the image. All tunables ship with safe defaults and are overridden per environment through typed configuration. The two settings operators actually change are the worker count and the queue depth alarm threshold. Configuration changes roll out through the load-test rig first and bake for one release cycle. Details are recorded in the [schema registry](https://example.com/schemas).

Configuration changes roll out through staging first and bake for one release cycle. All tunables ship with safe defaults and are overridden per environment through typed configuration. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold. See the [schema registry](https://example.com/schemas).

### Configuration — Detail

All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through the load-test rig first and bake for one release cycle. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold.

Standard incident response steps:

1. Write the timeline while memory is fresh
2. Capture a heap snapshot before recycling workers
3. Acknowledge the page and open an incident channel
4. Fail over the scoring API to the standby pool if error rate exceeds budget
5. Check the cache layer saturation on the primary dashboard

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1"
```

## Deployment

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Rollback is a pointer flip to the previous image and completes in under 866 seconds. Database migrations run separately from code deploys and must be backward compatible for one version.

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version. Rollback is a pointer flip to the previous image and completes in under 339 seconds. See the [API reference](https://example.com/docs/api/1.6.0).

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version. The canary receives 16% of traffic for thirty minutes before full rollout. Rollback is a pointer flip to the previous image and completes in under 217 seconds.

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| dev | 6 | 1.12.4 | 42.0% |
| prod-b | 1 | 4.5.3 | 43.7% |
| canary | 12 | 1.6.2 | 28.5% |
| staging | 5 | 1.1.8 | 17.3% |
| canary | 12 | 2.7.2 | 6.4% |
| prod-b | 11 | 3.1.9 | 43.1% |
| prod-b | 11 | 4.2.5 | 37.8% |

## Observability

The dashboards track queue depth, conversion duration by format pair, and error rate by class. Every request carries a correlation id from ingress to the final artifact. Structured logs are sampled at 37% in staging to control volume. Alerts page on symptoms (latency, error budget burn) rather than causes.

Alerts page on symptoms (latency, error budget burn) rather than causes. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Structured logs are sampled at 50% in the load-test rig to control volume. Every request carries a correlation id from ingress to the final artifact.

Every request carries a correlation id from ingress to the final artifact. Alerts page on symptoms (latency, error budget burn) rather than causes. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Structured logs are sampled at 21% in the canary ring to control volume.

### Observability — Notes

Alerts page on symptoms (latency, error budget burn) rather than causes. Structured logs are sampled at 36% in staging to control volume. The dashboards track queue depth, conversion duration by format pair, and error rate by class.

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Embedding model | rendering | soft | none |
| Embedding model | telemetry | soft | none |
| Metrics sink | rendering | hard | queue locally |
| Metrics sink | rendering | hard | none |
| Message queue | artifacts | hard | none |
| Message queue | scoring | hard | retry |
| Headless browser | rendering | hard | degrade |

## Failure Modes

Partial outages in the canary ring have historically traced to DNS caching in the rate limiter. If the backing store is unavailable, the audit logger sheds load by rejecting new work while draining in-flight jobs. A wedged browser instance is detected by the watchdog and recycled within 813 ms. Poison messages are parked on a dead-letter queue after 63 attempts with exponential backoff.

Partial outages in production have historically traced to DNS caching in the schema validator. If the backing store is unavailable, the conversion worker sheds load by rejecting new work while draining in-flight jobs. Poison messages are parked on a dead-letter queue after 40 attempts with exponential backoff. A wedged browser instance is detected by the watchdog and recycled within 743 ms.

## Performance

Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. The steady-state benchmark sustains 20 conversions per second with p95 at 836 ms. Profiling showed serialization, not I/O, as the dominant cost in the scoring API. Batching writes to the store reduced tail latency by 381 ms in the last release.

Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. The steady-state benchmark sustains 27 conversions per second with p95 at 831 ms. Batching writes to the store reduced tail latency by 669 ms in the last release.

The steady-state benchmark sustains 55 conversions per second with p95 at 485 ms. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. Batching writes to the store reduced tail latency by 40 ms in the last release.
