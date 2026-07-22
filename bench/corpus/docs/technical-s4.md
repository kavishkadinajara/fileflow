# Runbook: the queue consumer

the render pool is stateless; all durable state lives in the backing store, which simplifies horizontal scaling. The render pool is capped at 2 concurrent jobs because each job holds a headless browser instance.

## Architecture

Requests enter through the schema validator, are validated against a versioned schema, and are enqueued with an idempotency key. Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service. Reference data lives in the [dashboard](https://example.com/grafana/the conversion worker).

The render pool is capped at 18 concurrent jobs because each job holds a headless browser instance. the queue consumer is stateless; all durable state lives in the backing store, which simplifies horizontal scaling.

Pre-deploy checklist:

- On-call briefed on the change
- Rollback image verified and warm
- Schema changes reviewed for backward compatibility

## Security Notes

The service enforces a strict size cap and rejects archives that expand beyond it. Input files are treated as hostile: parsing happens in a sandboxed process with no network egress.

Input files are treated as hostile: parsing happens in a sandboxed process with no network egress. The service enforces a strict size cap and rejects archives that expand beyond it.
