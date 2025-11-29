import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

test.describe('Unauthenticated user', () => {
  test('should allow a new user to register and then log in', async ({ page }) => {
    const dateTicks = Date.now();
    const email = `test-user-${dateTicks}@example.com`;
    const password = `password-123`;
    const authPage = new AuthPage(page);

    // Open the authentication dialog from a public route
    await authPage.gotoPublicEntry();
    await authPage.ensureDialogOpen();

    // Complete registration via the register tab
    await authPage.registerTab.click();
    await authPage.registerEmailInput.fill(email);
    await authPage.registerPasswordInput.fill(password);
    await authPage.registerPasswordConfirmationInput.fill(password);
    await authPage.registerPasswordConfirmationInput.blur();
    await expect(authPage.registerButton).toBeEnabled();
    await authPage.registerButton.click();

    // Expect successful registration and redirection to the range page
    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    // Verify that the user is logged in by checking for the logout action in the user menu
    await authPage.userMenuButton.click();
    await expect(authPage.logoutButton).toBeVisible();
  });

  test('allows unauthenticated users to view public range details', async ({ page }) => {
    await page.goto('/dobczyce');

    await expect(page).toHaveURL('/dobczyce');

    const rangeTitle = page.getByTestId('range-landing-title');
    await expect(rangeTitle).toBeVisible();
    await expect(rangeTitle).toContainText('E2E Test Range');
  });
});
