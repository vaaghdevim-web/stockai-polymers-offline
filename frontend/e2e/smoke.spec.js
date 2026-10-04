import { test, expect } from '@playwright/test';
import { generateTotp } from './helpers/totp';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const ADMIN_MFA_SECRET = process.env.E2E_ADMIN_MFA_SECRET;

test.describe('StockAI OS Smoke Suite', () => {
  test('Complete login, navigation, and modal rendering smoke flow', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In to Terminal")');

    await expect(page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible({ timeout: 5000 });
    const validTotp = generateTotp(ADMIN_MFA_SECRET);
    await page.fill('input[placeholder="000000"]', validTotp);
    await page.click('button:has-text("Authenticate")');

    await page.locator('#nav-tab-dashboard').click();
    await expect(page.getByText('Plant Control Room & Extruder Telemetry', { exact: true })).toBeVisible({ timeout: 8000 });

    // Navigate to Raw Materials
    await page.locator('#nav-tab-raw-materials').click();
    await expect(page.getByRole('heading', { name: /Raw Material Silos/i })).toBeVisible({ timeout: 10000 });

    // Navigate to Quality Lab
    await page.locator('#nav-tab-quality').click();
    await expect(page.getByRole('heading', { name: /Quality Assurance & Polymer Laboratory Testing/i })).toBeVisible({ timeout: 10000 });
  });
});

