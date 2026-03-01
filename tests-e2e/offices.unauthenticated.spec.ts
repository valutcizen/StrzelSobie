import { expect, test } from '@playwright/test';
import { RangeDirectoryPage } from './pages/range-directory.page';
import { translate } from './support/i18n';

test.describe('Offices directory (public)', () => {
  test('visitor can browse offices and open office details @all', async ({ page }) => {
    const directoryPage = new RangeDirectoryPage(page);

    await page.goto('/offices');
    await expect(page.getByTestId('offices-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: translate('rangeDirectory.officesTitle') })).toBeVisible();

    await expect(page.getByTestId('offices-mode-select')).toBeVisible();
    await expect(directoryPage.nameCell('office-e2e')).toBeVisible();
    await expect(directoryPage.typeBadge('office-e2e')).toHaveText(translate('rangeTypes.office'));

    await directoryPage.detailsButton('office-e2e').click();

    await expect(page.getByTestId('office-landing-view')).toBeVisible();
    await expect(page.getByTestId('office-landing-title')).toContainText('E2E Field Office');
    await expect(page.getByTestId('office-localization')).toBeVisible();
    await expect(page.getByTestId('office-details')).toContainText('E2E office details.');
    await expect(page.getByTestId('office-address')).toContainText('ul. Testowa 1, Kraków');

    const phoneLink = page.getByTestId('office-phone').locator('a[href^="tel:"]');
    await expect(phoneLink).toHaveAttribute('href', 'tel:+48111222333');
    await expect(phoneLink).toContainText('+48111222333');
  });
});

