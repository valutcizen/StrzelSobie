import { test, expect } from '@playwright/test';

test.describe('Users & Roles', () => {
  test('an admin can assign and remove roles from a user', async ({ page }) => {
    const uniqueId = Date.now();
    const managedUserEmail = `role-admin-${uniqueId}@example.com`;
    const managedUserPassword = 'TempPass123!';

    await page.request.post('/api/v1/auth/register', {
      data: { email: managedUserEmail, password: managedUserPassword },
    });
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/auth');

    await page.getByLabel('Adres e-mail', { exact: true }).fill('admin@e2e.com');
    await page.getByLabel('Hasło', { exact: true }).fill('adminpassword');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/user/roles') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/users') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.getByRole('link', { name: 'Zarządzanie użytkownikami' }).click(),
    ]);

    const targetRow = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRow).toBeVisible({ timeout: 20000 });

    await targetRow.locator('button').last().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(managedUserEmail)).toBeVisible();

    const roleSelect = dialog.getByRole('combobox').first();
    await roleSelect.click();
    await page.getByRole('option', { name: 'Koordynator' }).click();
    await roleSelect.press('Escape');
    await expect(page.locator('.v-overlay--absolute.v-overlay--active')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Zapisz' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Role użytkownika zostały zaktualizowane.')).toBeVisible();

    const targetRowWithRole = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRowWithRole.locator('.v-chip', { hasText: 'Koordynator' })).toBeVisible();

    await targetRowWithRole.locator('button').last().click();
    const dialogReopen = page.getByRole('dialog');
    await expect(dialogReopen).toBeVisible();

    const roleSelectAgain = dialogReopen.getByRole('combobox').first();
    await roleSelectAgain.click();
    await page.getByRole('option', { name: 'Koordynator' }).click();
    await roleSelectAgain.press('Escape');
    await expect(page.locator('.v-overlay--absolute.v-overlay--active')).toHaveCount(0);
    await dialogReopen.getByRole('button', { name: 'Zapisz' }).click();

    await expect(dialogReopen).toBeHidden();
    await expect(page.getByText('Role użytkownika zostały zaktualizowane.')).toBeVisible();

    const targetRowAfterRemoval = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRowAfterRemoval.locator('.v-chip', { hasText: 'Koordynator' })).toHaveCount(0);
    await expect(targetRowAfterRemoval.locator('.v-chip', { hasText: 'Gość' })).toBeVisible();

    await page.getByLabel('Menu użytkownika').click();
    await page.locator('text=Wyloguj').click();
    await page.waitForURL('/auth');
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });

  test('a confirmator can upgrade a guest to a member and revert the change', async ({ page }) => {
    const candidateEmail = `pending-member-${Date.now()}@example.com`;
    const candidatePassword = 'TempPass123!';

    await page.request.post('/api/v1/auth/register', {
      data: { email: candidateEmail, password: candidatePassword },
    });
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/auth');

    await page.getByLabel('Adres e-mail', { exact: true }).fill('confirmator@e2e.com');
    await page.getByLabel('Hasło', { exact: true }).fill('confirmatorpassword');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/users?status=pending-verification') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.getByRole('link', { name: 'Weryfikacja użytkowników' }).click(),
    ]);

    const pendingUserItem = page.locator('.v-list-item', { hasText: candidateEmail }).first();
    await pendingUserItem.waitFor({ state: 'visible' });

    await pendingUserItem.getByRole('button', { name: 'Nadaj rolę Członek' }).click();
    await expect(pendingUserItem.getByRole('button', { name: 'Usuń rolę Członek' })).toBeVisible();

    await expect(page.getByText(`Użytkownik ${candidateEmail} otrzymał rolę Członek.`)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: 'Członek' })).toBeVisible();

    await pendingUserItem.getByRole('button', { name: 'Usuń rolę Członek' }).click();
    await expect(pendingUserItem.getByRole('button', { name: 'Nadaj rolę Członek' })).toBeVisible();

    await expect(page.getByText(`Użytkownik ${candidateEmail} nie ma już roli Członek.`)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: 'Członek' })).toHaveCount(0);

    await page.getByLabel('Menu użytkownika').click();
    await page.locator('text=Wyloguj').click();
    await page.waitForURL('/auth');
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });

  test('a confirmator can upgrade a guest to a coordinator and revert the change', async ({ page }) => {
    const candidateEmail = `pending-coordinator-${Date.now()}@example.com`;
    const candidatePassword = 'TempPass123!';

    await page.request.post('/api/v1/auth/register', {
      data: { email: candidateEmail, password: candidatePassword },
    });
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/auth');

    await page.getByLabel('Adres e-mail', { exact: true }).fill('confirmator@e2e.com');
    await page.getByLabel('Hasło', { exact: true }).fill('confirmatorpassword');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/users?status=pending-verification') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.getByRole('link', { name: 'Weryfikacja użytkowników' }).click(),
    ]);

    const pendingUserItem = page.locator('.v-list-item', { hasText: candidateEmail }).first();
    await pendingUserItem.waitFor({ state: 'visible' });

    await pendingUserItem.getByRole('button', { name: 'Nadaj rolę Koordynator' }).click();
    await expect(pendingUserItem.getByRole('button', { name: 'Usuń rolę Koordynator' })).toBeVisible();

    await expect(page.getByText(`Użytkownik ${candidateEmail} otrzymał rolę Koordynator.`)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: 'Koordynator' })).toBeVisible();

    await pendingUserItem.getByRole('button', { name: 'Usuń rolę Koordynator' }).click();
    await expect(pendingUserItem.getByRole('button', { name: 'Nadaj rolę Koordynator' })).toBeVisible();

    await expect(page.getByText(`Użytkownik ${candidateEmail} nie ma już roli Koordynator.`)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: 'Koordynator' })).toHaveCount(0);

    await page.getByLabel('Menu użytkownika').click();
    await page.locator('text=Wyloguj').click();
    await page.waitForURL('/auth');
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });

  test('a guest cannot see contact information of other users', async ({ page }) => {
    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    const formatTime = (date: Date) =>
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const today = new Date();
    const dayOffset = (today.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOffset);
    monday.setHours(0, 0, 0, 0);

    const eventDateObj = new Date(monday);
    eventDateObj.setDate(monday.getDate() + 1);
    eventDateObj.setHours(12, 0, 0, 0);

    const eventEndObj = new Date(eventDateObj);
    eventEndObj.setHours(eventDateObj.getHours() + 1);

    const eventDate = formatDate(eventDateObj);
    const startTime = formatTime(eventDateObj);
    const endTime = formatTime(eventEndObj);

    await page.request.post('/api/v1/auth/login', {
      data: { email: 'member@e2e.com', password: 'memberpassword' },
    });

    const createResponse = await page.request.post('/api/v1/ranges/dobczyce/propositions', {
      data: {
        eventDate,
        startTime,
        endTime,
        numParticipants: 2,
        tracksRequested: 1,
      },
    });

    const { id: propositionId } = await createResponse.json();
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/auth');

    await page.getByLabel('Adres e-mail', { exact: true }).fill('guest@e2e.com');
    await page.getByLabel('Hasło', { exact: true }).fill('guestpassword');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await page.waitForURL('/dobczyce');
    await expect(page).toHaveURL('/dobczyce');

    await page.getByRole('button', { name: 'Przejdź do kalendarza' }).click();
    await page.waitForURL('/dobczyce/reservations');

    const calendarResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/ranges/dobczyce/events') &&
        response.request().method() === 'GET' &&
        response.status() === 200,
    );

    const calendarPayload = await calendarResponse.json();
    const propositionEntry = (calendarPayload.propositions ?? []).find(
      (item: { id: number }) => item.id === propositionId,
    );
    expect(propositionEntry).toBeDefined();

    const propositionLocator = page.locator(
      `[data-event-id="proposition-${propositionId}"]`,
    );
    await propositionLocator.waitFor({ state: 'visible', timeout: 10000 });
    await propositionLocator.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Zgłoszenie członka');
    await expect(dialog).not.toContainText('member@e2e.com');
    await expect(dialog).not.toContainText('303303303');

    await dialog.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByLabel('Menu użytkownika').click();
    await page.locator('text=Wyloguj').click();
    await page.waitForURL('/auth');
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });
});
