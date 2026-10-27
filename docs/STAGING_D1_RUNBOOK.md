# Cloudflare D1 staging rollout

This runbook is intentionally separate from production. Do not apply migrations to the production database while validating PR #29.

## Current repository configuration

- Production Worker: `plantcare-api`
- Production D1 name: `plantcare-db`
- Production D1 ID: `55937f6a-40ff-4cc9-bb5d-1ae53031e289`
- Migration directory: `worker/migrations/`
- The production Wrangler config has no dedicated remote staging database configured.

The staging workflow builds its own temporary Wrangler configuration named `plantcare-api-staging` and rejects a staging D1 ID or name that matches production. It does not write the generated config into Git.

## One-time staging prerequisites

Create a **separate, empty D1 database** in the Cloudflare account. Do not reuse `plantcare-db`. Create or reserve the staging Worker name `plantcare-api-staging` and decide the exact HTTPS origin of the staging frontend.

Configure these repository Actions secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped token allowed to deploy Workers and manage D1 migrations in the intended account |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account containing the staging resources |
| `STAGING_D1_DATABASE_ID` | ID of the dedicated staging D1 database |
| `STAGING_D1_DATABASE_NAME` | Exact name of that staging database; must not be `plantcare-db` |
| `STAGING_APP_ORIGIN` | Exact HTTPS origin of the staging frontend, with no path |
| `STAGING_BETTER_AUTH_SECRET` | Separate random secret for staging authentication; never reuse production's secret |
| `STAGING_WORKER_URL` | HTTPS base URL of the staging Worker, without a path |

Use the narrowest Cloudflare API token permissions that permit the required D1 and Workers operations. Do not store a production token or production auth secret in a staging-specific secret name.

## Run the preflight

1. Open **Actions → Staging D1 preflight → Run workflow**.
2. Leave `apply_remote_staging` disabled for a no-remote-change check. This runs the full test/build suite and applies the migration chain to local-only D1 through Wrangler.
3. After the dedicated staging database and all seven secrets have been verified, enable `apply_remote_staging`. The job will:
   - fail closed if any required secret is missing or if the D1 name/ID points to production;
   - create a temporary staging-only Wrangler config;
   - apply migrations to the dedicated staging D1 database;
   - deploy `plantcare-api-staging`;
   - check `GET /health` and require both `ok: true` and `database: true`;
   - remove the generated config file at the end of the job.

## Acceptance criteria

- Local Wrangler D1 migration apply and migration listing succeed.
- The remote staging migration job succeeds against the dedicated staging D1 only.
- `GET $STAGING_WORKER_URL/health` returns `ok: true` and `database: true`.
- Then test auth, plant sync, concurrent updates, photo upload/download/deletion, and retryable HTTP 409 behavior using staging accounts and non-production data.
- Production migration and production release remain separate actions requiring a separate review.

## Important limitations

This workflow does not provision the D1 database itself, create Vercel preview domains, or perform the two-device end-to-end test. Those require account-level setup and a staging frontend origin. If staging resources or secrets are not configured, do not substitute production resources; keep the remote job disabled until the prerequisites are met.
