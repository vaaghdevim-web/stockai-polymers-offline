# StockAI Enterprise Security Best Practices & Defense-in-Depth Guide

## 1. Secrets Management & Key Rotation
* **Production Secret Vault**: Never commit production secrets into version control. Use **AWS Secrets Manager**, **Azure Key Vault**, or **HashiCorp Vault** to inject `${JWT_SECRET}`, `${DB_PASSWORD}`, and `${REDIS_PASSWORD}` as environment variables at container startup.
* **Minimum Entropy**: JWT signing keys must be at least 256 bits (32 bytes). In `JwtService`, keys with length $< 32$ characters are blocked on startup.
* **Key Rotation**: Implement dual-key verification during rotation periods (verify with Old Key or New Key, sign with New Key).

---

## 2. Network Topology & Ingress Hardening
* **VPC Subnet Isolation**:
  * Public Subnets: ALB / WAF only.
  * Private Subnets: Application containers (`stockai` JVM). Security group allows inbound port 8080 **only** from the ALB security group.
  * Isolated Data Subnets: PostgreSQL 16 and Redis 7.2 instances. Inbound connections allowed **only** from application security groups.
* **TLS 1.3 Strict Termination**:
  * Edge: Enforce HTTPS redirection (`HTTP 301 -> HTTPS`).
  * Database: Enforce SSL in PostgreSQL `pg_hba.conf` (`hostssl all all 0.0.0.0/0 scram-sha-256`).

---

## 3. Web Application Firewall (WAF) & Rate Limiting
* **L7 Rate Limiting**:
  * `/api/v1/auth/login`: Maximum 10 attempts per minute per IP to mitigate credential stuffing and brute-force attacks.
  * `/api/v1/iot/telemetry/packet`: Rate-limited by edge gateway client certificate or API key.
* **SQL Injection & XSS Rules**: Enabled on WAF with managed AWS/Cloudflare rule groups.

---

## 4. Multi-Factor Authentication (MFA / TOTP)
* **RFC 6238 TOTP Integration**:
  * Administrative accounts (`ROLE_ADMIN`) should require standard 6-digit TOTP validation (`MfaService`) for high-privilege operations such as user privilege elevation or database maintenance tasks.

---

## 5. Actuator & Monitoring Lockdown
* **Limited Surface Area**: Exposed actuator endpoints restricted to `health` and `info` in `application.properties`.
* **Health Detail Obfuscation**: `management.endpoint.health.show-details=never` to prevent leaking database hostnames or internal network topology to unauthorized callers.
