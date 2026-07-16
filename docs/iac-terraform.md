# KaziFlow OS — Infrastructure as Code (Terraform)

**Status:** Reference implementation (additive). Adds reproducible infrastructure provisioning alongside the existing Docker/Compose setup.

## 1. Overview

This module provisions KaziFlow's runtime infrastructure on a generic cloud provider using Terraform. It is **optional** — the `docker-compose.yml` path remains the supported quick-start. Use Terraform when you need reproducible, version-controlled infrastructure, multi-environment promotion, and zero-downtime deploys.

## 2. Layout

```
iac/
├── main.tf            # Provider + backend config
├── variables.tf       # Env-specific inputs
├── locals.tf          # Derived values (tags, naming)
├── network.tf         # VPC, subnets, security groups
├── compute.tf         # App (container/VM), NGINX, autoscaling
├── database.tf        # Managed PostgreSQL (PITR enabled)
├── cache.tf           # Redis (managed)
├── storage.tf         # Object storage for backups
├── dns.tf             # Route53 / DNS + ACM cert
├── monitoring.tf      # Prometheus scrape targets, alert webhook
├── environments/
│   ├── staging.tfvars
│   └── production.tfvars
└── README.md
```

## 3. Key Resources

| Resource | Module | Notes |
|----------|--------|-------|
| VPC + subnets | `network.tf` | Public/private split; NAT for egress |
| Container app / VM | `compute.tf` | Runs the standalone Next.js image; health check on `/api/health/live` |
| Managed PostgreSQL | `database.tf` | PITR, automated snapshots (see `docs/backup-dr.md`) |
| Redis | `cache.tf` | Shared cache + distributed rate limiting (`REDIS_URL`) |
| Object storage | `storage.tf` | Backup bucket, versioned, lifecycle to cold storage |
| TLS cert | `dns.tf` | ACM/Let's Encrypt; referenced by NGINX |
| Prometheus | `monitoring.tf` | Scrapes `/api/metrics`, `/api/admin/metrics` |

## 4. Usage

```bash
cd iac
terraform init
terraform plan -var-file=environments/staging.tfvars -out=tfplan
terraform apply tfplan
```

Promote to production by switching the var file. State is stored in a remote backend (S3/GCS) with state locking.

## 5. Secrets

Never commit secrets. Use the cloud secret manager; inject at runtime via the platform's secret store. `APP_ENCRYPTION_KEY` must be present (fail-closed gate). CI injects env via OIDC.

## 6. Backward Compatibility

No change to application code or Compose workflows. Terraform provisions the same components the Compose file defines, so either path yields an equivalent runtime.
