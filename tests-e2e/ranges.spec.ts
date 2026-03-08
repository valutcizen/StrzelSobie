import { expect, test, type TestInfo } from '@playwright/test';
import { RangeLandingPage } from './pages/range-landing.page';
import { claimSlot } from './support/calendar-slots';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const allyRangeSlug = 'ally-e2e';
const comingSoonRangeSlug = 'coming-soon-e2e';
const rangeId = 99;
const adminUserId = 901;
const rangeAdminRoleId = 5;
const slotSeed = (testInfo: TestInfo, label: string) => `${testInfo.project.name}:${testInfo.title}:${label}`;

test.describe('Ranges', () => {
  test('should display range details for the current range @member', async ({ page }) => {

    await page.goto(`/${rangeSlug}`);
    await expect(page).toHaveURL(`/${rangeSlug}`);

    await expect(page.getByText(translate('rangeLanding.operatingHours.title'), { exact: false })).toBeVisible();

    const mondayLabel = translate('rangeLanding.days.monday');
    const mondayRow = page.locator('tr', { hasText: mondayLabel }).first();
    await expect(mondayRow).toContainText(mondayLabel);
    await expect(mondayRow).toContainText('10:00');
    await expect(mondayRow).toContainText('18:00');

    await expect(page.getByTestId('range-open-calendar-button')).toBeVisible();
  });

  test('member sees member-only range notes @member', async ({ page }) => {
    const landingPage = new RangeLandingPage(page);

    await page.goto(`/${rangeSlug}`);
    await expect(landingPage.view).toBeVisible();

    await expect(landingPage.memberDescriptionCard).toBeVisible();
    await expect(landingPage.memberDescriptionContent).toContainText('Member-only notes for E2E tests.');
    await expect(landingPage.administratorContactsCard).toBeVisible();
    await expect(landingPage.administratorContactsList).toBeVisible();
  });

  test('booking controls reflect range availability @member', async ({ page }) => {
    const landingPage = new RangeLandingPage(page);

    await page.goto(`/${rangeSlug}`);
    await expect(landingPage.view).toBeVisible();
    await expect(landingPage.openCalendarButton).toBeEnabled();
    await expect(landingPage.bookingStatusChip).toContainText(translate('rangeLanding.bookingStatus.open'));

    await page.goto(`/${allyRangeSlug}`);
    await expect(landingPage.view).toBeVisible();
    await expect(landingPage.openCalendarButton).toBeDisabled();
    await expect(landingPage.actionBar.getByTestId('range-action-alert')).toContainText(
      translate('range.actionBar.unavailableAlly'),
    );
    await expect(landingPage.bookingStatusChip).toContainText(translate('rangeLanding.bookingStatus.closed'));

    await page.goto(`/${comingSoonRangeSlug}`);
    await expect(landingPage.view).toBeVisible();
    await expect(landingPage.openCalendarButton).toBeDisabled();
    await expect(landingPage.actionBar.getByTestId('range-action-alert')).toContainText(
      translate('range.actionBar.unavailableComingSoon'),
    );
    await expect(landingPage.bookingStatusChip).toContainText(translate('rangeLanding.bookingStatus.closed'));
  });

  test('non-bookable ranges redirect calendar visits back to info view @member', async ({ page }) => {
    const landingPage = new RangeLandingPage(page);
    const unavailableNotice = translate('rangeLanding.bookingUnavailableNotice');

    await page.goto(`/${allyRangeSlug}/calendar`);
    await expect(page).toHaveURL(`/${allyRangeSlug}`);
    await expect(landingPage.view).toBeVisible();
    await expect(landingPage.bookingUnavailableAlert).toContainText(unavailableNotice);
    await expect(landingPage.openCalendarButton).toBeDisabled();
  });

  test('reservation attempts for non-bookable ranges return a conflict @range-admin', async ({ page }, testInfo) => {
    const slotClaim = claimSlot(slotSeed(testInfo, 'non-bookable'));
    const payload = {
      eventDate: slotClaim.slot.eventDate,
      startTime: slotClaim.slot.startTime,
      endTime: slotClaim.slot.endTime,
      firingLineId: 1,
      trackNos: [1],
    };

    try {
      for (const slug of [allyRangeSlug, comingSoonRangeSlug]) {
        const response = await page.request.post(`/api/v1/ranges/${slug}/reservations`, {
          data: payload,
        });
        expect(response.status()).toBe(409);
        const body = await response.json().catch(() => ({}));
        expect((body as { code?: string }).code).toBe('reservations_not_available_for_ally_range');
      }
    } finally {
      slotClaim.release();
    }
  });

  test('a range administrator can update range settings @range-admin', async ({ page }) => {

    const initialRangeResponse = await page.request.get(`/api/v1/ranges/${rangeSlug}`);
    expect(initialRangeResponse.ok()).toBeTruthy();
    const initialRange = await initialRangeResponse.json();

    const updatedTotalTracks = (initialRange.totalTracks ?? 0) + 1;
    const updatedOperatingHours = JSON.parse(JSON.stringify(initialRange.operatingHours ?? {}));
    updatedOperatingHours.monday = { open: '09:00', close: '17:00' };

    const revertPayload = {
      totalTracks: initialRange.totalTracks,
      operatingHours: initialRange.operatingHours,
    };

  try {
    await page.goto('/admin/range-settings');
      await expect(page).toHaveURL(/\/admin\/range-settings/);
      await expect(
        page.getByRole('heading', {
          name: translate('admin.rangeSettings.operatingHoursHeading'),
        }),
      ).toBeVisible();

      const totalTracksWrapper = page.getByTestId('range-settings-total-tracks-input');
      const totalTracksInput = totalTracksWrapper.locator('input');
      await totalTracksInput.fill(updatedTotalTracks.toString());

      await page.getByTestId('range-settings-monday-open-time-input').locator('input').fill('09:00');
      await page.getByTestId('range-settings-monday-close-time-input').locator('input').fill('17:00');

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}`) &&
          response.request().method() === 'PATCH',
      );

      const refreshResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}`) &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      );

      await page.getByRole('button', { name: translate('admin.rangeSettings.submitAction') }).click();

      await patchResponsePromise;
      await refreshResponsePromise;

      await expect(page.getByText(translate('admin.rangeSettings.successMessage'))).toBeVisible();

      const reloadRangeResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}`) &&
          response.request().method() === 'GET',
      );

      await page.reload();
      await page.waitForURL(/\/admin\/range-settings/);
      await reloadRangeResponsePromise;

      await expect(
        page.getByRole('heading', {
          name: translate('admin.rangeSettings.operatingHoursHeading'),
        }),
      ).toBeVisible();

      const apiPatchResponse = await page.request.patch(`/api/v1/ranges/${rangeSlug}`, {
        data: {
          totalTracks: updatedTotalTracks,
          operatingHours: updatedOperatingHours,
        },
      });
      expect(apiPatchResponse.ok()).toBeTruthy();

      const fetchRangeWithRetry = async (retries = 8, delayMs = 750) => {
        let lastBody: any;
        for (let attempt = 0; attempt < retries; attempt++) {
          const response = await page.request.get(`/api/v1/ranges/${rangeSlug}`);
          if (response.ok()) {
            const body = await response.json();
            if (
              (body.totalTracks ?? body.total_tracks) === updatedTotalTracks &&
              body.operatingHours?.monday?.open === '09:00' &&
              body.operatingHours?.monday?.close === '17:00'
            ) {
              return body;
            }
            lastBody = body;
          }
          await page.waitForTimeout(delayMs);
        }
        return lastBody;
      };

      const refreshedRange = await fetchRangeWithRetry();

      await totalTracksInput.fill(refreshedRange.totalTracks?.toString() ?? '');
      await page
        .getByTestId('range-settings-monday-open-time-input')
        .locator('input')
        .fill(refreshedRange.operatingHours?.monday?.open ?? '09:00');
      await page
        .getByTestId('range-settings-monday-close-time-input')
        .locator('input')
        .fill(refreshedRange.operatingHours?.monday?.close ?? '17:00');

      expect(refreshedRange.totalTracks).toBe(updatedTotalTracks);
      expect(refreshedRange.operatingHours?.monday?.open).toBe('09:00');
      expect(refreshedRange.operatingHours?.monday?.close).toBe('17:00');

      const updatedTotalTracksInput = page.getByTestId('range-settings-total-tracks-input').locator('input');
      await expect.poll(async () => updatedTotalTracksInput.inputValue(), { timeout: 10000 }).toBe(
        refreshedRange.totalTracks?.toString() ?? '',
      );

      await expect(page.getByTestId('range-settings-monday-open-time-input').locator('input')).toHaveValue(
        refreshedRange.operatingHours?.monday?.open ?? '09:00',
      );
      await expect(page.getByTestId('range-settings-monday-close-time-input').locator('input')).toHaveValue(
        refreshedRange.operatingHours?.monday?.close ?? '17:00',
      );
    } finally {
      await page.request
        .patch(`/api/v1/ranges/${rangeSlug}`, {
          data: revertPayload,
        })
        .catch(() => {});
    }
  });
});
