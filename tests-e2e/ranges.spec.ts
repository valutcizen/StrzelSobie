import { expect, test } from '@playwright/test';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const rangeId = 99;
const adminUserId = 901;
const rangeAdminRoleId = 5;

test.describe('Ranges', () => {
  test('should display range details for the current range @member', async ({ page }) => {

    await page.goto(`/${rangeSlug}`);
    await expect(page).toHaveURL(`/${rangeSlug}`);

    await expect(page.getByText(translate('rangeLanding.operatingHours.title'), { exact: false })).toBeVisible();

    const totalTracksPrefix = translate('rangeLanding.totalTracks').split('{count}')[0];
    const totalTracksLocator = page.getByText(totalTracksPrefix, { exact: false });
    const totalTracksText = await totalTracksLocator.innerText();
    const totalTracksPattern = new RegExp(
      translate('rangeLanding.totalTracks').replace('{count}', '\\d+'),
    );
    expect(totalTracksText).toMatch(totalTracksPattern);

    const mondayLabel = translate('rangeLanding.days.monday');
    const mondayRow = page.locator('tr', { hasText: mondayLabel }).first();
    await expect(mondayRow).toContainText(mondayLabel);
    await expect(mondayRow).toContainText('10:00');
    await expect(mondayRow).toContainText('18:00');

    await expect(page.getByRole('button', { name: translate('rangeLanding.actions.openCalendar') })).toBeVisible();
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
      await page.waitForURL('/admin/range-settings');
      await expect(
        page.getByRole('heading', {
          name: translate('admin.rangeSettings.operatingHoursHeading'),
        }),
      ).toBeVisible();

      const totalTracksInput = page.getByLabel(translate('admin.rangeSettings.totalTracksLabel'));
      await totalTracksInput.fill(updatedTotalTracks.toString());

      const mondayLabel = translate('rangeLanding.days.monday');
      const mondaySection = page.locator('.v-sheet').filter({ hasText: mondayLabel }).first();
      await mondaySection.getByLabel(translate('admin.rangeSettings.openTimeLabel')).fill('09:00');
      await mondaySection.getByLabel(translate('admin.rangeSettings.closeTimeLabel')).fill('17:00');

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

      await page.reload();
      await page.waitForURL('/admin/range-settings');
      await expect(
        page.getByRole('heading', {
          name: translate('admin.rangeSettings.operatingHoursHeading'),
        }),
      ).toBeVisible();

      const updatedTotalTracksInput = page.getByLabel(translate('admin.rangeSettings.totalTracksLabel'));
      await expect(updatedTotalTracksInput).toHaveValue(updatedTotalTracks.toString());

      const updatedMondaySection = page.locator('.v-sheet').filter({ hasText: mondayLabel }).first();
      await expect(updatedMondaySection.getByLabel(translate('admin.rangeSettings.openTimeLabel'))).toHaveValue('09:00');
      await expect(updatedMondaySection.getByLabel(translate('admin.rangeSettings.closeTimeLabel'))).toHaveValue('17:00');

      const refreshedRangeResponse = await page.request.get(`/api/v1/ranges/${rangeSlug}`);
      expect(refreshedRangeResponse.ok()).toBeTruthy();
      const refreshedRange = await refreshedRangeResponse.json();

      expect(refreshedRange.totalTracks).toBe(updatedTotalTracks);
      expect(refreshedRange.operatingHours?.monday?.open).toBe('09:00');
      expect(refreshedRange.operatingHours?.monday?.close).toBe('17:00');
    } finally {
      await page.request.patch(`/api/v1/ranges/${rangeSlug}`, {
        data: revertPayload,
      });
    }
  });
});
