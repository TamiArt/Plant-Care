# PlantCare repository instructions

## Mandatory zero-cost constraint

PlantCare must work using only free and open-source software, free public APIs, and services that have a usable no-payment tier.

- Never introduce a paid API, paid SaaS dependency, trial-only feature, credit-card requirement, or a design that requires upgrading to a paid plan.
- Never require an API key tied to billing.
- Prefer local/browser capabilities, static data, open datasets, and graceful offline fallbacks.
- Before adding an external service, document its free-tier limits, license, attribution, CORS support, privacy impact, and a zero-cost fallback.
- If a proposed feature cannot be delivered reliably at zero cost, keep it disabled or document it as unsupported rather than adding a paid dependency.
- The core garden, care history, reminders, backup, and editorial catalog must continue working without external services.
