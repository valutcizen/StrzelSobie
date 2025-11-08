import { test, expect, request } from '@playwright/test';
import { translate } from './support/i18n';

test.describe('Users & Roles', () => {
  test('an admin can assign and remove roles from a user @admin', async ({ page }) => {

    const uniqueId = Date.now();
    const managedUserEmail = `role-admin-${uniqueId}@example.com`;
    const managedUserPassword = 'TempPass123!';

    await page.request.post('/api/v1/auth/register', {
      data: { email: managedUserEmail, password: managedUserPassword },
    });

    await page.goto('/dobczyce');

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
      page.getByRole('link', { name: translate('navigation.userManagement') }).click(),
    ]);

    const targetRow = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRow).toBeVisible({ timeout: 20000 });

    await targetRow.locator('button').last().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(managedUserEmail)).toBeVisible();

    const roleSelect = dialog.getByRole('combobox').first();
    await roleSelect.click();
    await page.getByRole('option', { name: translate('roles.coordinator') }).click();
    await roleSelect.press('Escape');
    await expect(page.locator('.v-overlay--absolute.v-overlay--active')).toHaveCount(0);
    await dialog.getByRole('button', { name: translate('common.actions.save') }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.locator('.v-snackbar--active', { hasText: translate('admin.users.snackbarSuccess') }),
    ).toBeVisible();

    const targetRowWithRole = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRowWithRole.locator('.v-chip', { hasText: translate('roles.coordinator') })).toBeVisible();

    await targetRowWithRole.locator('button').last().click();
    const dialogReopen = page.getByRole('dialog');
    await expect(dialogReopen).toBeVisible();

    const roleSelectAgain = dialogReopen.getByRole('combobox').first();
    await roleSelectAgain.click();
    await page.getByRole('option', { name: translate('roles.coordinator') }).click();
    await roleSelectAgain.press('Escape');
    await expect(page.locator('.v-overlay--absolute.v-overlay--active')).toHaveCount(0);
    await dialogReopen.getByRole('button', { name: translate('common.actions.save') }).click();

    await expect(dialogReopen).toBeHidden();
    await expect(
      page.locator('.v-snackbar--active', { hasText: translate('admin.users.snackbarSuccess') }),
    ).toBeVisible();

    const targetRowAfterRemoval = page.locator('tbody tr', { hasText: managedUserEmail }).first();
    await expect(targetRowAfterRemoval.locator('.v-chip', { hasText: translate('roles.coordinator') })).toHaveCount(0);
    await expect(targetRowAfterRemoval.locator('.v-chip', { hasText: translate('roles.guest') })).toBeVisible();
  });

  test('a confirmator can upgrade a guest to a member and revert the change @confirmator', async ({ page }) => {

    const candidateEmail = `pending-member-${Date.now()}@example.com`;
    const candidatePassword = 'TempPass123!';
    const memberRoleLabel = translate('roles.member');
    const assignMemberLabel = translate('admin.userRoles.assignRole', { role: memberRoleLabel });
    const removeMemberLabel = translate('admin.userRoles.removeRole', { role: memberRoleLabel });
    const memberAssignedMessage = translate('admin.userRoles.roleAssigned', {
      email: candidateEmail,
      role: memberRoleLabel,
    });
    const memberRemovedMessage = translate('admin.userRoles.roleRemoved', {
      email: candidateEmail,
      role: memberRoleLabel,
    });

    await page.request.post('/api/v1/auth/register', {
      data: { email: candidateEmail, password: candidatePassword },
    });

    await page.goto('/dobczyce');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/users?status=pending-verification') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.getByRole('link', { name: translate('navigation.userVerification') }).click(),
    ]);

    const pendingUserItem = page.locator('.v-list-item', { hasText: candidateEmail }).first();
    await pendingUserItem.waitFor({ state: 'visible' });

    await pendingUserItem.getByRole('button', { name: assignMemberLabel }).click();
    await expect(pendingUserItem.getByRole('button', { name: removeMemberLabel })).toBeVisible();

    await expect(page.getByText(memberAssignedMessage)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: memberRoleLabel })).toBeVisible();

    await pendingUserItem.getByRole('button', { name: removeMemberLabel }).click();
    await expect(pendingUserItem.getByRole('button', { name: assignMemberLabel })).toBeVisible();

    await expect(page.getByText(memberRemovedMessage)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: memberRoleLabel })).toHaveCount(0);
  });

  test('a confirmator can upgrade a guest to a coordinator and revert the change @confirmator', async ({ page }) => {

    const candidateEmail = `pending-coordinator-${Date.now()}@example.com`;
    const candidatePassword = 'TempPass123!';
    const coordinatorRoleLabel = translate('roles.coordinator');
    const assignCoordinatorLabel = translate('admin.userRoles.assignRole', { role: coordinatorRoleLabel });
    const removeCoordinatorLabel = translate('admin.userRoles.removeRole', { role: coordinatorRoleLabel });
    const coordinatorAssignedMessage = translate('admin.userRoles.roleAssigned', {
      email: candidateEmail,
      role: coordinatorRoleLabel,
    });
    const coordinatorRemovedMessage = translate('admin.userRoles.roleRemoved', {
      email: candidateEmail,
      role: coordinatorRoleLabel,
    });

    await page.request.post('/api/v1/auth/register', {
      data: { email: candidateEmail, password: candidatePassword },
    });

    await page.goto('/dobczyce');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/users?status=pending-verification') &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      ),
      page.getByRole('link', { name: translate('navigation.userVerification') }).click(),
    ]);

    const pendingUserItem = page.locator('.v-list-item', { hasText: candidateEmail }).first();
    await pendingUserItem.waitFor({ state: 'visible' });

    await pendingUserItem.getByRole('button', { name: assignCoordinatorLabel }).click();
    await expect(pendingUserItem.getByRole('button', { name: removeCoordinatorLabel })).toBeVisible();

    await expect(page.getByText(coordinatorAssignedMessage)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: coordinatorRoleLabel })).toBeVisible();

    await pendingUserItem.getByRole('button', { name: removeCoordinatorLabel }).click();
    await expect(pendingUserItem.getByRole('button', { name: assignCoordinatorLabel })).toBeVisible();

    await expect(page.getByText(coordinatorRemovedMessage)).toBeVisible();
    await expect(pendingUserItem.locator('.v-chip', { hasText: coordinatorRoleLabel })).toHaveCount(0);
  });

  test('a guest sees only their own propositions and no reservation details for others @guest', async ({ page }) => {

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
    eventDateObj.setHours(10, 0, 0, 0);

    const eventEndObj = new Date(eventDateObj);
    eventEndObj.setHours(eventDateObj.getHours() + 1);

    const eventDate = formatDate(eventDateObj);
    const startTime = formatTime(eventDateObj);
    const endTime = formatTime(eventEndObj);

    const memberContext = await request.newContext({ storageState: 'tests-e2e/.auth/member.json' });
    const createResponse = await memberContext.post('http://localhost:5173/api/v1/ranges/dobczyce/propositions', {
      data: {
        eventDate,
        startTime,
        endTime,
        numParticipants: 2,
        tracksRequested: 1,
      },
    });
    if (!createResponse.ok()) {
      console.error(await createResponse.text());
    }
    expect(createResponse.ok()).toBeTruthy();

    const { id: propositionId } = await createResponse.json();

    const coordinatorContext = await request.newContext({ storageState: 'tests-e2e/.auth/coordinator.json' });
    const candidateDayOffsets = [2, 3, 4]; // mid-week slots to reduce conflict risk
    const candidateHours = [8, 12, 16];

    let reservationId: number | null = null;

    for (const dayOffsetCandidate of candidateDayOffsets) {
      if (reservationId) {
        break;
      }

      for (const hourCandidate of candidateHours) {
        const reservationStartObj = new Date(monday);
        reservationStartObj.setDate(monday.getDate() + dayOffsetCandidate);
        reservationStartObj.setHours(hourCandidate, 0, 0, 0);

        const reservationEndObj = new Date(reservationStartObj);
        reservationEndObj.setHours(reservationStartObj.getHours() + 1);

        const reservationResponse = await coordinatorContext.post('http://localhost:5173/api/v1/ranges/dobczyce/reservations', {
          data: {
            eventDate: formatDate(reservationStartObj),
            startTime: formatTime(reservationStartObj),
            endTime: formatTime(reservationEndObj),
            numParticipants: 3,
            tracksRequested: 2,
            isPublic: false,
            isJoinable: false,
          },
        });

        if (!reservationResponse.ok()) {
          continue;
        }

        const payload = await reservationResponse.json();
        reservationId = payload.id ?? null;
        break;
      }
    }

    expect(reservationId).toBeDefined();
    const resolvedReservationId = reservationId!;

    await page.goto('/dobczyce/reservations');

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
    expect(propositionEntry).toBeUndefined();

    const reservationEntry = (calendarPayload.reservations ?? []).find(
      (item: { id: number }) => item.id === resolvedReservationId,
    );
    expect(reservationEntry).toBeDefined();
    expect(reservationEntry?.details).toBeNull();
    expect(reservationEntry?.tracksRequested).toBeNull();
    expect(reservationEntry?.isJoinable).toBeNull();

    const propositionLocator = page.locator(
      `[data-event-id="proposition-${propositionId}"]`,
    );
    await expect(propositionLocator).toHaveCount(0);

    const reservationDetailResponse = await page.request.get(
      `/api/v1/reservations/${resolvedReservationId}`,
    );
    expect(reservationDetailResponse.status()).toBe(403);

    const propositionDetailResponse = await page.request.get(
      `/api/v1/propositions/${propositionId}`,
    );
    const propositionStatus = propositionDetailResponse.status();
    expect(propositionStatus).toBeGreaterThanOrEqual(400);
    expect(propositionStatus).toBeLessThan(500);
  });

  test('a coordinator can view contact details for a managed reservation @coordinator', async ({ page }) => {

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

    const memberContext = await request.newContext({ storageState: 'tests-e2e/.auth/member.json' });
    const candidateDayOffsets = [2, 3, 4, 5];
    const candidateHours = [8, 11, 14, 17, 19];
    const candidateMinutes = [5, 20, 35, 50];

    const toDisplayTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      return `${parseInt(hours, 10)}:${minutes}`;
    };

    let propositionId: number | null = null;
    let reservationId: number | null = null;
    let selectedSlot: { eventDate: string; startTime: string; endTime: string; label: string } | null = null;

    slotSearch: for (const dayOffset of candidateDayOffsets) {
      for (const hour of candidateHours) {
        for (const minute of candidateMinutes) {
          const propositionStart = new Date(monday);
          propositionStart.setDate(monday.getDate() + dayOffset);
          propositionStart.setHours(hour, minute, 0, 0);

          const propositionEnd = new Date(propositionStart);
          propositionEnd.setHours(propositionStart.getHours() + 1);

          const eventDate = formatDate(propositionStart);
          const startTime = formatTime(propositionStart);
          const endTime = formatTime(propositionEnd);

          const propositionResponse = await memberContext.post(
            'http://localhost:5173/api/v1/ranges/dobczyce/propositions',
            {
              data: {
                eventDate,
                startTime,
                endTime,
                numParticipants: 2,
                tracksRequested: 1,
              },
            },
          );

          if (!propositionResponse.ok()) {
            continue;
          }

          const propositionPayload = await propositionResponse.json();
          propositionId = propositionPayload.id;

          const reservationPayload = {
            propositionId,
            eventDate,
            startTime,
            endTime,
            numParticipants: 3,
            tracksRequested: 2,
            isPublic: false,
            isJoinable: false,
          };

          let reservationResponse = await page.request.post('/api/v1/ranges/dobczyce/reservations', {
            data: reservationPayload,
          });

          if (!reservationResponse.ok()) {
            const errorText = await reservationResponse.text();
            let errorBody: { code?: string } | null = null;
            try {
              errorBody = JSON.parse(errorText);
            } catch {
              errorBody = null;
            }

            if (reservationResponse.status() === 400 && errorBody?.code === 'reservation_force_required') {
              reservationResponse = await page.request.post(
                '/api/v1/ranges/dobczyce/reservations?force=true',
                { data: reservationPayload },
              );
            } else {
              await memberContext
                .delete(`http://localhost:5173/api/v1/propositions/${propositionId}`)
                .catch(() => {});
              propositionId = null;
              continue;
            }
          }

          if (!reservationResponse.ok()) {
            await memberContext.delete(`http://localhost:5173/api/v1/propositions/${propositionId}`).catch(() => {});
            propositionId = null;
            continue;
          }

          const reservationPayloadResponse = await reservationResponse.json();
          reservationId = reservationPayloadResponse.id;
          const displayLabel = `${toDisplayTime(startTime)} - ${toDisplayTime(endTime)}`;
          selectedSlot = { eventDate, startTime, endTime, label: displayLabel };
          break slotSearch;
        }
      }
    }

    if (!propositionId || !reservationId || !selectedSlot) {
      throw new Error('Failed to create a unique reservation for coordinator test without conflicts.');
    }

    const { startTime, label: eventLabel } = selectedSlot;

    await page.goto('/dobczyce/reservations');

    const eventsResponsePromise = page.waitForResponse((response) => {
      if (!response.url().includes('/api/v1/ranges/dobczyce/events')) {
        return false;
      }
      if (response.request().method() !== 'GET') {
        return false;
      }
      return response.status() === 200;
    });

    await eventsResponsePromise;
    const eventsPayload = await eventsResponsePromise.then((response) => response.json());

    const reservationEntry = (eventsPayload.reservations ?? []).find(
      (item: { id: number }) => item.id === reservationId,
    );
    expect(reservationEntry).toBeDefined();

    const eventLocator = page
      .locator('.fc-timegrid-event')
      .filter({ hasText: eventLabel })
      .filter({ hasText: 'Rezerwacja' })
      .first();
    await expect(eventLocator).toBeVisible({ timeout: 20000 });

    await eventLocator.scrollIntoViewIfNeeded();
    await eventLocator.click({ force: true });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('member@e2e.com')).toBeVisible();
    await expect(dialog.getByText('303303303')).toBeVisible();

    await dialog.getByRole('button', { name: translate('common.actions.close') }).click();
    await expect(dialog).toBeHidden();
  });
});
