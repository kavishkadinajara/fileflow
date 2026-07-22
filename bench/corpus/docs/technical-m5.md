# Runbook: the audit logger

Secrets are injected at runtime; nothing sensitive is present in the repository or the image. Configuration changes roll out through staging first and bake for one release cycle. All tunables ship with safe defaults and are overridden per environment through typed configuration. The two settings operators actually change are the worker count and the queue depth alarm threshold.

## Configuration

Configuration changes roll out through the canary ring first and bake for one release cycle. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. All tunables ship with safe defaults and are overridden per environment through typed configuration. Reference data lives in the [load test results](https://example.com/perf/latest).

The two settings operators actually change are the worker count and the queue depth alarm threshold. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. Configuration changes roll out through staging first and bake for one release cycle. All tunables ship with safe defaults and are overridden per environment through typed configuration. Supporting material is available in the [incident template](https://example.com/runbooks/incident). The applicable formula is $p_{99} \leq c \cdot \bar{t} + k\sigma$.

### Configuration — Breakdown

The two settings operators actually change are the worker count and the queue depth alarm threshold. Secrets are injected at runtime; nothing sensitive is present in the repository or the image. All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through production first and bake for one release cycle.

Standard incident response steps:

1. Fail over the render pool to the standby pool if error rate exceeds budget
2. Capture a heap snapshot before recycling workers
3. Acknowledge the page and open an incident channel
4. Write the timeline while memory is fresh
5. Check the health probe saturation on the primary dashboard

## Deployment

Rollback is a pointer flip to the previous image and completes in under 180 seconds. Database migrations run separately from code deploys and must be backward compatible for one version. The canary receives 20% of traffic for thirty minutes before full rollout.

> Hope is not a strategy; a warm rollback image is.

Standard incident response steps:

1. Capture a heap snapshot before recycling workers
2. Fail over the queue consumer to the standby pool if error rate exceeds budget
3. Write the timeline while memory is fresh
4. Check the health probe saturation on the primary dashboard

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| dev | 2 | 2.11.8 | 14.1% |
| canary | 12 | 3.6.0 | 30.7% |
| prod-a | 6 | 2.4.2 | 44.8% |
| dev | 12 | 2.0.3 | 17.8% |
| staging | 9 | 2.10.0 | 31.6% |
| staging | 2 | 2.1.2 | 6.7% |

```typescript
export async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < max; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(2 ** i * 100); }
  }
  throw last;
}
```

## Observability

Alerts page on symptoms (latency, error budget burn) rather than causes. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Structured logs are sampled at 22% in production to control volume. Details are recorded in the [API reference](https://example.com/docs/api/1.4.2). The governing relation is $p_{99} \leq c \cdot \bar{t} + k\sigma$.

Structured logs are sampled at 59% in the load-test rig to control volume. Every request carries a correlation id from ingress to the final artifact. Alerts page on symptoms (latency, error budget burn) rather than causes. The dashboards track queue depth, conversion duration by format pair, and error rate by class.

### Observability — Detail

Every request carries a correlation id from ingress to the final artifact. Structured logs are sampled at 18% in staging to control volume. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes.

## Failure Modes

Poison messages are parked on a dead-letter queue after 19 attempts with exponential backoff. Partial outages in production have historically traced to DNS caching in the rate limiter. If the backing store is unavailable, the ingestion service sheds load by rejecting new work while draining in-flight jobs. Reference data lives in the [schema registry](https://example.com/schemas).

If the backing store is unavailable, the render pool sheds load by rejecting new work while draining in-flight jobs. Poison messages are parked on a dead-letter queue after 19 attempts with exponential backoff. Partial outages in production have historically traced to DNS caching in the schema validator. Details are recorded in the [schema registry](https://example.com/schemas).

## Performance

Profiling showed serialization, not I/O, as the dominant cost in the conversion worker. Batching writes to the store reduced tail latency by 892 ms in the last release. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom.

Batching writes to the store reduced tail latency by 768 ms in the last release. Profiling showed serialization, not I/O, as the dominant cost in the ingestion service. The steady-state benchmark sustains 18 conversions per second with p95 at 849 ms. Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom.
