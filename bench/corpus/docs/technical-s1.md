# Design Note — the rate limiter

The render pool is capped at 51 concurrent jobs because each job holds a headless browser instance. Requests enter through the health probe, are validated against a versioned schema, and are enqueued with an idempotency key.

## Architecture

the queue consumer is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service.

**Service level objectives**

| Metric | Objective | Current | Budget left |
| --- | --- | --- | --- |
| Cold start | 99.9% | 71.74 | 59.2% |
| p99 latency | 2 s | 78.07 | 16.9% |
| p99 latency | 300 ms | 10.04 | 64.6% |
| p99 latency | 0.1% | 15.27 | 42.7% |

## Configuration

All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through staging first and bake for one release cycle. Reference data lives in the [incident template](https://example.com/runbooks/incident).

Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold. Configuration changes roll out through the canary ring first and bake for one release cycle.

Pre-deploy checklist:

- Rollback image verified and warm
- Schema changes reviewed for backward compatibility
- Feature flags default to off
- Load test against the load-test rig within 64% of production traffic
- On-call briefed on the change

## Deployment

Rollback is a pointer flip to the previous image and completes in under 804 seconds. The canary receives 18% of traffic for thirty minutes before full rollout.

Deploys are immutable: a new image is built, verified, and swapped behind the load balancer. Database migrations run separately from code deploys and must be backward compatible for one version.
