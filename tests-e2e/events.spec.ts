import { expect, test, request, type APIRequestContext, type Page } from '@playwright/test';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const meetupRangeSlug = 'meetup-e2e';
const apiBaseUrl = 'http://localhost:5173';

const storageStates = {
  admin: 'tests-e2e/.auth/admin.json',
  member: 'tests-e2e/.auth/member.json',
  guest: 'tests-e2e/.auth/guest.json',
  standardUser: 'tests-e2e/.auth/standard-user.json',
};

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

const publicLimitedEvent = {
  slug: 'e2e-public-limited-class',
  name: 'E2E Public Limited Class',
};

const noticeEvent = {
  slug: 'e2e-notice-only',
  name: 'E2E Notice Only',
};

const waitlistPromotionEvent = {
  slug: 'e2e-waitlist-promotion',
  name: 'E2E Waitlist Promotion',
};

const cancelTargetEvent = {
  slug: 'e2e-cancel-target',
  name: 'E2E Cancel Target',
};

const editTargetEvent = {
  slug: 'e2e-edit-target',
  name: 'E2E Edit Target',
  originalStart: '13:00',
  originalEnd: '14:00',
  updatedStart: '15:00',
  updatedEnd: '16:00',
};

const meetupEvent = {
  slug: 'e2e-meetup-hangout',
  name: 'E2E Meetup Hangout',
};

const membersMeetupEvent = {
  slug: 'e2e-members-meetup',
  name: 'E2E Members Meetup',
};

