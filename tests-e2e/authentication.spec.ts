import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { translate } from './support/i18n';

test.describe('Authentication', () => {
  test('should allow a new user to register and then log in', async ({ page }) => {
    const dateTicks = Date.now();
    const email = `test-user-${dateTicks}@example.com`;
    const password = `password-123`;

    // Navigate to the authentication page
    await page.goto('/auth');

    // Click the "register" tab
    await page.getByRole('tab', { name: translate('auth.registerTab') }).click();

    // Fill out the registration form
    const registerForm = page.locator(`form:has-text("${translate('auth.register')}")`);
    await registerForm.getByLabel(translate('auth.email'), { exact: true }).fill(email);
    await registerForm.getByLabel(translate('auth.password'), { exact: true }).fill(password);
    await page.fill('input[name="passwordConfirmation"]', password);
    await page.locator('input[name="passwordConfirmation"]').blur();
    await expect(page.getByRole('button', { name: translate('auth.register') })).toBeEnabled();
    await page.getByRole('button', { name: translate('auth.register') }).click();

    // Expect successful registration and redirection to the range page
    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    // Verify that the user is logged in by checking for the logout action in the user menu
    const authPage = new AuthPage(page);
    await authPage.userMenuButton.click();
    await expect(authPage.logoutButton).toBeVisible();
  });

  test('should allow an existing user to log in and then log out', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();

    // Fill out the login form with an existing seeded user
    await authPage.login('standard-user@e2e.com', 'standardpassword');

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

  test('should redirect unauthenticated users to the login page when accessing protected routes', async ({ page }) => {
    const authPage = new AuthPage(page);
    await page.goto('/dobczyce');

    // Router guard should redirect unauthenticated users to the auth view with redirect query
    await page.waitForURL((url) => url.pathname === '/auth' && url.searchParams.get('redirect') === '/dobczyce');
    await expect(page.getByRole('tab', { name: translate('auth.loginTab') })).toBeVisible();
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.loginButton).toBeDisabled();
  });
});
