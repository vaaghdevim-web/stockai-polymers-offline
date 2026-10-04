# StockAI X — Postman API Testing & Quickstart Guide

This directory contains the official Postman Collection and Environment for testing the **SVP StockAI X Integrated Management System (IMS)**.

---

## 1. Files Included

| File | Description |
| :--- | :--- |
| [`StockAI_X.postman_collection.json`](./StockAI_X.postman_collection.json) | Complete Postman Collection v2.1 covering Authentication, FIFO Inventory, Compounding BOM, Quality Control, Inter-Unit Transfers, Procurement Reorder Alerts, IoT Telemetry, Pallets, MinIO Storage, and Multi-Channel Alerts. |
| [`StockAI_Local_Environment.postman_environment.json`](./StockAI_Local_Environment.postman_environment.json) | Environment variables configured for local testing (`http://localhost:8080`), pre-configured credentials, and dynamic token placeholders. |

---

## 2. Quickstart Guide (Import & Test in 3 Steps)

### Step 1: Import into Postman
1. Open **Postman Desktop** or **Postman Web**.
2. Click **Import** (top left).
3. Drag and drop both files:
   - `StockAI_X.postman_collection.json`
   - `StockAI_Local_Environment.postman_environment.json`
4. Select the **StockAI X - Local Environment** in the environment dropdown (top right).

### Step 2: Authenticate (Automated Token Capture)
1. Navigate to: **`1. Authentication & IAM`** $\rightarrow$ **`1.1 Login`**.
2. Click **Send**.
3. **Automatic Token Setup**:
   * The test script automatically captures `token` and `refreshToken` from the response.
   * It stores them into the environment variables `{{jwt_token}}` and `{{refresh_token}}`.
   * All subsequent requests across all 10 modules automatically inherit this `Bearer {{jwt_token}}`.

### Step 3: Run Requests Across the 3-Unit Lifecycle
* **Raw Material Intake & FIFO**: Test material shipments and FIFO batch queues (`2. Raw Material Inventory & FIFO`).
* **Compounding BOM Recipe**: Create and calculate batch requirements for the 85:11:3:1 formula (`3. Compounding & BOM Management`).
* **Quality Control Laboratory**: Submit MFI and tensile strength inspections, verify pass/quarantine logic (`4. Quality Control Laboratory`).
* **Inter-Unit Transfers**: Move material between Unit 1, Unit 2, and Unit 3 warehouses with double-entry ledger transactions (`5. Inter-Unit Stock Transfers`).
* **Procurement Reorder Alerts**: Trigger automated low-stock evaluations and approve recommendations (`6. Reorder & Procurement Alerts`).
* **Live IoT Telemetry**: Stream machine sensor readings and test Server-Sent Events (SSE) (`7. IoT Machine Telemetry & Streaming`).

---

## 3. Automated CLI Testing with Newman

You can run the entire collection headlessly in your terminal or CI/CD pipeline using **Newman**:

```bash
# Install Newman globally (if not installed)
npm install -g newman

# Run the collection against the local environment
newman run postman/StockAI_X.postman_collection.json \
  -e postman/StockAI_Local_Environment.postman_environment.json \
  --reporters cli,json
```

---

## 4. Key Collection Features

* **Bearer Token Inheritance**: Set at collection root; individual requests automatically pass the `Authorization: Bearer {{jwt_token}}` header.
* **Dynamic Environment Variables**: Pre-configured with realistic polymer factory values (e.g. `material_id = 1`, `machine_code = EXT-01`, `admin_username = admin`).
* **Automatic Token Rotation**: Use `1.2 Refresh JWT Token` to test seamless token rotation without re-authenticating.
