# Webhook Delivery Failure Briefs

Static browser-local MVP for turning public-safe failed webhook delivery notes or draft support replies into a customer-ready failure notice, missing-context checklist, retry/backfill handoff, customer action plan, idempotency caveat, and payload/privacy risk flags.

## Public pages

- Landing: `https://ert93333-ops.github.io/webhook-delivery-failure-briefs/`
- Checklist: `https://ert93333-ops.github.io/webhook-delivery-failure-briefs/failed-webhook-delivery-email-template.html`

## Scope

- No live webhook sending, replay, redelivery, endpoint checks, endpoint scans, customer endpoint URL collection, raw payload upload, signing secret storage, customer list upload, customer email sending, security/legal/SLA advice, data-loss guarantee, or external database.
- Shared marketing and notification credentials stay in the private root `.env` of the Hermes playbook, not in this public site directory.

## Verification

From the Hermes playbook root:

```powershell
npm run workflow:webhook-delivery-failure
```
