# StockAI Polymers Production

Production-oriented Industrial Management System (IMS) for StockAI Polymers.

## Repository Structure

- `backend/` — Spring Boot backend, database resources, tests and API
- `frontend/` — React/Vite production web application
- `terraform/` — AWS infrastructure as code
- `deployment/` — deployment and operational scripts
- `docs/` — architecture, deployment, monitoring, backup/DR and release documentation
- `.github/workflows/` — CI/CD and security automation

## Production Architecture

The production baseline uses:

- AWS ECS for the backend service
- Application Load Balancer for ingress
- Amazon RDS PostgreSQL for persistent data
- Amazon ECR for container images
- AWS Secrets Manager for runtime secrets
- CloudWatch for operational logging and monitoring
- Amazon S3 for PostgreSQL backup storage
- React/Vite frontend
- Spring Boot backend

## Quality Gates

Before a production release:

1. Backend: `.\mvnw.cmd clean verify`
2. Frontend: `npm ci`, `npm run lint`, `npm run build`
3. E2E: Playwright critical-path tests
4. Terraform: `terraform fmt -check` and `terraform validate`
5. Security: secret scan, dependency/SCA review and CodeQL
6. Container: build and vulnerability scan
7. Database: backup verification and non-destructive restore drill
8. Load testing: dedicated non-production environment only

## Local Development

### Backend

Run from `backend/`:

`.\mvnw.cmd clean verify`

### Frontend

Run from `frontend/`:

`npm.cmd ci`
`npm.cmd run lint`
`npm.cmd run build`
`npm.cmd run dev`

Local frontend:

http://localhost:5173

Local backend health:

http://localhost:18080/actuator/health

## Security

Never commit:

- Production passwords
- JWT signing secrets
- MFA/TOTP secrets
- AWS access keys
- Private keys
- API keys
- Real `.env` files
- Database dumps
- Temporary credential-generation utilities

Runtime secrets must be supplied through approved secret-management mechanisms.

## Operational Documentation

- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/BACKUP-RESTORE.md`
- `docs/DR-TEST-RESULT.md`
- `docs/RELEASE-CHECKLIST.md`
- `docs/MONITORING.md`
- `docs/TROUBLESHOOTING.md`

## Release Principle

A release is production-ready only when application tests, infrastructure validation, security checks, deployment health checks and operational recovery evidence have been reviewed.

Performance threshold failures must be documented honestly and must not be represented as passing results.

## Production Deployment

Production infrastructure is defined under `terraform/`.

Production deployments should use immutable container image tags/digests and should never depend on a mutable `latest` image.

## Backup and Recovery

PostgreSQL backups are stored outside the application runtime.

Recovery procedures must be tested against a temporary/non-production database before claiming a validated production recovery capability.

## Maintainer

StockAI Polymers Production Engineering
