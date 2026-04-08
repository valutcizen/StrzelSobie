import { test, expect, request } from '@playwright/test';
import { claimSlot } from './support/calendar-slots';
import { translate } from './support/i18n';
import { getFiringLineForTracks } from './support/range-fixtures';

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
    const usersSnackbar = page.getByTestId('user-management-snackbar');
    await expect(usersSnackbar).toBeVisible();
    await expect(usersSnackbar).toContainText(translate('admin.users.snackbarSuccess'));

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
    await expect(usersSnackbar).toBeVisible();
    await expect(usersSnackbar).toContainText(translate('admin.users.snackbarSuccess'));

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

  test('a guest sees only their own propositions and no reservation details for others @guest', async ({ page }, testInfo) => {

    const memberContext = await request.newContext({ storageState: 'tests-e2e/.auth/member.json' });
    const rangeAdminContext = await request.newContext({ storageState: 'tests-e2e/.auth/range-admin.json' });
    const propositionClaim = claimSlot(`${testInfo.project.name}:${testInfo.title}:guest-proposition`);
    const reservationClaim = claimSlot(`${testInfo.project.name}:${testInfo.title}:guest-reservation`);
    let propositionId: number | null = null;
    let reservationId: number | null = null;

    try {
      const memberFiringLine = await getFiringLineForTracks(memberContext, 'http://localhost:5173', 'dobczyce', 1);
      const createResponse = await memberContext.post('http://localhost:5173/api/v1/ranges/dobczyce/propositions', {
        data: {
          eventDate: propositionClaim.slot.eventDate,
          startTime: propositionClaim.slot.startTime,
          endTime: propositionClaim.slot.endTime,
          firingLineId: memberFiringLine.id,
          trackNos: [1],
          hasCoordinatorLicenseInGroup: true,
        },
      });
      if (!createResponse.ok()) {
        console.error(await createResponse.text());
      }
      expect(createResponse.ok()).toBeTruthy();

      propositionId = (await createResponse.json()).id ?? null;
      expect(propositionId).toBeTruthy();

      const reservationFiringLine = await getFiringLineForTracks(rangeAdminContext, 'http://localhost:5173', 'dobczyce', 2);
      const reservationResponse = await rangeAdminContext.post('http://localhost:5173/api/v1/ranges/dobczyce/reservations', {
        data: {
          eventDate: reservationClaim.slot.eventDate,
          startTime: reservationClaim.slot.startTime,
          endTime: reservationClaim.slot.endTime,
          firingLineId: reservationFiringLine.id,
          trackNos: [1, 2],
        },
      });

      reservationId = reservationResponse.ok() ? (await reservationResponse.json()).id ?? null : null;
      expect(reservationId).toBeDefined();
      const resolvedReservationId = reservationId!;

      await page.goto('/dobczyce/calendar');

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
      expect(reservationEntry?.trackNos).toEqual([]);

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
    } finally {
      if (reservationId !== null) {
        await rangeAdminContext.delete(`http://localhost:5173/api/v1/reservations/${reservationId}`).catch(() => {});
      }
      if (propositionId !== null) {
        await memberContext.delete(`http://localhost:5173/api/v1/propositions/${propositionId}`).catch(() => {});
      }
      propositionClaim.release();
      reservationClaim.release();
      await Promise.all([memberContext.dispose(), rangeAdminContext.dispose()]);
    }
  });

  test('a range admin can view contact details for a managed reservation @range-admin', async ({ page }, testInfo) => {
    const memberContext = await request.newContext({ storageState: 'tests-e2e/.auth/member.json' });
    const propositionClaim = claimSlot(`${testInfo.project.name}:${testInfo.title}:managed-proposition`);

    const toDisplayTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      return `${parseInt(hours, 10)}:${minutes}`;
    };

    let propositionId: number | null = null;
    let reservationId: number | null = null;
    let selectedSlot: { eventDate: string; startTime: string; endTime: string; label: string } | null = null;
    try {
      const memberFiringLine = await getFiringLineForTracks(memberContext, 'http://localhost:5173', 'dobczyce', 1);
      const propositionResponse = await memberContext.post(
        'http://localhost:5173/api/v1/ranges/dobczyce/propositions',
        {
          data: {
            eventDate: propositionClaim.slot.eventDate,
            startTime: propositionClaim.slot.startTime,
            endTime: propositionClaim.slot.endTime,
            firingLineId: memberFiringLine.id,
            trackNos: [1],
            hasCoordinatorLicenseInGroup: true,
          },
        },
      );

      if (propositionResponse.ok()) {
        const propositionPayload = await propositionResponse.json();
        propositionId = propositionPayload.id;

        const reservationPayload = {
          propositionId,
          eventDate: propositionClaim.slot.eventDate,
          startTime: propositionClaim.slot.startTime,
          endTime: propositionClaim.slot.endTime,
          adminMessage: 'Approved for contact details test',
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
          }
        }

        if (reservationResponse.ok()) {
          const reservationPayloadResponse = await reservationResponse.json();
          reservationId = reservationPayloadResponse.id;
          const displayLabel = `${toDisplayTime(propositionClaim.slot.startTime)} - ${toDisplayTime(propositionClaim.slot.endTime)}`;
          selectedSlot = {
            eventDate: propositionClaim.slot.eventDate,
            startTime: propositionClaim.slot.startTime,
            endTime: propositionClaim.slot.endTime,
            label: displayLabel,
          };
        }
      }

      if (!propositionId || !reservationId || !selectedSlot) {
        throw new Error('Failed to create a unique reservation for coordinator test without conflicts.');
      }

      const { label: eventLabel } = selectedSlot;

      await page.goto('/dobczyce/calendar');

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
    } finally {
      if (reservationId !== null) {
        await page.request.delete(`/api/v1/reservations/${reservationId}`).catch(() => {});
      }
      if (propositionId !== null) {
        await memberContext.delete(`http://localhost:5173/api/v1/propositions/${propositionId}`).catch(() => {});
      }
      propositionClaim.release();
      await memberContext.dispose();
    }
  });
});
