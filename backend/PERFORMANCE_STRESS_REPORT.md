# Database Query Index Validation & Isolation Stress Report

## 1. Executive Summary
This report documents the findings and validation benchmarks for **Engineer 1 (Lead) Week 4**: Database Query Index Validation and Isolation Stress Modeling for the SVP StockAI PP Woven Bag Factory IMS.

---

## 2. Concurrency & Isolation Stress Benchmarking

### 2.1 Multi-Threaded FIFO Lot Contention Test
* **Objective**: Evaluate pessimistic write locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) under extreme simultaneous raw material lot deduction.
* **Test Setup**:
  * Initial Inventory Lot Balance: **500.0000 kg**
  * Concurrent Worker Threads: **20 threads**
  * Deduction per Worker: **50.0000 kg**
  * Concurrency Mechanism: `java.util.concurrent.CountDownLatch` with synchronized trigger.
* **Results**:
  * **Successful Allocations**: Exactly **10 threads** ($10 \times 50.0000\text{ kg} = 500.0000\text{ kg}$).
  * **Rejected Requests (Insufficient Stock)**: Exactly **10 threads**.
  * **Final Lot Balance**: **0.0000 kg** (Zero over-allocation, zero negative drift).
  * **Race Condition Anomalies**: **0**.

### 2.2 Transaction Rollback Resilience
* **Objective**: Confirm atomic rollback across multi-table writes when unexpected downstream exceptions occur.
* **Test Setup**: Mid-transaction runtime failure injected after inventory deduction but prior to ledger commitment.
* **Results**:
  * **Rollback Success**: 100%. Stock balance remained strictly unmodified at original value.
  * **Orphaned Ledger Entries**: **0**.

---

## 3. Database Query Index Topology Validation

All mission-critical high-throughput operational queries were verified against their composite index paths:

| Query Pattern | Index Backing | Scan Type | Performance Target |
| :--- | :--- | :--- | :--- |
| **FIFO Lot Selection** (`findAvailableBatchesFIFO`) | `idx_material_batch_fifo` on `(material_id, status, quality_status, received_at)` | B-Tree Index Seek | $< 2\text{ ms}$ on 1M rows |
| **BOM Lookup** (`findByBomCodeAndVersion`) | `idx_compounding_bom_code_ver` on `(bom_code, version)` | Unique B-Tree Seek | $< 1\text{ ms}$ |
| **Pallet Barcode Scan** (`findByBarcode`) | `idx_pallet_barcode` on `(barcode)` | Unique Hash/B-Tree Seek | $< 1\text{ ms}$ |
| **Ledger Audit Range** (`findByWarehouseAndDate`) | `idx_inv_ledger_wh_date` on `(warehouse_id, created_at)` | Index Range Scan | $< 5\text{ ms}$ |
| **Real-time Machine State** (`latestMachineReadings`) | Concurrent In-Memory Ring Buffer + Ingestion Cache | O(1) Memory Hash Seek | $< 0.05\text{ ms}$ |

---

## 4. Recommendations for Engineer 2's 1,000 Req/Sec Load Test

To support Engineer 2's Week 4 telemetry burst script (1,000 req/sec):
1. **HikariCP Connection Pool**: Maintain `maximum-pool-size: 20` and `minimum-idle: 10` with `connection-timeout: 30000ms`.
2. **Batch Ingestion Endpoint**: Direct high-frequency edge gateways to `POST /api/v1/iot/telemetry/burst` (batches of 20–50 packets) to achieve $> 5,000\text{ packets/sec}$ effective ingestion throughput.
3. **Pessimistic Locks on Write Paths Only**: Keep all read queries marked `@Transactional(readOnly = true)` to avoid acquiring unnecessary row locks.
