# StockAI Enterprise Secret Rotation Guide

## 1. Executive Summary
During the security audit of the StockAI repository, several hardcoded fallback credentials and default tokens were identified in Git-tracked files (`application.properties`, `docker-compose.yml`, Postman environment collections, and documentation).

**Critical Security Rule:** Removing or deleting credentials from current source code does NOT make them safe. Any credential that was ever committed or exposed must be treated as permanently compromised and immediately rotated in production and staging environments.

---

## 2. Inventory of Exposed Credentials Requiring Immediate Rotation

| Credential Identifier | Previous Exposure Location | Severity | Rotation Urgency |
| :--- | :--- | :--- | :--- |
| **JWT Signing Secret** | `application.properties`, `docker-compose.yml` | **CRITICAL** | Immediate (< 24 hrs) |
| **PostgreSQL DB Password** | `docker-compose.yml`, `application.properties` | **CRITICAL** | Immediate (< 24 hrs) |
| **Redis Cache Password** | `docker-compose.yml`, `application.properties` | **HIGH** | Immediate (< 24 hrs) |
| **IoT Global Machine Key** | `application.properties`, test files | **HIGH** | Immediate (< 24 hrs) |
| **MinIO S3 Root Password** | `docker-compose.yml` | **HIGH** | Within 48 hrs |
| **Admin Seed Password** | `seed_factory_master_data.sql` | **CRITICAL** | Immediate (< 24 hrs) |

---

## 3. Step-by-Step Rotation Procedures

### 3.1. JWT Signing Secret Rotation
**Impact:** Invalidates all existing active access and refresh tokens across all sessions, forcing re-authentication.

1. **Generate New Cryptographic Key (256-bit+ HMAC-SHA256):**
   ```bash
   openssl rand -base64 48
   ```
2. **Inject Key into Cloud Secret Store / Kubernetes Secret:**
   ```bash
   kubectl create secret generic stockai-secrets \
     --from-literal=JWT_SECRET="<NEW_GENERATED_KEY>" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
3. **Perform Rolling Deployment of Application Pods:**
   ```bash
   kubectl rollout restart deployment/stockai-backend -n stockai-prod
   ```
4. **Verification:**
   Attempt API call with old token (must receive `401 Unauthorized`). Login with valid credentials to receive newly signed token.

---

### 3.2. Redis Password Rotation
**Impact:** Brief reconnection window for token revocation cache.

1. **Generate New Strong Password:**
   ```bash
   openssl rand -hex 32
   ```
2. **Update Redis Server Configuration (Online):**
   ```bash
   redis-cli -a "<OLD_PASSWORD>" CONFIG SET requirepass "<NEW_PASSWORD>"
   redis-cli -a "<NEW_PASSWORD>" CONFIG REWRITE
   ```
3. **Update Application Secret & Restart:**
   Update `REDIS_PASSWORD` in `stockai-secrets` and trigger rolling restart.

---

### 3.3. PostgreSQL Database Password Rotation
**Impact:** Zero-downtime database credential rotation.

1. **Create Alternate DB User or Update Existing Password:**
   ```sql
   ALTER USER stockai_app WITH PASSWORD '<NEW_STRONG_PASSWORD>';
   ```
2. **Update Kubernetes Secret:**
   Update `DB_PASSWORD` in secret store.
3. **Restart Application Pool:**
   Execute rolling pod restart. Verify HikariCP connection pool reconnects cleanly with no connection pool exhaustion.

---

### 3.4. IoT Machine Credential Rotation
**Impact:** Machines re-authenticate using their per-device cryptographically bound key.

1. **Rotate Specific Device Credential via DeviceRegistryService / Admin API:**
   ```bash
   # Generate new machine key
   openssl rand -hex 24
   ```
2. **Issue to Edge Gateway / PLC via Secure Enclave / Hardware Token.**
3. **Revoke Old Key in Registry.**

---

### 3.5. MinIO / S3 Storage Credential Rotation
1. **Update MinIO Root Credentials via Environment or MinIO Client (`mc`):**
   ```bash
   mc admin user add myminio <NEW_ACCESS_KEY> <NEW_SECRET_KEY>
   ```
2. **Update Application `MINIO_ROOT_PASSWORD` or AWS IAM Role.**
