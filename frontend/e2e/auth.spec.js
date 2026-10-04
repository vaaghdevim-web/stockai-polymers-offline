import { test, expect } from '@playwright/test';
import { generateTotp } from './helpers/totp';

test.describe('Step 3 & 4 — Authentication & Session Lifecycle E2E', () => {
  const ADMIN_SECRET = process.env.E2E_ADMIN_MFA_SECRET;
  const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

  test.beforeEach(async ({ page }) => {
    // Ensure clean storage state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Test A — Invalid Password should be rejected with backend 401 error', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button:has-text("Sign In to Terminal")');

    // Verify error banner is visible and no session token is saved
    const errorBanner = page.locator('text=Invalid username or password');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });

    const token = await page.evaluate(() => localStorage.getItem('stockai_token'));
    expect(token).toBeNull();
  });

  test('Test B — Admin login without TOTP triggers MFA challenge modal', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In to Terminal")');

    // Should display Two-Factor Authentication modal
    await expect(page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="000000"]')).toBeVisible();

    // Still no session token
    const token = await page.evaluate(() => localStorage.getItem('stockai_token'));
    expect(token).toBeNull();
  });

  test('Test C — Invalid 6-digit TOTP code should be rejected', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In to Terminal")');

    await expect(page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible({ timeout: 5000 });
    await page.fill('input[placeholder="000000"]', '000000');
    await page.click('button:has-text("Authenticate")');

    // Backend BadCredentialsException should display error
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('Test D — Valid RFC 6238 TOTP authenticates and accesses Dashboard', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In to Terminal")');

    await expect(page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible({ timeout: 5000 });

    // Compute dynamic TOTP code
    const validTotp = generateTotp(ADMIN_SECRET);
    await page.fill('input[placeholder="000000"]', validTotp);
    await page.click('button:has-text("Authenticate")');

    // Verify Control Room dashboard is visible
    await expect(page.locator('button[title="Account Profile & Settings"]')).toBeVisible({ timeout: 8000 });

    // Verify real tokens are stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('stockai_token'));
    expect(token).not.toBeNull();
    expect(token.length).toBeGreaterThan(20);
  });

  test('Session Lifecycle — Protected route without auth redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify Terminal login is presented
    await expect(page.locator('h1')).toContainText('StockAI OS');
    await expect(page.locator('button:has-text("Sign In to Terminal")')).toBeVisible();
  });

  test('Session Lifecycle — Logout revokes session, clears state, and returns to login', async ({ page }) => {
    // 1. Log in with admin credentials
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

    const profileButton = page.locator('button[title="Account Profile & Settings"]');
    await expect(profileButton).toBeVisible({ timeout: 8000 });

    // 2. Open profile menu
    await profileButton.click();

    // 3. Click Logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // 3. Verify redirected to Login
    await expect(page.locator('h1')).toContainText('StockAI OS', { timeout: 5000 });
    const token = await page.evaluate(() => localStorage.getItem('stockai_token'));
    expect(token).toBeNull();
  });
});
