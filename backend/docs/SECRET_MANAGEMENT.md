# StockAI Cloud Secret Management Architecture

## 1. Overview
The StockAI enterprise architecture consumes all operational and security credentials strictly through externalized environment variables injected at container runtime. No credentials or encryption keys are ever baked into container images, committed to version control, or defaulted to insecure fallbacks.

The system is cloud-neutral and integrates with:
- **AWS Secrets Manager / SSM Parameter Store**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**
- **Kubernetes External Secrets Operator (ESO)**

---

## 2. Ingestion Flow

```
+------------------------------------+
| Cloud Secret Manager (Vault / AWS) |
+------------------------------------+
                  |
                  v
+------------------------------------+
| External Secrets Operator (ESO)   |
+------------------------------------+
                  |
                  v
+------------------------------------+
| Kubernetes Secret (stockai-secrets)|
+------------------------------------+
                  |
                  v
+------------------------------------+
| Pod Container Environment Variables|
+------------------------------------+
                  |
                  v
+------------------------------------+
| Spring Boot (Fail-Closed Validated)|
+------------------------------------+
```

---

## 3. Mandatory Production Secret Variables

| Environment Variable | Description | Minimum Constraint |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret key used for signing and verifying HMAC-SHA256 JWT tokens | Minimum 32 characters (256-bit entropy) |
| `DB_PASSWORD` | Operational PostgreSQL database user password | High-entropy alphanumeric + symbols |
| `REDIS_PASSWORD` | In-memory distributed cache and token revocation authentication | High-entropy string |
| `MINIO_ROOT_PASSWORD` | Root / admin secret key for private S3 / MinIO document storage | Minimum 16 characters |
| `IOT_DEVICE_SALT` | Cryptographic salt used for hashing per-device credentials | Minimum 32 characters |
| `MFA_ENFORCED` | Policy toggle enforcing MFA globally for privileged operations | `true` or `false` (Defaults to true for admins) |

---

## 4. Fail-Closed Guarantee (`ProductionSecurityValidator`)
When running under the `prod` or `production` profile, `com.svp.stockai.config.ProductionSecurityValidator` performs startup verification:
1. Validates that `JWT_SECRET` is defined, has not defaulted to known development strings, and contains at least 32 characters.
2. Validates that `DB_PASSWORD` and `REDIS_PASSWORD` are non-empty and not default sample values.
3. If any check fails, the application aborts immediately with `IllegalStateException`, preventing an insecure container from becoming ready or serving traffic.
