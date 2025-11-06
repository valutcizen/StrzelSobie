import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a new user to register and then log in', async ({ page }) => {
    const dateTicks = Date.now();
    const email = `test-user-${ dateTicks }@example.com`;
    const password = `password-123`;

    // Navigate to the authentication page
    await page.goto('/auth');

    // Click the "register" tab
    await page.getByRole('tab', { name: 'Rejestracja' }).click();

    // Fill out the registration form
    await page.locator('form:has-text("Zarejestruj")').getByLabel('Adres e-mail', { exact: true }).fill(email);
    await page.locator('form:has-text("Zarejestruj")').getByLabel('Hasło', { exact: true }).fill(password);
    await page.fill('input[name="passwordConfirmation"]', password);
    await page.locator('input[name="passwordConfirmation"]').blur();
    await expect(page.getByRole('button', { name: 'Zarejestruj' })).toBeEnabled();
    await page.getByRole('button', { name: 'Zarejestruj' }).click();

    // Expect successful registration and redirection to the range page
    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    // Verify that the user is logged in by checking for the logout action in the user menu
    await page.getByLabel('Menu użytkownika').click();
    await expect(page.locator('text=Wyloguj')).toBeVisible();
  });

  test('should allow an existing user to log in and then log out', async ({ page }) => {
    await page.goto('/auth');

    // Fill out the login form with an existing seeded user
    await page.getByLabel('Adres e-mail', { exact: true }).fill('standard-user@e2e.com');
    await page.getByLabel('Hasło', { exact: true }).fill('standardpassword');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    // Expect to land on the default range page with range details visible
    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');
    await expect(page.locator('text=E2E Test Range')).toBeVisible();

    // Open the user menu and log out
    await page.getByLabel('Menu użytkownika').click();
    await page.locator('text=Wyloguj').click();

    // Verify the user is taken back to the login view
    await page.waitForURL('/auth');
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });

  test('should redirect unauthenticated users to the login page when accessing protected routes', async ({ page }) => {
    await page.goto('/dobczyce');

    // Router guard should redirect unauthenticated users to the auth view with redirect query
    await page.waitForURL((url) => url.pathname === '/auth' && url.searchParams.get('redirect') === '/dobczyce');
    await expect(page.getByRole('tab', { name: 'Logowanie' })).toBeVisible();
    await expect(page.getByLabel('Adres e-mail', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeDisabled();
  });
});
