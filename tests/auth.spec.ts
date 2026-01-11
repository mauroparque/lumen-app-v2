import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Lumen/);
});

test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Lumen Acceso' })).toBeVisible();
});

test('login flow success', async ({ page }) => {
    // NOTE: This test requires the application to be running with VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
    // If running against a production build or local dev with real keys, this test will timeout at the submit button.

    await page.goto('/');

    // 1. Fill credentials
    await page.fill('input[type="email"]', 'tester@lumen.app');
    await page.fill('input[type="password"]', 'testing3610');

    // 2. Wait for Turnstile to be solved
    // We wait for the "Ingresar" button to become enabled.
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // 3. Login
    await submitButton.click();

    // 4. Verify Dashboard
    // "Turnos Hoy" is a static card label that should always be present in DashboardView
    await expect(page.getByText('Turnos Hoy')).toBeVisible({ timeout: 20000 });
});
