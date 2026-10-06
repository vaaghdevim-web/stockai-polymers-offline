import { test, expect } from '@playwright/test';
import { generateTotp } from './helpers/totp';

test.describe('StockAI OS Smoke Suite', () => {
  test('Complete login, navigation, and modal rendering smoke flow', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In to Terminal")');

    await expect(page.locator('text=Two-Factor Authentication')).toBeVisible({ timeout: 5000 });
    const validTotp = generateTotp('SVP_STOCKAI_ADMIN_SECURE_MFA_SECRET_KEY');
    await page.fill('input[placeholder="000000"]', validTotp);
    await page.click('button:has-text("Authenticate")');

    await expect(page.locator('h1')).toContainText('Plant Control Room & Extruder Telemetry', { timeout: 8000 });

    // Navigate to Raw Materials
    await page.locator('#nav-tab-raw-materials').click();
    await expect(page.getByRole('heading', { name: /Raw Material Silos/i })).toBeVisible({ timeout: 10000 });

    // Navigate to Quality Lab
    await page.locator('#nav-tab-quality').click();
    await expect(page.getByRole('heading', { name: /Quality Control/i })).toBeVisible({ timeout: 10000 });
  });
});