const waitForEventDetails = (page: Page, slug: string, eventSlug: string) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/ranges/${slug}/events/${eventSlug}`) &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

const createApiContext = (storageState: string) =>
  request.newContext({
    baseURL: apiBaseUrl,
    storageState,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });

const createSignup = (context: APIRequestContext, eventSlug: string, payload?: { guests?: number }) =>
  context.post(`/api/v1/ranges/${rangeSlug}/events/${eventSlug}/signups`, {
    data: payload ?? {},
  });

const deleteSignup = (context: APIRequestContext, eventSlug: string) =>
  context.delete(`/api/v1/ranges/${rangeSlug}/events/${eventSlug}/signups/me`);

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

  test('members-only meetup event is visible to members @member', async ({ page }) => {
    const eventsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/ranges/${meetupRangeSlug}/events`) &&
        response.request().method() === 'GET' &&
        response.status() === 200,
    );

    await page.goto(`/${meetupRangeSlug}`);
    await eventsResponsePromise;

    const eventItem = page
      .getByTestId('range-landing-event-item')
      .filter({ hasText: membersMeetupEvent.name })
      .first();

    await expect(eventItem).toBeVisible();
  });

  test('member can create a members-only meetup event via API @member', async () => {
    const memberContext = await createApiContext(storageStates.member);
    let createdSlug: string | null = null;

    try {
      const response = await memberContext.post(`/api/v1/ranges/${meetupRangeSlug}/events`, {
        data: {
          name: 'E2E Member Created Event',
          publicDescription: 'Member-created event for E2E coverage.',
          memberDescription: 'Members can bring guests.',
          eventDate: '2100-01-01',
          startTime: '10:00',
          endTime: '11:00',
          registrationType: 'registration_required',
          audience: 'members_only',
          capacityType: 'unlimited',
          guestPolicy: 'guests_allowed',
        },
      });

      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      expect(payload.audience).toBe('members_only');
      createdSlug = payload.slug;
    } finally {
      if (createdSlug) {
        await memberContext
          .delete(`/api/v1/ranges/${meetupRangeSlug}/events/${createdSlug}`)
          .catch(() => {});
      }
      await memberContext.dispose();
    }
  });

  test('members-only meetup event is hidden from guests @guest', async ({ page }) => {
    const eventsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/ranges/${meetupRangeSlug}/events`) &&
        response.request().method() === 'GET' &&
        response.status() === 200,
    );

    await page.goto(`/${meetupRangeSlug}`);
    await eventsResponsePromise;

    const eventItem = page
      .getByTestId('range-landing-event-item')
      .filter({ hasText: membersMeetupEvent.name });

    await expect(eventItem).toHaveCount(0);
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

  test('public limited event reaches capacity and starts waitlist @admin', async ({ page }) => {
    const memberContext = await createApiContext(storageStates.member);
    const guestContext = await createApiContext(storageStates.guest);
    const standardContext = await createApiContext(storageStates.standardUser);
    let memberSigned = false;
    let guestSigned = false;
    let standardSigned = false;

    try {
      const memberResponse = await createSignup(memberContext, publicLimitedEvent.slug);
      expect(memberResponse.ok()).toBeTruthy();
      const memberPayload = await memberResponse.json();
      expect(memberPayload.status).toBe('confirmed');
      memberSigned = true;

      const guestResponse = await createSignup(guestContext, publicLimitedEvent.slug);
      expect(guestResponse.ok()).toBeTruthy();
      const guestPayload = await guestResponse.json();
      expect(guestPayload.status).toBe('confirmed');
      guestSigned = true;

      const waitlistResponse = await createSignup(standardContext, publicLimitedEvent.slug);
      expect(waitlistResponse.ok()).toBeTruthy();
      const waitlistPayload = await waitlistResponse.json();
      expect(waitlistPayload.status).toBe('waitlisted');
      standardSigned = true;

      const adminDetailResponse = await page.request.get(
        `/api/v1/ranges/${rangeSlug}/events/${publicLimitedEvent.slug}`,
      );
      expect(adminDetailResponse.ok()).toBeTruthy();
      const adminDetails = await adminDetailResponse.json();
      expect(adminDetails.participants ?? []).toHaveLength(2);
      expect(adminDetails.waitlist ?? []).toHaveLength(1);
    } finally {
      if (standardSigned) {
        await deleteSignup(standardContext, publicLimitedEvent.slug).catch(() => {});
      }
      if (guestSigned) {
        await deleteSignup(guestContext, publicLimitedEvent.slug).catch(() => {});
      }
      if (memberSigned) {
        await deleteSignup(memberContext, publicLimitedEvent.slug).catch(() => {});
      }
      await Promise.all([memberContext.dispose(), guestContext.dispose(), standardContext.dispose()]);
    }
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

  test('member cannot see participant list for managed event @member', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, adminEvent.slug);
    await page.goto(`/${rangeSlug}/events/${adminEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByTestId('event-participant-list')).toHaveCount(0);
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

  test('member signup with guests can be updated @member', async ({ page }) => {
    const memberContext = await createApiContext(storageStates.member);
    const adminContext = await createApiContext(storageStates.admin);
    let signedUp = false;

    try {
      const detailResponsePromise = waitForEventDetails(page, meetupRangeSlug, membersMeetupEvent.slug);
      await page.goto(`/${meetupRangeSlug}/events/${membersMeetupEvent.slug}`);
      await detailResponsePromise;

      const signupButton = page.getByTestId('event-detail-signup-button');
      await signupButton.click();
      await expect(page.getByTestId('event-signup-dialog')).toBeVisible();

      await page.getByTestId('event-signup-guests-input').locator('input').fill('2');

      const signupResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/v1/ranges/${meetupRangeSlug}/events/${membersMeetupEvent.slug}/signups`) &&
          response.request().method() === 'POST',
      );

      await page.getByTestId('event-signup-confirm-button').click();
      await signupResponsePromise;
      signedUp = true;

      const updateResponse = await memberContext.patch(
        `/api/v1/ranges/${meetupRangeSlug}/events/${membersMeetupEvent.slug}/signups/me`,
        { data: { guests: 3 } },
      );
      expect(updateResponse.ok()).toBeTruthy();

      const adminDetailResponse = await adminContext.get(
        `/api/v1/ranges/${meetupRangeSlug}/events/${membersMeetupEvent.slug}`,
      );
      expect(adminDetailResponse.ok()).toBeTruthy();
      const adminDetails = await adminDetailResponse.json();
      const participant = (adminDetails.participants ?? []).find(
        (item: { email?: string }) => item.email === 'member@e2e.com',
      );
      expect(participant?.guests).toBe(3);
    } finally {
      if (signedUp) {
        await memberContext
          .delete(`/api/v1/ranges/${meetupRangeSlug}/events/${membersMeetupEvent.slug}/signups/me`)
          .catch(() => {});
      }
      await Promise.all([memberContext.dispose(), adminContext.dispose()]);
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

      const duplicateResponse = await page.request.post(
        `/api/v1/ranges/${rangeSlug}/events/${publicEvent.slug}/signups`,
        { data: {} },
      );
      expect(duplicateResponse.status()).toBe(409);

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

  test('waitlist promotion happens after cancellation @member', async ({ page }) => {
    const memberContext = await createApiContext(storageStates.member);
    const adminContext = await createApiContext(storageStates.admin);
    const guestContext = await createApiContext(storageStates.guest);

    try {
      const cancelResponse = await memberContext.delete(
        `/api/v1/ranges/${rangeSlug}/events/${waitlistPromotionEvent.slug}/signups/me`,
      );
      expect(cancelResponse.ok()).toBeTruthy();

      const adminDetailResponse = await adminContext.get(
        `/api/v1/ranges/${rangeSlug}/events/${waitlistPromotionEvent.slug}`,
      );
      expect(adminDetailResponse.ok()).toBeTruthy();
      const adminDetails = await adminDetailResponse.json();

      const promoted = (adminDetails.participants ?? []).some(
        (participant: { email?: string }) => participant.email === 'guest@e2e.com',
      );
      expect(promoted).toBeTruthy();
    } finally {
      await guestContext
        .delete(`/api/v1/ranges/${rangeSlug}/events/${waitlistPromotionEvent.slug}/signups/me`)
        .catch(() => {});
      await createSignup(memberContext, waitlistPromotionEvent.slug).catch(() => {});
      await createSignup(guestContext, waitlistPromotionEvent.slug).catch(() => {});
      await Promise.all([memberContext.dispose(), adminContext.dispose(), guestContext.dispose()]);
    }
  });

  test('notice event disables registration @guest', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, noticeEvent.slug);
    await page.goto(`/${rangeSlug}/events/${noticeEvent.slug}`);
    await detailResponsePromise;

    const signupButton = page.getByTestId('event-detail-signup-button');
    await expect(signupButton).toBeDisabled();
    await expect(page.getByTestId('event-detail-registration-chip')).toContainText(
      translate('events.detail.registration.closed'),
    );
  });

  test('registration deadline closes signups @guest', async ({ page }) => {
    const detailResponsePromise = waitForEventDetails(page, rangeSlug, closedRegistrationEvent.slug);
    await page.goto(`/${rangeSlug}/events/${closedRegistrationEvent.slug}`);
    await detailResponsePromise;

    await expect(page.getByText(translate('events.detail.registrationDeadline.none'))).toHaveCount(0);
    await expect(page.getByTestId('event-detail-registration-chip')).toContainText(
      translate('events.detail.registration.closed'),
    );

    const signupButton = page.getByTestId('event-detail-signup-button');
    await expect(signupButton).toBeDisabled();
  });

  test('organizer edits event schedule @admin', async ({ page }) => {
    try {
      const detailResponsePromise = waitForEventDetails(page, rangeSlug, editTargetEvent.slug);
      await page.goto(`/${rangeSlug}/events/${editTargetEvent.slug}`);
      await detailResponsePromise;

      await page.getByTestId('event-detail-edit-button').click();
      await expect(page).toHaveURL(`/admin/ranges/${rangeSlug}/events/${editTargetEvent.slug}/edit`);

      const startInput = page.getByTestId('event-form-start-time-input').locator('input');
      const endInput = page.getByTestId('event-form-end-time-input').locator('input');

      await startInput.evaluate((element, value) => {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, editTargetEvent.updatedStart);
      await expect(startInput).toHaveValue(editTargetEvent.updatedStart);

      await endInput.evaluate((element, value) => {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, editTargetEvent.updatedEnd);
      await expect(endInput).toHaveValue(editTargetEvent.updatedEnd);

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/ranges/${rangeSlug}/events/${editTargetEvent.slug}`) &&
          response.request().method() === 'PATCH',
      );

      await page.getByTestId('event-form-submit-button').click();
      await patchResponsePromise;

      const detailReloadPromise = waitForEventDetails(page, rangeSlug, editTargetEvent.slug);
      await detailReloadPromise;

      await expect(page.getByText(`${editTargetEvent.updatedStart} – ${editTargetEvent.updatedEnd}`)).toBeVisible();
    } finally {
      await page.request
        .patch(`/api/v1/ranges/${rangeSlug}/events/${editTargetEvent.slug}`, {
          data: { startTime: editTargetEvent.originalStart, endTime: editTargetEvent.originalEnd },
        })
        .catch(() => {});
    }
  });

  test('organizer can cancel an event and see the banner @admin', async ({ page }) => {
    try {
      const cancelResponse = await page.request.delete(
        `/api/v1/ranges/${rangeSlug}/events/${cancelTargetEvent.slug}`,
      );
      expect(cancelResponse.ok()).toBeTruthy();

      const detailResponsePromise = waitForEventDetails(page, rangeSlug, cancelTargetEvent.slug);
      await page.goto(`/${rangeSlug}/events/${cancelTargetEvent.slug}`);
      await detailResponsePromise;

      await expect(page.getByTestId('event-detail-cancelled-alert')).toBeVisible();
    } finally {
      await page.request
        .patch(`/api/v1/ranges/${rangeSlug}/events/${cancelTargetEvent.slug}`, {
          data: { status: 'active' },
        })
        .catch(() => {});
    }
  });
});
