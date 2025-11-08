import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

test.describe('Authenticated user', () => {
  test('should be able to log out @standard-user', async ({ page }) => {

    const authPage = new AuthPage(page);
    await page.goto('/dobczyce');

    // Expect to land on the default range page with range details visible
    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');
    await expect(page.locator('text=E2E Test Range')).toBeVisible();

    // Open the user menu and log out
    await authPage.logout();

    // Verify the user is taken back to the login view
    await page.waitForURL('/auth');
    await expect(authPage.loginButton).toBeVisible();
  });
});
