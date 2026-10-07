# SVP StockAI — Developer Knowledge Transfer (KT) Document
**System**: PP Woven Bag Factory Integrated Management System (StockAI X IMS)  
**Company**: Sri Vidha Polymers (SVP)  
**Version**: 2.5 (StockAI X — Enterprise Production Parity)  
**Date**: September 2026  

---

## 1. Executive Summary & System Overview

**StockAI** is an enterprise smart manufacturing, real-time IoT inventory management, and ERP platform purpose-built for polypropylene (PP) woven bag and polymer product manufacturing. It unifies factory-floor telemetry, supply-chain logistics, double-entry inventory accounting, quality management, inter-unit digital transfers, and automated procurement alerts into a reactive Spring Boot 4.x, PostgreSQL 16, Redis, and Apache Kafka architecture.

### Three-Unit Factory Manufacturing Lifecycle:
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. Raw Material â”‚       â”‚ 2. Compounding  â”‚       â”‚ 3. 3-Stage Plant â”‚       â”‚ 4. Double-Entry â”‚
â”‚    Intake & GRN â”‚ â”€â”€â”€â–º  â”‚    & Batching   â”‚ â”€â”€â”€â–º  â”‚    Manufacturing â”‚ â”€â”€â”€â–º  â”‚    Ledger &     â”‚
â”‚   (Strict FIFO) â”‚       â”‚ (PP+CaCO3+TiO2) â”‚       â”‚ (Extr/Weav/Conv) â”‚       â”‚   FG Inventory  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚                                                                              â”‚
         â–¼                                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                 â”‚ 6. Dispatch &    â”‚       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Reorder Alert & â”‚                                 â”‚    Invoicing     â”‚ â—„â”€â”€â”€  â”‚ 5. QC Pass &    â”‚
â”‚ Procurement Rec â”‚                                 â”‚  (Gate & Vehicle)â”‚       â”‚    Inspection   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚                                                    â–²
         â–¼                                                    â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Inter-Unit Digital Transfer Management (Unit 1 Compounding â”€â”€â–º Unit 2 Weaving â”€â”€â–º Unit 3 FG)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 2. Technology Stack & Key Frameworks

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Language** | Java 21 (JDK 21+ compatible) | Standard Java Records, Pattern Matching, Sealed Classes |
| **Framework** | Spring Boot 4.1.1 | Spring Data JPA, WebMVC, Actuator, Security, Validation |
| **Messaging & Streaming**| Apache Kafka (Confluent 7.5.0) | High-throughput telemetry, anomaly alerts, idempotency (`acks=all`) |
| **Object Storage** | MinIO / AWS S3 SDK | Pallet labels (GS1), inspection reports, compliance exports |
| **In-Memory Cache** | Redis 7.2 Alpine | Telemetry caching, machine status, token revocation blacklist |
| **ORM / Persistence** | Hibernate 7.4.x / JPA 3.2 | Strict `ddl-auto=validate` schema validation |
| **Connection Pool** | HikariCP (`StockAiHikariPool`) | Max Pool: 20, Min Idle: 10, Leak Detection: 15s |
| **Database** | PostgreSQL 16 | Schema V2.4 (85 Tables, Invariant Triggers, Constraints) |
| **Security & IAM** | Spring Security 6 / Stateless JWT | BCrypt 12, HMAC-SHA256, Refresh Token rotation, Redis blacklist |
| **Edge & Ingress** | NGINX Gateway Load Balancer | Reverse proxy, rate limiting, SSL/TLS termination |

---

## 3. Database Architecture & Immutable Invariants

The PostgreSQL database is the **single source of truth**. Hibernate enforces:
```properties
spring.jpa.hibernate.ddl-auto=validate
```
> [!IMPORTANT]
> **Never use `ddl-auto=update` or `create`**. The database schema is strictly managed via versioned SQL scripts in `src/main/resources/db/`.

### Critical Database Triggers & Business Constraints:
1. **Non-Negative Stock Guard (`trg_inventory_validate`)**:
   * Prevents `quantity_on_hand < 0` and asserts `reserved_qty <= quantity_on_hand` at the row level.
