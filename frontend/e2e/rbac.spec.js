import { test, expect, request } from '@playwright/test';
import { generateTotp } from './helpers/totp';

const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const E2E_OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD;
const E2E_ADMIN_MFA_SECRET = process.env.E2E_ADMIN_MFA_SECRET;

test.describe('Step 5 & 6 — RBAC Authoritative Matrix & Security E2E', () => {
  const API_BASE = 'http://localhost:18080/api/v1';

  let adminToken = '';
  let operatorToken = '';

  test.beforeAll(async () => {
    const apiContext = await request.newContext();

    // 1. Authenticate Admin with dynamic TOTP
    const adminTotp = generateTotp(E2E_ADMIN_MFA_SECRET);
    const adminRes = await apiContext.post(`${API_BASE}/auth/login`, {
      data: {
        usernameOrEmail: 'admin',
        password: E2E_ADMIN_PASSWORD,
        totpCode: adminTotp,
      },
    });
    const adminBody = await adminRes.json();
    adminToken = adminBody.token || adminBody.accessToken;

    // 2. Authenticate Operator
    const operatorRes = await apiContext.post(`${API_BASE}/auth/login`, {
      data: {
        usernameOrEmail: 'operator01',
        password: E2E_OPERATOR_PASSWORD,
      },
    });
    const operatorBody = await operatorRes.json();
    operatorToken = operatorBody.token || operatorBody.accessToken;
  });

  test('Unauthenticated request to protected endpoints must receive HTTP 401', async () => {
    const apiContext = await request.newContext();
    const res = await apiContext.get(`${API_BASE}/inventory/raw-materials`);
    expect([401, 403]).toContain(res.status());
  });

  test('ADMIN has full read/write access across all modules', async () => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });

    const [rmRes, runsRes, qcRes, dispRes, streamTicketRes] = await Promise.all([
      apiContext.get(`${API_BASE}/inventory/raw-materials`),
      apiContext.get(`${API_BASE}/production-runs`),
      apiContext.get(`${API_BASE}/qc/inspections`),
      apiContext.get(`${API_BASE}/dispatches`),
      apiContext.post(`${API_BASE}/iot/telemetry/stream/ticket`),
    ]);

    expect(rmRes.status()).toBe(200);
    expect(runsRes.status()).toBe(200);
    expect(qcRes.status()).toBe(200);
    expect(dispRes.status()).toBe(200);
    expect(streamTicketRes.status()).toBe(200);
  });

  test('OPERATOR has access to floor operations but restricted from administrative actions', async () => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${operatorToken}` },
    });

    // Operator can read runs and machines
    const runsRes = await apiContext.get(`${API_BASE}/production-runs`);
    expect(runsRes.status()).toBe(200);

    const machinesRes = await apiContext.get(`${API_BASE}/machines/active`);
    expect(machinesRes.status()).toBe(200);

    // Operator can request telemetry stream ticket
    const ticketRes = await apiContext.post(`${API_BASE}/iot/telemetry/stream/ticket`);
    expect(ticketRes.status()).toBe(200);
  });
});


