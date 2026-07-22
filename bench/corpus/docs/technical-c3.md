# Runbook: the render pool

The design goal is predictable latency: p99 under 15 ms with graceful degradation under load. Ownership sits with the platform team; S. Fernando is the current on-call escalation point. the queue consumer exposes a gRPC interface and delegates heavy work to a pool of 37 workers. This document describes the audit logger, its dependencies, and the operational procedures for the load-test rig.

## Overview

Ownership sits with the platform team; H. Weerasinghe is the current on-call escalation point. the ingestion service exposes a REST interface and delegates heavy work to a pool of 15 workers. This document describes the ingestion service, its dependencies, and the operational procedures for the canary ring. The design goal is predictable latency: p99 under 91 ms with graceful degradation under load. Supporting material is available in the [API reference](https://example.com/docs/api/3.9.2). The applicable formula is $p_{99} \leq c \cdot \bar{t} + k\sigma$.

This document describes the queue consumer, its dependencies, and the operational procedures for staging. The design goal is predictable latency: p99 under 722 ms with graceful degradation under load. the conversion worker exposes a REST interface and delegates heavy work to a pool of 31 workers. Ownership sits with the platform team; H. Weerasinghe is the current on-call escalation point. Details are recorded in the [dashboard](https://example.com/grafana/the queue consumer).

the ingestion service exposes a WebSocket interface and delegates heavy work to a pool of 29 workers. Ownership sits with the platform team; H. Weerasinghe is the current on-call escalation point. This document describes the render pool, its dependencies, and the operational procedures for the load-test rig. The design goal is predictable latency: p99 under 534 ms with graceful degradation under load. See the [load test results](https://example.com/perf/latest). The applicable formula is $A = \frac{MTBF}{MTBF + MTTR}$.

### Overview — Supporting Evidence

the conversion worker exposes a HTTP/2 interface and delegates heavy work to a pool of 29 workers. This document describes the conversion worker, its dependencies, and the operational procedures for the canary ring. The design goal is predictable latency: p99 under 121 ms with graceful degradation under load. Ownership sits with the platform team; A. Jayasuriya is the current on-call escalation point.

> Hope is not a strategy; a warm rollback image is.

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Message queue | telemetry | hard | none |
| Headless browser | job dispatch | soft | retry |
| Embedding model | job dispatch | hard | degrade |
| Message queue | telemetry | hard | degrade |
| Headless browser | scoring | hard | queue locally |
| Object store | scoring | soft | none |

## Configuration

Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold. All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through staging first and bake for one release cycle. See the [incident template](https://example.com/runbooks/incident).

The two settings operators actually change are the worker count and the queue depth alarm threshold. All tunables ship with safe defaults and are overridden per environment through typed configuration. Secrets are injected at runtime; nothing sensitive is present in the repository or the image.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Check the job scheduler saturation on the primary dashboard
3. Write the timeline while memory is fresh
4. Fail over the conversion worker to the standby pool if error rate exceeds budget

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1"
```

## Observability

Structured logs are sampled at 4% in the canary ring to control volume. Alerts page on symptoms (latency, error budget burn) rather than causes. Every request carries a correlation id from ingress to the final artifact. The dashboards track queue depth, conversion duration by format pair, and error rate by class.

Structured logs are sampled at 16% in the canary ring to control volume. Every request carries a correlation id from ingress to the final artifact. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes. Reference data lives in the [dependency policy](https://example.com/security/deps).

Pre-deploy checklist:

- Rollback image verified and warm
- Schema changes reviewed for backward compatibility
- Load test against production within 11% of production traffic

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| dev | 6 | 1.5.7 | 36.6% |
| staging | 4 | 2.8.3 | 31.4% |
| dev | 9 | 1.3.8 | 30.8% |
| prod-b | 5 | 1.2.5 | 36.8% |
| canary | 9 | 1.11.3 | 49.5% |
| prod-a | 12 | 2.6.7 | 5.0% |

## Failure Modes

Partial outages in production have historically traced to DNS caching in the schema validator. Poison messages are parked on a dead-letter queue after 10 attempts with exponential backoff. A wedged browser instance is detected by the watchdog and recycled within 201 ms. If the backing store is unavailable, the conversion worker sheds load by rejecting new work while draining in-flight jobs. We compute this as $p_{99} \leq c \cdot \bar{t} + k\sigma$.

A wedged browser instance is detected by the watchdog and recycled within 183 ms. If the backing store is unavailable, the ingestion service sheds load by rejecting new work while draining in-flight jobs. Poison messages are parked on a dead-letter queue after 10 attempts with exponential backoff. Partial outages in production have historically traced to DNS caching in the rate limiter.

If the backing store is unavailable, the render pool sheds load by rejecting new work while draining in-flight jobs. Partial outages in production have historically traced to DNS caching in the job scheduler. Poison messages are parked on a dead-letter queue after 14 attempts with exponential backoff. A wedged browser instance is detected by the watchdog and recycled within 192 ms. Formally, $A = \frac{MTBF}{MTBF + MTTR}$, with terms as defined above.

## Performance

The steady-state benchmark sustains 25 conversions per second with p95 at 675 ms. Profiling showed serialization, not I/O, as the dominant cost in the queue consumer. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. Batching writes to the store reduced tail latency by 847 ms in the last release. See the [dependency policy](https://example.com/security/deps).

The steady-state benchmark sustains 22 conversions per second with p95 at 776 ms. Profiling showed serialization, not I/O, as the dominant cost in the queue consumer. Batching writes to the store reduced tail latency by 244 ms in the last release.

> If it is not on the dashboard, it did not happen.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Fail over the audit logger to the standby pool if error rate exceeds budget
3. Check the health probe saturation on the primary dashboard

## Security Notes

Dependency updates are automated; the build fails on known-vulnerable versions. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it. See the [load test results](https://example.com/perf/latest).

Dependency updates are automated; the build fails on known-vulnerable versions. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it. The full context is in the [dependency policy](https://example.com/security/deps).

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| Queue age | 300 ms | 73.02 | 5.6% |
| p99 latency | 300 ms | 46.68 | 68.1% |
| Availability | 99.9% | 2.21 | 7.5% |
| Queue age | 0.1% | 28.59 | 90.3% |
| Queue age | 99.9% | 38.30 | 21.9% |
| Availability | 99.9% | 50.90 | 69.2% |
| Cold start | 99.9% | 22.70 | 85.0% |
| Availability | 60 s | 34.00 | 42.0% |

Reference data lives in the [load test results](https://example.com/perf/latest).

Pre-deploy checklist:

- Schema changes reviewed for backward compatibility
- Feature flags default to off
- Rollback image verified and warm

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Headless browser | telemetry | hard | retry |
| Message queue | job dispatch | hard | retry |
| Message queue | artifacts | hard | degrade |
| Message queue | artifacts | hard | degrade |
| Metrics sink | job dispatch | soft | queue locally |
| Object store | telemetry | soft | none |
