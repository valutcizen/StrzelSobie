import { expect, test, type Page } from '@playwright/test';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';

const publicEvent = {
  slug: 'e2e-open-training',
  name: 'E2E Open Training',
};

const membersOnlyEvent = {
  slug: 'e2e-members-only-clinic',
  name: 'E2E Members Only Clinic',
};

const waitForEventDetails = (page: Page, slug: string, eventSlug: string, status = 200) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/ranges/${slug}/events/${eventSlug}`) &&
      response.request().method() === 'GET' &&
      response.status() === status,
  );

test.describe('Events (public access)', () => {
  test('visitor can open a public event and is prompted to log in on signup @all', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, publicEvent.slug);
    await page.goto(`/${rangeSlug}/events/${publicEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByTestId('event-detail-title')).toContainText(publicEvent.name);

    const signupButton = page.getByTestId('event-detail-signup-button');
    await expect(signupButton).toContainText(translate('events.detail.actions.signUp'));
    await signupButton.click();

    await expect(page.getByTestId('auth-dialog')).toBeVisible();
  });

  test('visitor sees access restriction for members-only events @all', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, membersOnlyEvent.slug, 403);
    await page.goto(`/${rangeSlug}/events/${membersOnlyEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByText('Request failed with status code 403')).toBeVisible();
    await expect(page.getByTestId('event-detail-signup-button')).toHaveCount(0);
  });
});
