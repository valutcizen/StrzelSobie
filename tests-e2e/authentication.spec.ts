import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a new user to register and then log in', async ({ page }) => {
    const email = `test-user-1@example.com`;
    const password = `password-123`;

    // Navigate to the authentication page
    await page.goto('/auth');

    // Click the "register" tab
    await page.click('text=Rejestracja');

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

    // Verify that the user is logged in by checking for a profile element (e.g., a logout button)
    // This selector will need to be updated based on the actual layout
        await page.getByLabel('Menu użytkownika').click();
    await expect(page.locator('text=Wyloguj')).toBeVisible();
  });
});