2. **Immutable Inventory Log (`trg_inventory_transaction_immutable`)**:
   * Direct `UPDATE` or `DELETE` on `inventory_transaction` is forbidden by trigger. It is an append-only audit trail.
3. **Double-Entry Ledger Balancing (`trg_validate_double_entry_ledger`)**:
   * Constraint trigger is `DEFERRABLE INITIALLY DEFERRED`. At transaction commit time, it asserts:
     $$\text{Entry Count} \ge 2 \quad \text{and} \quad \sum \text{DEBIT} = \sum \text{CREDIT}$$
4. **Unit Operation Mass Balance (`chk_unit_operation_balance`)**:
   * Enforces conservation of mass across plant stages:
     $$|\text{input\_weight} - (\text{output\_weight} + \text{scrap\_weight})| \le 0.0001\text{ kg}$$

---

## 4. Domain Model Overview (`com.svp.stockai.entity`)

### 4.1. Organization & Multi-Unit Warehouse Hierarchy
* `Plant` $\rightarrow$ `Warehouse` (Unit 1 Compounding, Unit 2 Extrusion/Weaving, Unit 3 Finishing/FG) $\rightarrow$ `LocationRack` $\rightarrow$ `LocationShelf` $\rightarrow$ `LocationBin`
* Physical tracking down to the exact `bin_id`.

### 4.2. Master Data & Specifications
* `MaterialCategory`, `UnitOfMeasure`, `RawMaterial` (with `standard_cost`, `reorder_level`, `safety_stock`, `lead_time_days`).
* `ProductCategory`, `FinishedProduct`, `ProductSpecification` (bag length, width, capacity, GSM, scrap targets).

### 4.3. Procurement & Raw Materials
* `Supplier`, `SupplierAddress`, `SupplierContact`, `SupplierMaterial`.
* `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptItem`.
* `MaterialBatch`: Tracks `batch_no`, `lot_number`, `initial_weight_kg`, `current_weight_kg`, and `quality_status`.

### 4.4. Compounding & Production Flow
* **Compounding**: `CompoundingBom`, `CompoundingBomItem`, `CompoundingBatch`, `CompoundingBatchMaterial`.
  * Standard formula: 85% PP Homopolymer, 11% $\text{CaCO}_3$ Filler, 3% $\text{TiO}_2$ White Masterbatch, 1% UV Stabilizer.
* **Manufacturing Stages**:
  * `ProductionUnit`: Extrusion (Tapes), Weaving (Circular Looms), Conversion (Cutting/Stitching/Printing).
  * `Machine`, `ProductionRun`, `ProductionStage`, `UnitOperation`, `ProductionMaterial`, `FinishedBatch`, `ProductionOutput`.
  * `BatchGenealogy`: Full bidirectional genealogy from raw material lot $\rightarrow$ compounding batch $\rightarrow$ finished bag roll/pallet.

### 4.5. Inventory, Ledger & Inter-Unit Stock Transfers
* `Inventory`: Live balances on `(material_batch_id, bin_id)` or `(finished_batch_id, bin_id)`.
* `StockTransfer`, `StockTransferItem`: Multi-unit transfer notes (`TRF-YYYYMMDD-XXXX`) moving materials and WIP between Unit 1, Unit 2, and Unit 3 warehouses with atomic bin updates and dual transactions (`TransferOut` and `TransferIn`).
* `InventoryLedgerTransaction` (with UUID `transaction_group_id`) $\rightarrow$ `InventoryLedgerEntry` (`DEBIT` / `CREDIT`).
* `Pallet`, `PalletItem`: Barcode tracking for warehouse storage and dispatch.

### 4.6. Quality Control (QC) Integration
* `QcSpecification`: Parameter tolerances (Melt Flow Index, Tensile Strength, Elongation at Break, Color Delta E, Moisture).
* `QualityInspection`, `QualityInspectionItem`: Links QC test results to batches before release. On `Pass`, releases batch to `Available` or `Released`; on `Fail`, quarantines batch to `Quarantine` and triggers alerts.
* `RejectionRecord`: Logs scrapped or returned defect batches.

