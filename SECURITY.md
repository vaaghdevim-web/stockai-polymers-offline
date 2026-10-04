# Security Policy

## Scope

This repository contains the StockAI Polymers production application and infrastructure definitions.

## Secret Handling

Never commit:

- AWS access keys or session credentials
- Database passwords
- JWT signing secrets
- MFA/TOTP secrets
- API keys
- Private keys or certificates
- Real .env files
- Production credential exports

Use environment variables, AWS Secrets Manager, GitHub Actions secrets/OIDC and approved secret-management mechanisms.

## Reporting a Vulnerability

Do not open a public issue containing credentials, exploit details or sensitive production information.

Report suspected security vulnerabilities privately to the repository owner or designated security contact.

Include:

- Affected component
- Security impact
- Reproduction steps, where safe
- Evidence that does not contain secrets

## Release Security Gates

Every production release should include:

- Repository secret scan
- Dependency/SCA review
- CodeQL/static analysis
- Container vulnerability scan
- Least-privilege IAM review
- Security-group and network review
- Confirmation that production secrets are external to Git
- Verification that debug/test credentials are not exposed in the UI, scripts or documentation

## Incident Response

If a credential is exposed:

1. Stop using the credential.
2. Rotate or revoke it at the source.
3. Check access logs for unauthorized use.
4. Remove the secret from the working tree and repository.
5. If it was committed, assess repository history and rotate the credential regardless of deletion.
6. Document the incident and corrective action.

Never publish the secret itself in an issue, commit message, log or support request.

## Security Principle

Security controls are release gates, not optional post-release tasks. Production credentials must remain outside source control and must be rotated when exposure is suspected.
