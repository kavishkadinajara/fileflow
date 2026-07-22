# Design Note — the health probe

All tunables ship with safe defaults and are overridden per environment through typed configuration. Configuration changes roll out through the load-test rig first and bake for one release cycle.

## Configuration

Secrets are injected at runtime; nothing sensitive is present in the repository or the image. The two settings operators actually change are the worker count and the queue depth alarm threshold. Configuration changes roll out through staging first and bake for one release cycle. See the [schema registry](https://example.com/schemas).

Standard incident response steps:

1. Write the timeline while memory is fresh
2. Fail over the queue consumer to the standby pool if error rate exceeds budget
3. Acknowledge the page and open an incident channel

**Dependency inventory**

| Dependency | Purpose | Criticality | Fallback |
| --- | --- | --- | --- |
| Metrics sink | telemetry | soft | retry |
| Embedding model | telemetry | soft | none |
| Message queue | artifacts | soft | retry |
| Metrics sink | artifacts | hard | retry |

## Observability

Structured logs are sampled at 30% in staging to control volume. The dashboards track queue depth, conversion duration by format pair, and error rate by class. Alerts page on symptoms (latency, error budget burn) rather than causes.
