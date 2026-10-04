\# Production Release Checklist



\## Source Control



\* \[ ] Working tree reviewed

\* \[ ] No unintended changes

\* \[ ] `git diff --check` passes

\* \[ ] No credentials or secrets committed

\* \[ ] Release commit identified



\## Backend



\* \[ ] `.\\mvnw.cmd clean verify` passes

\* \[ ] All tests pass

\* \[ ] JaCoCo report generated

\* \[ ] Production JAR generated

\* \[ ] Docker image builds successfully

\* \[ ] Container runs as a non-root user

\* \[ ] Health endpoint returns HTTP 200



\## Frontend



\* \[ ] `npm ci` passes

\* \[ ] `npm run lint` passes

\* \[ ] `npm run build` passes

\* \[ ] Playwright critical authentication tests pass

\* \[ ] No production credentials exposed in frontend assets



\## Infrastructure



\* \[ ] `terraform fmt -check` passes

\* \[ ] `terraform validate` passes

\* \[ ] Terraform plan reviewed

\* \[ ] No unexpected resource destruction

\* \[ ] IAM permissions reviewed

\* \[ ] Security groups reviewed

\* \[ ] Production secrets are externalized



\## Security



\* \[ ] Repository secret scan passes

\* \[ ] CodeQL/security analysis reviewed

\* \[ ] Dependency/SCA scan reviewed

\* \[ ] Container vulnerability scan reviewed

\* \[ ] Debug/test credentials removed

\* \[ ] No private keys or production `.env` files committed



\## Database and Recovery



\* \[ ] Latest PostgreSQL backup verified

\* \[ ] Backup storage verified

\* \[ ] Restore drill completed against a temporary/non-production d
