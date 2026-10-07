# StockAI — DevOps Handoff & Cloud Infrastructure Specification

**Document Version**: 1.0  
**Target Environment**: Staging & Production (VPC, Docker, Kubernetes, CI/CD)  
**System**: SVP StockAI — PP Woven Bag Factory Integrated Management System (IMS)  
**Target Organization**: Sri Vidha Polymers  

---

## 1. Backend Framework & Version
* **Framework**: Spring Boot 4.1.1
* **Components**: Spring Data JPA, Hibernate 7.4.5, Spring Security 6, WebMVC, Actuator, Jakarta Bean Validation
* **Packaging**: Executable JAR (`stockai-0.0.1-SNAPSHOT.jar`)

---

## 2. Runtime & Language Version
* **Language**: Java 21 (Standard release)
* **Runtime Target**: **JDK 21+** (Eclipse Temurin / OpenJDK 21+ Alpine container compatible)

---

## 3. Application Start Commands

### Local / Development Mode
```powershell
# Windows PowerShell
.\mvnw.cmd spring-boot:run "-Dmaven.compiler.release=21"
```
```bash
# Linux / macOS
./mvnw spring-boot:run
```

### Production / Staging Container JAR Execution
```bash
java -jar -Dspring.profiles.active=prod target/stockai-0.0.1-SNAPSHOT.jar
```

---

## 4. Application / Container Network Port
* **Default Port**: `8080` (HTTP)
* Configurable via environment variable: `SERVER_PORT=8080`

---

## 5. Health-Check Endpoint (Liveness & Readiness Probes)
* **Endpoint**: `GET /actuator/health`
* **Access**: Publicly accessible (whitelisted in Spring Security)
* **Response**:
  ```json
  {
    "status": "UP"
  }
  ```
* **Metrics / Prometheus Scraper**: `GET /actuator/prometheus` (optional observability hook)

---

## 6. Database Specifications
* **Engine / Type**: PostgreSQL 16
* **Database Name**: `stockai` (or `Stockai`)
* **Default Port**: `5432`
* **Connection Pool**: HikariCP (`StockAiHikariPool`)
  * Pool Max Size: `10`
  * Pool Min Idle: `5`
  * Connection Timeout: `30000ms` (30s)

---

## 7. Migration Tool & Migration Files
* **Migration Strategy**: Version-controlled SQL scripts enforced with Hibernate strict `spring.jpa.hibernate.ddl-auto=validate`.
* **Execution Sequence (Run against PostgreSQL before app startup)**:
  1. `src/main/resources/db/schema_v2.4.sql` *(Core DDL: 85 tables, non-negative stock triggers, balance invariants, functions)*
  2. `src/main/resources/db/indexes_migration.sql` *(High-priority performance B-Tree indexes)*
  3. `src/main/resources/db/security_user_password_migration.sql` *(RBAC schema)*
  4. `src/main/resources/db/seed_factory_master_data.sql` *(Sri Vidha Polymers catalog & suppliers)*

---

## 8. Required Environment Variables (No Secrets)

| Environment Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DB_HOST` | PostgreSQL Host / RDS endpoint | `localhost` or `postgres.internal.vpc` |
| `DB_PORT` | PostgreSQL Port | `5432` |
| `DB_NAME` | Database Name | `stockai` |
| `DB_USERNAME` | Database Master / App User | `postgres` or `stockai_user` |
| `DB_PASSWORD` | Database Password | *(Injected via Secret Manager / Vault)* |
| `JWT_SECRET` | 256-bit Key for signing JWTs | *(Injected via Secret Manager / Vault)* |
| `JWT_EXPIRATION_MS` | JWT Expiry in milliseconds | `3600000` (1 Hour) |
| `DB_POOL_MAX_SIZE` | HikariCP max pool size | `20` |
| `DB_POOL_MIN_IDLE` | HikariCP min idle size | `10` |
| `JPA_SHOW_SQL` | Toggle JPA SQL logging | `false` |

---

## 9. Recommended Multi-Stage Dockerfile

```dockerfile
# ==============================================================================
# 1. Build Stage
# ==============================================================================
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and POM
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Download dependencies offline (cache layer)
RUN ./mvnw dependency:go-offline -B

# Copy source code and build production jar
COPY src src
RUN ./mvnw clean package -DskipTests "-Dmaven.compiler.release=21"

# ==============================================================================
# 2. Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root system user for security
RUN addgroup -S stockai && adduser -S stockai -G stockai
USER stockai

COPY --from=build --chown=stockai:stockai /app/target/stockai-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 10. AWS Services Accessed by Backend
* **Direct in-code calls**: None currently (stateless REST design).
* **Target Cloud Architecture**:
  * **AWS ALB (Application Load Balancer)**: SSL termination and HTTP traffic routing to container port 8080.
  * **AWS RDS PostgreSQL**: Multi-AZ Managed PostgreSQL 16+.
  * **AWS S3 / MinIO**: Object storage for reports, export files, and document archiving.

---

## 11. Required External APIs & Services
* **PostgreSQL Database Server** (Primary transactional data store).
* *(Target Edge pipeline)*: **Mosquitto MQTT Broker** for sensor telemetry ingestion into TimescaleDB.

---

## 12. Unit Test Command
```bash
# Linux / CI Runner
./mvnw clean test
```
```powershell
# Windows PowerShell
.\mvnw.cmd test "-Dmaven.compiler.release=21"
```

---

## 13. Lint / Format / Security Check Commands
```bash
# Verify compilation & bytecode
./mvnw compile

# Full Build & Verification
./mvnw verify "-Dmaven.compiler.release=21"
```

---

## 14. Git Branch & Deployment Strategy
* **Primary Production Branch**: `main`
* **Feature Branches**: `eng3-rbac-jwt`, `feature/shreeja-engineer2-week1`, `feature/week2-compounding-bom`
* **Deployment Workflow**: Feature branch $\rightarrow$ Pull Request $\rightarrow$ Automated GitHub Actions CI $\rightarrow$ Merge to `main` $\rightarrow$ CD Staging / Production trigger.

---

## 15. Staging & Production Deployment Requirements
1. **Host/Container**: JDK 21+ (or Java 21) Alpine JRE.
2. **Database**: PostgreSQL 16 instance initialized with `schema_v2.4.sql`, `indexes_migration.sql`, and `seed_factory_master_data.sql`.
3. **Configuration**: Environment variables supplied via Docker / Kubernetes Secrets / HashiCorp Vault.
4. **Networking**: Reverse proxy / Ingress terminating TLS (HTTPS on 443) and proxying to container port `8080`.
