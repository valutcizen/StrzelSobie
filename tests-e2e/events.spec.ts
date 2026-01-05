import { expect, test, type Page } from '@playwright/test';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const meetupRangeSlug = 'meetup-e2e';

const publicEvent = {
  slug: 'e2e-open-training',
  name: 'E2E Open Training',
  memberDescription: 'Member-only prep notes for E2E tests.',
};

const waitlistEvent = {
  slug: 'e2e-members-only-clinic',
  name: 'E2E Members Only Clinic',
};

const closedRegistrationEvent = {
  slug: 'e2e-closed-registration',
  name: 'E2E Registration Closed',
};

const adminEvent = {
  slug: 'e2e-admin-workshop',
  name: 'E2E Organizer Workshop',
};

const meetupEvent = {
  slug: 'e2e-meetup-hangout',
  name: 'E2E Meetup Hangout',
};

const waitForEventDetails = (page: Page, slug: string, eventSlug: string) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/ranges/${slug}/events/${eventSlug}`) &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

test.describe('Events', () => {
  test('lists meetup events and opens details @admin', async ({ page }) => {
    const eventsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/ranges/${meetupRangeSlug}/events`) &&
        response.request().method() === 'GET' &&
        response.status() === 200,
    );

    await page.goto(`/${meetupRangeSlug}`);
    await eventsResponsePromise;

    await expect(page.getByTestId('range-landing-events-card')).toBeVisible();
    await expect(page.getByTestId('range-create-event-button')).toBeVisible();

    const eventItem = page
      .getByTestId('range-landing-event-item')
      .filter({ hasText: meetupEvent.name })
      .first();

    await expect(eventItem).toBeVisible();

    const detailResponsePromise = waitForEventDetails(page, meetupRangeSlug, meetupEvent.slug);
    await eventItem.click();
    await detailResponsePromise;

    await expect(page).toHaveURL(`/${meetupRangeSlug}/events/${meetupEvent.slug}`);
    await expect(page.getByTestId('event-detail-title')).toContainText(meetupEvent.name);
  });

  test('organizer sees participant list and copies it @admin', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const detailResponsePromise = waitForEventDetails(page, rangeSlug, adminEvent.slug);
    await page.goto(`/${rangeSlug}/events/${adminEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByTestId('event-participant-list')).toBeVisible();

    const confirmedTable = page.getByTestId('event-participant-confirmed-table');
    await expect(confirmedTable).toContainText('member@e2e.com');
    await expect(confirmedTable).toContainText('rangeadmin@e2e.com');

    const waitlistTable = page.getByTestId('event-participant-waitlist-table');
    await expect(waitlistTable).toContainText('coordinator@e2e.com');

    await page.getByTestId('event-participant-copy-button').click();
    await expect(page.getByTestId('event-participant-snackbar')).toContainText(
      translate('events.participants.copySuccess'),
    );
  });

  test('member sees member-only notes on a public event @member', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, publicEvent.slug);
    await page.goto(`/${rangeSlug}/events/${publicEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByTestId('event-detail-audience-chip')).toContainText(
      translate('events.detail.audience.public'),
    );
    await expect(page.getByTestId('event-detail-member-description')).toContainText(
      publicEvent.memberDescription,
    );
  });

  test('member can join the waitlist for a full event @member', async ({ page }) => {
    let signedUp = false;

    try {
      const detailResponsePromise = waitForEventDetails(page, rangeSlug, waitlistEvent.slug);
      await page.goto(`/${rangeSlug}/events/${waitlistEvent.slug}`);
      await detailResponsePromise;

      const signupButton = page.getByTestId('event-detail-signup-button');
      await expect(signupButton).toContainText(translate('events.detail.actions.signUp'));

      const signupResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/v1/ranges/${rangeSlug}/events/${waitlistEvent.slug}/signups`) &&
          response.request().method() === 'POST',
      );

      await signupButton.click();
      await expect(page.getByTestId('event-signup-dialog')).toBeVisible();
      await page.getByTestId('event-signup-confirm-button').click();
      await signupResponsePromise;
      signedUp = true;

      await expect(page.getByTestId('event-detail-signup-status')).toContainText(
        translate('events.detail.signup.waitlisted'),
      );

      const cancelResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/v1/ranges/${rangeSlug}/events/${waitlistEvent.slug}/signups/me`) &&
          response.request().method() === 'DELETE',
      );

      await signupButton.click();
      await cancelResponsePromise;
      signedUp = false;

      await expect(page.getByTestId('event-detail-signup-status')).toHaveCount(0);
    } finally {
      if (signedUp) {
        await page.request
          .delete(`/api/v1/ranges/${rangeSlug}/events/${waitlistEvent.slug}/signups/me`)
          .catch(() => {});
      }
    }
  });

  test('guest can sign up and cancel for a public event @guest', async ({ page }) => {
    let signedUp = false;

    try {
      const detailResponsePromise = waitForEventDetails(page, rangeSlug, publicEvent.slug);
      await page.goto(`/${rangeSlug}/events/${publicEvent.slug}`);
      await detailResponsePromise;

      await expect(page.getByTestId('event-detail-member-description')).toHaveCount(0);

      const signupButton = page.getByTestId('event-detail-signup-button');
      await expect(signupButton).toContainText(translate('events.detail.actions.signUp'));

      const signupResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/v1/ranges/${rangeSlug}/events/${publicEvent.slug}/signups`) &&
          response.request().method() === 'POST',
      );

      await signupButton.click();
      await expect(page.getByTestId('event-signup-dialog')).toBeVisible();
      await page.getByTestId('event-signup-confirm-button').click();
      await signupResponsePromise;
      signedUp = true;

      await expect(page.getByTestId('event-detail-signup-status')).toContainText(
        translate('events.detail.signup.confirmed'),
      );
      await expect(page.getByTestId('event-detail-snackbar')).toContainText(
        translate('events.detail.signup.success'),
      );

      const cancelResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/v1/ranges/${rangeSlug}/events/${publicEvent.slug}/signups/me`) &&
          response.request().method() === 'DELETE',
      );

      await signupButton.click();
      await cancelResponsePromise;
      signedUp = false;

      await expect(page.getByTestId('event-detail-signup-status')).toHaveCount(0);
      await expect(page.getByTestId('event-detail-snackbar')).toContainText(
        translate('events.detail.signup.cancelled'),
      );
    } finally {
      if (signedUp) {
        await page.request
          .delete(`/api/v1/ranges/${rangeSlug}/events/${publicEvent.slug}/signups/me`)
          .catch(() => {});
      }
    }
  });

  test('registration deadline closes signups @guest', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, closedRegistrationEvent.slug);
    await page.goto(`/${rangeSlug}/events/${closedRegistrationEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByTestId('event-detail-registration-chip')).toContainText(
      translate('events.detail.registration.closed'),
    );

    const signupButton = page.getByTestId('event-detail-signup-button');
    await expect(signupButton).toBeDisabled();
  });
});
