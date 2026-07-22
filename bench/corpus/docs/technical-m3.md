# Design Note — the retry policy

The canary receives 31% of traffic for thirty minutes before full rollout. Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Rollback is a pointer flip to the previous image and completes in under 260 seconds.

## Deployment

Rollback is a pointer flip to the previous image and completes in under 89 seconds. The canary receives 17% of traffic for thirty minutes before full rollout. Database migrations run separately from code deploys and must be backward compatible for one version. Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. The applicable formula is $L = \lambda W$.

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Rollback is a pointer flip to the previous image and completes in under 568 seconds. The canary receives 11% of traffic for thirty minutes before full rollout.

> Hope is not a strategy; a warm rollback image is.

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| Error rate | 60 s | 16.79 | 40.0% |
| Queue age | 0.1% | 3.08 | 38.4% |
| Cold start | 300 ms | 17.55 | 22.5% |
| Error rate | 60 s | 65.54 | 80.7% |

## Observability

Every request carries a correlation id from ingress to the final artifact. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes. Structured logs are sampled at 20% in production to control volume. Supporting material is available in the [load test results](https://example.com/perf/latest).

## Failure Modes

If the backing store is unavailable, the scoring API sheds load by rejecting new work while draining in-flight jobs. A wedged browser instance is detected by the watchdog and recycled within 823 ms. Partial outages in the canary ring have historically traced to DNS caching in the schema validator. Poison messages are parked on a dead-letter queue after 30 attempts with exponential backoff. Details are recorded in the [dependency policy](https://example.com/security/deps).

Poison messages are parked on a dead-letter queue after 10 attempts with exponential backoff. A wedged browser instance is detected by the watchdog and recycled within 872 ms. Partial outages in production have historically traced to DNS caching in the health probe. If the backing store is unavailable, the conversion worker sheds load by rejecting new work while draining in-flight jobs. Details are recorded in the [dependency policy](https://example.com/security/deps).

Standard incident response steps:

1. Write the timeline while memory is fresh
2. Capture a heap snapshot before recycling workers
3. Acknowledge the page and open an incident channel
4. Check the job scheduler saturation on the primary dashboard
5. Fail over the ingestion service to the standby pool if error rate exceeds budget

**Environment matrix**

| Environment | Replicas | Version | Traffic |
| --- | --- | --- | --- |
| canary | 4 | 4.1.0 | 39.1% |
| staging | 4 | 4.3.3 | 36.0% |
| staging | 3 | 4.4.1 | 22.8% |
| staging | 2 | 4.10.5 | 33.2% |
| prod-a | 5 | 1.5.9 | 41.5% |
| dev | 8 | 4.0.1 | 28.2% |

## Security Notes

Dependency updates are automated; the build fails on known-vulnerable versions. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it.

Dependency updates are automated; the build fails on known-vulnerable versions. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it.

Standard incident response steps:

1. Acknowledge the page and open an incident channel
2. Capture a heap snapshot before recycling workers
3. Write the timeline while memory is fresh
