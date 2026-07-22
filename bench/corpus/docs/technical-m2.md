# Design Note — the job scheduler

The design goal is predictable latency: p99 under 892 ms with graceful degradation under load. This document describes the ingestion service, its dependencies, and the operational procedures for staging. Ownership sits with the platform team; N. Perera is the current on-call escalation point. the ingestion service exposes a gRPC interface and delegates heavy work to a pool of 11 workers.

## Overview

the ingestion service exposes a REST interface and delegates heavy work to a pool of 12 workers. This document describes the scoring API, its dependencies, and the operational procedures for production. Ownership sits with the platform team; M. Silva is the current on-call escalation point. The design goal is predictable latency: p99 under 241 ms with graceful degradation under load. Reference data lives in the [load test results](https://example.com/perf/latest). We compute this as $L = \lambda W$.

the ingestion service exposes a gRPC interface and delegates heavy work to a pool of 31 workers. This document describes the render pool, its dependencies, and the operational procedures for production. The design goal is predictable latency: p99 under 86 ms with graceful degradation under load. Ownership sits with the platform team; S. Fernando is the current on-call escalation point. Supporting material is available in the [incident template](https://example.com/runbooks/incident).

### Overview — Timeline

The design goal is predictable latency: p99 under 291 ms with graceful degradation under load. Ownership sits with the platform team; K. Bandara is the current on-call escalation point. the ingestion service exposes a HTTP/2 interface and delegates heavy work to a pool of 9 workers. This document describes the ingestion service, its dependencies, and the operational procedures for staging.

> If it is not on the dashboard, it did not happen.

## Configuration

The two settings operators actually change are the worker count and the queue depth alarm threshold. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. Configuration changes roll out through production first and bake for one release cycle. All tunables ship with safe defaults and are overridden per environment through typed configuration. The full context is in the [dashboard](https://example.com/grafana/the scoring API).

All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through production first and bake for one release cycle. The two settings operators actually change are the worker count and the queue depth alarm threshold. Secrets are injected at runtime; nothing sensitive is present in the repository or the image.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Write the timeline while memory is fresh
3. Capture a heap snapshot before recycling workers
4. Fail over the render pool to the standby pool if error rate exceeds budget

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| Error rate | 60 s | 32.55 | 40.1% |
| Error rate | 300 ms | 26.54 | 15.5% |
| Availability | 99.9% | 23.66 | 46.3% |
| Cold start | 60 s | 69.99 | 81.1% |
| Cold start | 99.9% | 2.85 | 18.2% |

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

Partial outages in production have historically traced to DNS caching in the cache layer. Poison messages are parked on a dead-letter queue after 56 attempts with exponential backoff. If the backing store is unavailable, the conversion worker sheds load by rejecting new work while draining in-flight jobs. A wedged browser instance is detected by the watchdog and recycled within 689 ms. The governing relation is $A = \frac{MTBF}{MTBF + MTTR}$.

### Failure Modes — Detail

A wedged browser instance is detected by the watchdog and recycled within 811 ms. Partial outages in the load-test rig have historically traced to DNS caching in the rate limiter. Poison messages are parked on a dead-letter queue after 27 attempts with exponential backoff. If the backing store is unavailable, the ingestion service sheds load by rejecting new work while draining in-flight jobs.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Fail over the render pool to the standby pool if error rate exceeds budget
3. Write the timeline while memory is fresh

## Performance

Batching writes to the store reduced tail latency by 184 ms in the last release. Profiling showed serialization, not I/O, as the dominant cost in the queue consumer. The steady-state benchmark sustains 23 conversions per second with p95 at 128 ms.

The steady-state benchmark sustains 27 conversions per second with p95 at 657 ms. Profiling showed serialization, not I/O, as the dominant cost in the queue consumer. Batching writes to the store reduced tail latency by 427 ms in the last release.

## Security Notes

Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. Dependency updates are automated; the build fails on known-vulnerable versions. The service enforces a strict size cap and rejects archives that expand beyond it.
