import { expect, test } from '@playwright/test';
import { RangeDirectoryPage } from './pages/range-directory.page';
import { RangeLandingPage } from './pages/range-landing.page';
import { translate } from './support/i18n';

test.describe('Range directory (public)', () => {
  test('visitor can browse ranges via map and list @all', async ({ page }) => {
    const directoryPage = new RangeDirectoryPage(page);

    await page.goto('/map');
    await expect(directoryPage.view).toBeVisible();
    await expect(page.getByRole('heading', { name: translate('rangeDirectory.title') })).toBeVisible();
    await expect(directoryPage.map).toBeVisible();
    await expect(directoryPage.list).toBeVisible();

    await expect(directoryPage.rows).toHaveCount(4);
    await expect(directoryPage.nameCell('dobczyce')).toBeVisible();
    await expect(directoryPage.nameCell('ally-e2e')).toBeVisible();
    await expect(directoryPage.nameCell('meetup-e2e')).toBeVisible();
    await expect(directoryPage.nameCell('coming-soon-e2e')).toBeVisible();
    await expect(directoryPage.rows.nth(0).getByTestId('range-list-name')).toHaveAttribute(
      'data-range-slug',
      'dobczyce',
    );
    await expect(directoryPage.rows.nth(1).getByTestId('range-list-name')).toHaveAttribute(
      'data-range-slug',
      'ally-e2e',
    );
    await expect(directoryPage.rows.nth(2).getByTestId('range-list-name')).toHaveAttribute(
      'data-range-slug',
      'meetup-e2e',
    );
    await expect(directoryPage.rows.nth(3).getByTestId('range-list-name')).toHaveAttribute(
      'data-range-slug',
      'coming-soon-e2e',
    );

    await expect(directoryPage.typeBadge('dobczyce')).toHaveText(translate('rangeTypes.club'));
    await expect(directoryPage.typeBadge('ally-e2e')).toHaveText(translate('rangeTypes.ally'));
    await expect(directoryPage.typeBadge('meetup-e2e')).toHaveText(translate('rangeTypes.meetup'));
    await expect(directoryPage.typeBadge('coming-soon-e2e')).toHaveText(translate('rangeTypes.coming-soon'));

    const markers = directoryPage.map.locator('.range-map__pin');
    await expect(markers).toHaveCount(4);

    await directoryPage.detailsButton('ally-e2e').click();

    const landingPage = new RangeLandingPage(page);
    await expect(landingPage.view).toBeVisible();
    await expect(page).toHaveURL('/ally-e2e');
  });

  test('visitor sees public range details without member notes @all', async ({ page }) => {
    const landingPage = new RangeLandingPage(page);

    await page.goto('/dobczyce');
    await expect(landingPage.view).toBeVisible();
    await expect(landingPage.publicDescription).toContainText('E2E test club range with active reservations.');
    await expect(landingPage.memberDescriptionCard).toHaveCount(0);
  });

  test('home page respects the last viewed range @all', async ({ page }) => {
    const landingPage = new RangeLandingPage(page);

    await page.goto('/coming-soon-e2e');
    await expect(landingPage.view).toBeVisible();
    await landingPage.bookingStatusChip.waitFor({ state: 'visible' });
    await expect(page).toHaveURL('/coming-soon-e2e');

    await page.evaluate(() => localStorage.setItem('lastRangeId', 'coming-soon-e2e'));

    await page.goto('/');
    await expect.poll(async () => page.url(), { timeout: 10000 }).toBe('http://localhost:5173/coming-soon-e2e');
    await expect(landingPage.view).toBeVisible();
  });

  test('home page falls back to the directory when last range is invalid @all', async ({ page }) => {
    page.addInitScript(() => {
      localStorage.setItem('lastRangeId', 'missing-range');
    });

    await page.goto('/');

    const directoryPage = new RangeDirectoryPage(page);
    await expect.poll(async () => page.url(), { timeout: 10000 }).toBe('http://localhost:5173/map');
    await expect(directoryPage.view).toBeVisible();
  });
});
