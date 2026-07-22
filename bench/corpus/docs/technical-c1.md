# Runbook: the conversion worker

the render pool exposes a WebSocket interface and delegates heavy work to a pool of 47 workers. This document describes the ingestion service, its dependencies, and the operational procedures for the load-test rig. The design goal is predictable latency: p99 under 333 ms with graceful degradation under load. Ownership sits with the platform team; P. Dissanayake is the current on-call escalation point.

## Overview

the queue consumer exposes a HTTP/2 interface and delegates heavy work to a pool of 38 workers. Ownership sits with the platform team; S. Fernando is the current on-call escalation point. The design goal is predictable latency: p99 under 838 ms with graceful degradation under load. This document describes the audit logger, its dependencies, and the operational procedures for production. Supporting material is available in the [schema registry](https://example.com/schemas).

The design goal is predictable latency: p99 under 602 ms with graceful degradation under load. the render pool exposes a gRPC interface and delegates heavy work to a pool of 24 workers. This document describes the audit logger, its dependencies, and the operational procedures for the load-test rig. Ownership sits with the platform team; N. Perera is the current on-call escalation point. Supporting material is available in the [dashboard](https://example.com/grafana/the ingestion service).

This document describes the scoring API, its dependencies, and the operational procedures for the canary ring. The design goal is predictable latency: p99 under 236 ms with graceful degradation under load. the ingestion service exposes a HTTP/2 interface and delegates heavy work to a pool of 4 workers. Ownership sits with the platform team; A. Jayasuriya is the current on-call escalation point. Details are recorded in the [dependency policy](https://example.com/security/deps).

### Overview — Timeline

This document describes the ingestion service, its dependencies, and the operational procedures for staging. Ownership sits with the platform team; T. Gunawardena is the current on-call escalation point. the conversion worker exposes a HTTP/2 interface and delegates heavy work to a pool of 53 workers. The design goal is predictable latency: p99 under 556 ms with graceful degradation under load.

> Hope is not a strategy; a warm rollback image is.

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Headless browser | rendering | soft | queue locally |
| Metrics sink | rendering | soft | degrade |
| Metrics sink | telemetry | hard | none |
| Metrics sink | job dispatch | hard | none |
| Object store | rendering | soft | queue locally |

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

the ingestion service is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Requests enter through the health probe, are validated against a versioned schema, and are enqueued with an idempotency key. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. The render pool is capped at 29 concurrent jobs because each job holds a headless browser instance.

Requests enter through the cache layer, are validated against a versioned schema, and are enqueued with an idempotency key. The render pool is capped at 61 concurrent jobs because each job holds a headless browser instance. the render pool is stateless; all durable state lives in the backing store, which simplifies horizontal scaling.

### Architecture — Detail

Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. the conversion worker is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. The render pool is capped at 23 concurrent jobs because each job holds a headless browser instance.

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| p99 latency | 60 s | 57.49 | 12.8% |
| Availability | 60 s | 65.05 | 64.7% |
| p99 latency | 99.9% | 42.69 | 93.1% |
| p99 latency | 2 s | 32.77 | 51.8% |
| Availability | 60 s | 25.33 | 60.5% |
| Queue age | 99.9% | 87.81 | 26.2% |

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

## Configuration

All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through staging first and bake for one release cycle. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold. Supporting material is available in the [dashboard](https://example.com/grafana/the conversion worker). We compute this as $L = \lambda W$.

The two settings operators actually change are the worker count and the queue depth alarm threshold. All tunables ship with safe defaults and are overridden per environment through typed configuration. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. Configuration changes roll out through production first and bake for one release cycle. The full context is in the [incident template](https://example.com/runbooks/incident). The governing relation is $L = \lambda W$.

Pre-deploy checklist:

- Schema changes reviewed for backward compatibility
- Load test against the load-test rig within 56% of production traffic
- Feature flags default to off
- Rollback image verified and warm
- On-call briefed on the change

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Headless browser | scoring | hard | degrade |
| Headless browser | telemetry | soft | queue locally |
| Metrics sink | artifacts | hard | queue locally |
| Embedding model | rendering | hard | none |
| Embedding model | rendering | soft | queue locally |
| Object store | job dispatch | soft | none |
| Embedding model | scoring | soft | retry |
| Object store | telemetry | hard | none |

## Observability

The dashboards track queue depth, conversion duration by format pair, and error rate by class. Structured logs are sampled at 14% in the canary ring to control volume. Every request carries a correlation id from ingress to the final artifact. Alerts page on symptoms (latency, error budget burn) rather than causes. Supporting material is available in the [load test results](https://example.com/perf/latest).

The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes. Structured logs are sampled at 47% in production to control volume. Every request carries a correlation id from ingress to the final artifact. Supporting material is available in the [load test results](https://example.com/perf/latest).

## Failure Modes

A wedged browser instance is detected by the watchdog and recycled within 105 ms. If the backing store is unavailable, the conversion worker sheds load by rejecting new work while draining in-flight jobs. Partial outages in the load-test rig have historically traced to DNS caching in the schema validator.

Partial outages in staging have historically traced to DNS caching in the health probe. If the backing store is unavailable, the queue consumer sheds load by rejecting new work while draining in-flight jobs. A wedged browser instance is detected by the watchdog and recycled within 381 ms. Poison messages are parked on a dead-letter queue after 19 attempts with exponential backoff.

## Performance

Profiling showed serialization, not I/O, as the dominant cost in the audit logger. The steady-state benchmark sustains 43 conversions per second with p95 at 558 ms. Batching writes to the store reduced tail latency by 404 ms in the last release.

Profiling showed serialization, not I/O, as the dominant cost in the queue consumer. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. Batching writes to the store reduced tail latency by 328 ms in the last release. The steady-state benchmark sustains 10 conversions per second with p95 at 771 ms. The governing relation is $p_{99} \leq c \cdot \bar{t} + k\sigma$.

Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom. The steady-state benchmark sustains 29 conversions per second with p95 at 298 ms. Profiling showed serialization, not I/O, as the dominant cost in the audit logger. Batching writes to the store reduced tail latency by 258 ms in the last release.

Standard incident response steps:

1. Write the timeline while memory is fresh
2. Check the rate limiter saturation on the primary dashboard
3. Acknowledge the page and open an incident channel

Standard incident response steps:

1. Fail over the conversion worker to the standby pool if error rate exceeds budget
2. Acknowledge the page and open an incident channel
3. Check the cache layer saturation on the primary dashboard
4. Write the timeline while memory is fresh

Standard incident response steps:

1. Write the timeline while memory is fresh
2. Acknowledge the page and open an incident channel
3. Check the job scheduler saturation on the primary dashboard