### 4.7. Reorder & Procurement Alerts Engine
* `PurchaseRecommendation`: Automatically generated when raw material available stock falls $\le$ `reorder_level`.
* Prioritization: `Critical` (stock $\le$ safety stock), `High` (stock $\le 50\%$ reorder point), `Medium`.
* Calculates economic replenishment quantities and estimated procurement costs.

---

## 5. Enterprise Microservice Architecture (StockAI X)

### 5.1. Apache Kafka Messaging Layer
* Configured in [`KafkaConfig.java`](file:///c:/D-drive/Office%20Work/current/Polymer%20Final/stockai/src/main/java/com/svp/stockai/config/KafkaConfig.java).
* **Topics**:
  * `stockai.telemetry.events` (12 partitions, keyed by `machineCode` for strictly ordered per-machine sensor events).
  * `stockai.telemetry.anomalies` (6 partitions).
  * `stockai.inventory.movements` (6 partitions).
  * `stockai.production.stages` (6 partitions).
  * `stockai.alerts.critical` (6 partitions).
  * `stockai.dead-letter.events` (3 partitions).
* **Reliability**: `enable.idempotence=true`, `acks=all`, consumer exponential backoff retry.
* **Graceful Fallback**: Automatically disabled in test profiles via `@ConditionalOnProperty(name = "stockai.kafka.enabled", havingValue = "true")`.

### 5.2. MinIO / S3 Document & Storage Service
* Implemented in [`DocumentStorageService.java`](file:///c:/D-drive/Office%20Work/current/Polymer%20Final/stockai/src/main/java/com/svp/stockai/service/DocumentStorageService.java).
* Stores GS1 pallet barcode PDFs, QC certificates of analysis (CoA), and monthly production ledger exports.
* Falls back gracefully to local filesystem storage if external S3 endpoint is unconfigured.

### 5.3. Multi-Channel Notification Service
* Implemented in [`MultiChannelNotificationService.java`](file:///c:/D-drive/Office%20Work/current/Polymer%20Final/stockai/src/main/java/com/svp/stockai/service/MultiChannelNotificationService.java).
* Asynchronous dispatch via [`AsyncAlertWorker.java`](file:///c:/D-drive/Office%20Work/current/Polymer%20Final/stockai/src/main/java/com/svp/stockai/service/AsyncAlertWorker.java).
* Dispatches prioritized notifications across:
  1. **In-App Notifications** (Web/Mobile live updates)
  2. **Email Alerts** (SMTP / SendGrid)
  3. **SMS Alerts** (Twilio SMS Gateway)
  4. **WhatsApp Emergency Alerts** (WhatsApp Business API)

---

## 6. Key REST API Endpoints & RBAC Security

All endpoints enforce method-level role-based authorization via Spring Security `@PreAuthorize`:

### 6.1. Quality Control (`/api/v1/qc`)
* `POST /api/v1/qc/inspections`: Record inspection with test items, evaluate tolerances, update batch status (`OPERATOR`, `SUPERVISOR`, `ADMIN`, `MANAGER`).
* `GET /api/v1/qc/inspections/{id}`: Fetch QC inspection and observed parameters.
* `GET /api/v1/qc/inspections`: Filter inspections by status (`Pass`/`Fail`) or type (`Incoming`/`InProcess`/`Final`).
* `GET /api/v1/qc/inspections/batch/{type}/{id}`: Retrieve inspection history for a specific material or finished batch.
* `GET /api/v1/qc/specifications`: List active product QC specifications.

### 6.2. Inter-Unit Stock Transfers (`/api/v1/transfers`)
* `POST /api/v1/transfers`: Create digital transfer note in `Draft` state (`OPERATOR`, `SUPERVISOR`, `ADMIN`, `MANAGER`).
* `PATCH /api/v1/transfers/{id}/complete`: Approve and atomically execute inventory movement across warehouse bins (`SUPERVISOR`, `ADMIN`, `MANAGER`).
* `GET /api/v1/transfers/{id}`: Fetch transfer note details and item line items.
* `GET /api/v1/transfers`: List transfers with optional status filtering.

### 6.3. Procurement & Reorder Alerts (`/api/v1/procurement`)
* `POST /api/v1/procurement/reorder-check`: Trigger automated scanner across raw materials, creating recommendations and dispatching low-stock alerts.
* `GET /api/v1/procurement/recommendations`: List purchase recommendations filtered by `status` or `priority`.
* `PATCH /api/v1/procurement/recommendations/{id}/approve`: Approve recommendation for PO conversion (`SUPERVISOR`, `ADMIN`, `MANAGER`).

### 6.4. Authentication & Token Management (`/api/v1/auth`)
* `POST /api/v1/auth/login`: Authenticate and issue HMAC-SHA256 JWT access and refresh tokens.
* `POST /api/v1/auth/refresh`: Stateless token renewal with refresh token verification.
* `POST /api/v1/auth/logout`: Revoke active JWT by registering in Redis token blacklist.

---

## 7. Developer Onboarding & Quickstart

### Step 1: Docker Local Stack (Recommended)
Launch the complete StockAI X containerized stack:
```powershell
docker compose up -d
```
Services spun up:
* `stockai-app`: http://localhost:8080
* `postgres`: localhost:5432 (Database: `Stockai`)
* `redis`: localhost:6379
* `kafka` + `zookeeper`: localhost:9092
* `minio`: http://localhost:9001 (Console) / 9000 (S3 API)
* `nginx-gateway`: http://localhost:80

### Step 2: Manual Local Development (Without Docker)
1. **PostgreSQL Setup**:
   ```bash
   psql -U postgres -c "CREATE DATABASE Stockai;"
   psql -U postgres -d Stockai -f src/main/resources/db/schema_v2.4.sql
   psql -U postgres -d Stockai -f src/main/resources/db/indexes_migration.sql
   ```
2. **Environment Variables** (create `.env` from `.env.example`):
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Stockai
   DB_USERNAME=postgres
   DB_PASSWORD=your_password_here
   REDIS_HOST=localhost
   REDIS_PORT=6379
   KAFKA_ENABLED=false
   ```

### Step 3: Build & Test Execution
* **Execute Full Automated Test Suite (183 Tests)**:
  ```powershell
  .\mvnw.cmd test "-Dmaven.compiler.release=21"
  ```
* **Run Local Application**:
  ```powershell
  .\mvnw.cmd spring-boot:run "-Dmaven.compiler.release=21"
  ```

---

## 8. Coding Standards & Invariants for All Developers

1. **Always Use `@Transactional` for Multi-Step State Changes**:
   * Any logic touching `Inventory`, `StockTransfer`, `CompoundingBatch`, or ledger entries must be annotated with `@Transactional`.
2. **Use `java.math.BigDecimal` Exclusively for Quantities and Costs**:
   * Never use `double` or `float` for weights, quantities, or financial calculations. Use 4 decimals for weights/quantities and 2 decimals for currency.
3. **Pessimistic Locking on Shared Batch Allocations**:
   * Always acquire `PESSIMISTIC_WRITE` locks via `findByIdWithLock` when allocating or consuming inventory batches to prevent concurrent overdrafts.
4. **Soft Deletions**:
   * Do not issue SQL `DELETE` commands. Set `isActive = false` or update status (`Retired`, `Cancelled`, `Closed`, `Quarantine`).
5. **Zero-Regression Verification**:
   * Before pushing any commit to `origin/main`, execute `.\mvnw.cmd test "-Dmaven.compiler.release=21"` and ensure all 183 tests pass with 0 failures and 0 errors.

---

## 9. Key Contacts & Links
* **Repository**: [https://github.com/saicharan5789/Stockai-31-08.git](https://github.com/saicharan5789/Stockai-31-08.git)
* **Lead Architect**: Sai Charan
