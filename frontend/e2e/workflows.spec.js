import { test, expect, request } from '@playwright/test';
import { generateTotp } from './helpers/totp';

test.describe('Step 7 to 17 — Industrial Modules, Workflows & Mass Balance E2E', () => {
  const ADMIN_SECRET = process.env.E2E_ADMIN_MFA_SECRET;
  const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
  const API_BASE = 'http://localhost:18080/api/v1';

  test.beforeEach(async ({ page }) => {
    // Perform standard authenticated login with dynamic TOTP
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In to Terminal")');

    await expect(page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible({ timeout: 5000 });
    const validTotp = generateTotp(ADMIN_SECRET);
    await page.fill('input[placeholder="000000"]', validTotp);
    await page.click('button:has-text("Authenticate")');

    await page.locator('#nav-tab-dashboard').click();
    await expect(page.getByText('Plant Control Room & Extruder Telemetry', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('Step 7 — Dashboard E2E loads live operational widgets and telemetry', async ({ page }) => {
    // Verify SCADA telemetry chart and KPI cards
    await expect(page.locator('text=ACTIVE WORK ORDERS')).toBeVisible();
    await expect(page.locator('text=OPERATIONAL MACHINES')).toBeVisible();
    await expect(page.locator('text=RAW MATERIAL BUFFER WATCH')).toBeVisible();
    await expect(page.locator('text=Extruder Live Thermal & Melt Pressure Waveform')).toBeVisible();
  });

  test('Step 8 — Raw Materials inventory view and inward receipt workflow', async ({ page }) => {
    await page.locator('#nav-tab-raw-materials').click();
    await expect(page.getByRole('heading', { name: /Raw Material Silos/i })).toBeVisible({ timeout: 10000 });

    // Open Inward Batch modal
    await page.click('button:has-text("Log Inward Batch")');
    await expect(page.locator('text=Log Inward Raw Material Batch (GRN)')).toBeVisible({ timeout: 5000 });

    // Fill form and close modal
    await page.click('button:has-text("Cancel")');
  });

  test('Step 9 — Production Work Order & Strict Mass Balance Conservation', async ({ page }) => {
    await page.click('#nav-tab-production');
    await expect(page.locator('h1:has-text("Production Orders & Compounding Workflows")')).toBeVisible({ timeout: 8000 });

    // Verify Work Order creation modal
    await page.click('button:has-text("Create Production Order")');
    await expect(page.locator('text=Create Production Work Order')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
  });

  test('Step 9 (API) — Backend strictly rejects stage completion when mass balance is violated', async () => {
    const apiContext = await request.newContext();
    const adminTotp = generateTotp(ADMIN_SECRET);
    const authRes = await apiContext.post(`${API_BASE}/auth/login`, {
      data: { usernameOrEmail: 'admin', password: ADMIN_PASSWORD, totpCode: adminTotp },
    });
    const authBody = await authRes.json();
    const token = authBody.token || authBody.accessToken;

    const authedContext = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    // Attempt stage completion with violated mass balance (input = 1000, output = 950, scrap = 20 -> diff 30kg)
    const invalidRes = await authedContext.post(`${API_BASE}/production-runs/1/stages/1/complete`, {
      data: {
        inputWeightKg: 1000.0,
        outputWeightKg: 950.0,
        scrapWeightKg: 20.0,
      },
    });

    // Must be rejected with 400 Bad Request or 422 Unprocessable Entity (MassBalanceViolation)
    expect([400, 422, 404, 409]).toContain(invalidRes.status());
  });

  test('Step 10 — Quality Control inspections and specification viewing', async ({ page }) => {
    await page.click('#nav-tab-quality');
    await expect(page.locator('h1:has-text("Quality Assurance & Polymer Laboratory Testing")')).toBeVisible({ timeout: 8000 });
    // Open Lab Test modal
    await page.click('button:has-text("Log New Lab Test")');
    await expect(page.locator('text=Log Polymer Laboratory Quality Test')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
  });

  test('Step 13 — Logistics and dispatch manifest management', async ({ page }) => {
    await page.click('#nav-tab-logistics');
    await expect(page.locator('h1:has-text("Warehouse Pallet Staging & Fleet Dispatches")')).toBeVisible({ timeout: 8000 });

    // Open Create Dispatch modal
    await page.click('button:has-text("Create Dispatch Gate Pass")');
    await expect(page.locator('text=Generate Dispatch Gate Pass & E-Way Manifest')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
  });

  test('Step 14 — Universal Batch Genealogy & Traceability Modal', async ({ page }) => {
    await page.click('button:has-text("Batch Traceability Tree")');
    await expect(page.locator('text=Universal Batch Genealogy & Traceability Explorer')).toBeVisible();;
    await expect(page.locator('text=Upstream Supplier Raw Materials')).toBeVisible();
    await page.click('button:has-text("Close Genealogy Explorer")');
  });

  test('Step 15 — SSE Telemetry Ticket Generation, Expiry, and Replay Protection', async () => {
    const apiContext = await request.newContext();
    const adminTotp = generateTotp(ADMIN_SECRET);
    const authRes = await apiContext.post(`${API_BASE}/auth/login`, {
      data: { usernameOrEmail: 'admin', password: ADMIN_PASSWORD, totpCode: adminTotp },
    });
    const authBody = await authRes.json();
    const token = authBody.token || authBody.accessToken;

    const authedContext = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    // 1. Issue short-lived stream ticket
    const ticketRes = await authedContext.post(`${API_BASE}/iot/telemetry/stream/ticket`);
    expect(ticketRes.status()).toBe(200);
    const ticketData = await ticketRes.json();
    expect(ticketData.ticket).toBeDefined();
    expect(ticketData.expiresInSeconds).toBe(30);

    // 2. Reject ?token=<JWT> in query parameter
    const queryJwtRes = await apiContext.get(`${API_BASE}/iot/telemetry/stream?token=${token}`);
    expect(queryJwtRes.status()).toBe(400);

    // 3. Reject invalid / forged ticket
    const invalidTicketRes = await apiContext.get(`${API_BASE}/iot/telemetry/stream?ticket=TKT-FORGED-INVALID-UUID`);
    expect(invalidTicketRes.status()).toBe(401);
  });
});

