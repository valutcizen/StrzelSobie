import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

test.describe('Unauthenticated user', () => {
  test('should allow a new user to register and then log in', async ({ page }) => {
    const dateTicks = Date.now();
    const email = `test-user-${dateTicks}@example.com`;
    const password = `password-123`;
    const authPage = new AuthPage(page);

    // Navigate to the authentication page
    await authPage.goto();

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

  test('should redirect unauthenticated users to the login page when accessing protected routes', async ({ page }) => {
    const authPage = new AuthPage(page);
    await page.goto('/dobczyce');

    // Router guard should redirect unauthenticated users to the auth view with redirect query
    await page.waitForURL((url) => url.pathname === '/auth' && url.searchParams.get('redirect') === '/dobczyce');
    await expect(authPage.loginTab).toBeVisible();
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.loginButton).toBeDisabled();
  });
});
