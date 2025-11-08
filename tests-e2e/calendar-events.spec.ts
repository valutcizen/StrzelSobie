import { expect, test, request, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { claimSlot, type SlotCandidate } from './support/calendar-slots';
import { translate } from './support/i18n';

const rangeSlug = 'dobczyce';
const apiBaseUrl = 'http://localhost:5173';
const calendarPath = `/${rangeSlug}/reservations`;

const slotSeed = (testInfo: TestInfo, label: string) => `${testInfo.project.name}:${testInfo.title}:${label}`;

const waitForCalendarEvents = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/ranges/${rangeSlug}/events`) &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

const scrollCalendarToSlot = async (page: Page, slot: SlotCandidate | null) => {
  if (!slot) {
    return;
  }

  const [hoursRaw, minutesRaw] = slot.startTime.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const slotPositionHours = Number.isFinite(hours) ? hours + (Number.isFinite(minutes) ? minutes / 60 : 0) : 0;
  const pixelsPerHour = 44;
  const scrollTop = Math.max(0, (slotPositionHours - 2) * pixelsPerHour);

  const scroller = page.locator('.fc-scroller').first();
  await scroller.waitFor({ state: 'visible' });
  await scroller.evaluate((element, top) => {
    element.scrollTop = top;
  }, scrollTop);
};

const createProposition = async (context: APIRequestContext, slot: SlotCandidate) => {
  const response = await context.post(`${apiBaseUrl}/api/v1/ranges/${rangeSlug}/propositions`, {
    data: {
      eventDate: slot.eventDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      numParticipants: 2,
      tracksRequested: 1,
    },
  });

  if (!response.ok()) {
    return null;
  }

  const payload = await response.json();
  return typeof payload.id === 'number' ? payload.id : null;
};

const createReservation = async (
  context: APIRequestContext,
  slot: SlotCandidate,
  options?: { isPublic?: boolean; isJoinable?: boolean; numParticipants?: number; tracksRequested?: number },
) => {
  const payload = {
    eventDate: slot.eventDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    numParticipants: options?.numParticipants ?? 3,
    tracksRequested: options?.tracksRequested ?? 2,
    isPublic: options?.isPublic ?? false,
    isJoinable: options?.isJoinable ?? false,
  };

  let response = await context.post(`${apiBaseUrl}/api/v1/ranges/${rangeSlug}/reservations`, { data: payload });

  if (!response.ok()) {
    if (response.status() === 400) {
      const raw = await response.text();
      try {
        const errorBody = JSON.parse(raw);
        if (errorBody?.code === 'reservation_force_required') {
          response = await context.post(`${apiBaseUrl}/api/v1/ranges/${rangeSlug}/reservations?force=true`, {
            data: payload,
          });
        } else {
          return null;
        }
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  if (!response.ok()) {
    return null;
  }

  const created = await response.json();
  return typeof created.id === 'number' ? created.id : null;
};

test.describe('Calendar Events', () => {
  test('displays freshly created propositions and reservations @member', async ({ page }, testInfo: TestInfo) => {

    const memberContext = await request.newContext({
      baseURL: apiBaseUrl,
      storageState: 'tests-e2e/.auth/member.json',
    });
    const coordinatorContext = await request.newContext({
      baseURL: apiBaseUrl,
      storageState: 'tests-e2e/.auth/coordinator.json',
    });

    let propositionId: number | null = null;
    let propositionSlot: SlotCandidate | null = null;
    let releasePropositionSlot: (() => void) | null = null;
    let reservationId: number | null = null;
    let reservationSlot: SlotCandidate | null = null;
    let releaseReservationSlot: (() => void) | null = null;

    try {
      const propositionClaim = claimSlot(slotSeed(testInfo, 'proposition'));
      propositionSlot = propositionClaim.slot;
      releasePropositionSlot = propositionClaim.release;
      propositionId = await createProposition(memberContext, propositionSlot);
      if (typeof propositionId !== 'number') {
        throw new Error('Failed to create proposition for calendar test.');
      }

      const reservationClaim = claimSlot(slotSeed(testInfo, 'reservation'));
      reservationSlot = reservationClaim.slot;
      releaseReservationSlot = reservationClaim.release;
      reservationId = await createReservation(coordinatorContext, reservationSlot);
      if (typeof reservationId !== 'number') {
        throw new Error('Failed to create reservation for calendar test.');
      }

      const eventsResponsePromise = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      const eventsResponse = await eventsResponsePromise;
      expect(eventsResponse.ok()).toBeTruthy();

      const payload = await eventsResponse.json();
      expect((payload.propositions ?? []).some((event: { id: number }) => event.id === propositionId)).toBeTruthy();
      expect((payload.reservations ?? []).some((event: { id: number }) => event.id === reservationId)).toBeTruthy();

      await scrollCalendarToSlot(page, propositionSlot);
      const propositionLocator = page.locator(`[data-event-id="proposition-${propositionId}"]`).first();
      await expect(propositionLocator).toHaveCount(1, { timeout: 15000 });
      await propositionLocator.scrollIntoViewIfNeeded();
      await expect(propositionLocator).toBeVisible();

      await scrollCalendarToSlot(page, reservationSlot);
      const reservationLocator = page.locator(`[data-event-id="reservation-${reservationId}"]`).first();
      await expect(reservationLocator).toHaveCount(1, { timeout: 15000 });
      await reservationLocator.scrollIntoViewIfNeeded();
      await expect(reservationLocator).toBeVisible();
    } finally {
      if (propositionId !== null) {
        await memberContext.delete(`/api/v1/propositions/${propositionId}`).catch(() => {});
      }
      if (reservationId !== null) {
        await coordinatorContext.delete(`/api/v1/reservations/${reservationId}`).catch(() => {});
      }
      releasePropositionSlot?.();
      releaseReservationSlot?.();
      await Promise.all([memberContext.dispose(), coordinatorContext.dispose()]);
    }
  });

  test('allows a coordinator to open an event and read reservation details @coordinator', async ({ page }, testInfo) => {

    let reservationId: number | null = null;
    let reservationSlot: SlotCandidate | null = null;
    let releaseReservationSlot: (() => void) | null = null;

    try {
      const reservationClaim = claimSlot(slotSeed(testInfo, 'details'));
      reservationSlot = reservationClaim.slot;
      releaseReservationSlot = reservationClaim.release;
      reservationId = await createReservation(page.request, reservationSlot, { numParticipants: 4, tracksRequested: 3 });
      if (typeof reservationId !== 'number') {
        throw new Error('Failed to create reservation for coordinator detail test.');
      }

      const eventsResponsePromise = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await eventsResponsePromise;

      await scrollCalendarToSlot(page, reservationSlot);
      const eventLocator = page.locator(`[data-event-id="reservation-${reservationId}"]`).first();
      await expect(eventLocator).toHaveCount(1, { timeout: 15000 });
      await eventLocator.scrollIntoViewIfNeeded();

      const detailResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/reservations/${reservationId}`) &&
          response.request().method() === 'GET' &&
          response.status() === 200,
      );

      await eventLocator.click();
      await detailResponsePromise;

      const dialog = page.getByTestId('event-detail-dialog');
      await expect(dialog).toBeVisible();

      await expect(dialog.getByTestId('event-detail-reservation-section')).toBeVisible();

      const tracksSummary = translate('calendar.eventDetail.summary.tracks', { count: 3 });
      const participantsSummary = translate('calendar.eventDetail.summary.participants', { count: 4 });
      await expect(dialog.getByText(tracksSummary)).toBeVisible();
      await expect(dialog.getByText(participantsSummary)).toBeVisible();

      await dialog.getByTestId('event-detail-close-button').click();
      await expect(dialog).toBeHidden();
    } finally {
      if (reservationId !== null) {
        await page.request.delete(`/api/v1/reservations/${reservationId}`).catch(() => {});
      }
      releaseReservationSlot?.();
    }
  });

  test('shows a visual indicator for joinable reservations to members @member', async ({ page }, testInfo) => {

    const coordinatorContext = await request.newContext({
      baseURL: apiBaseUrl,
      storageState: 'tests-e2e/.auth/coordinator.json',
    });

    let reservationId: number | null = null;
    let reservationSlot: SlotCandidate | null = null;
    let releaseReservationSlot: (() => void) | null = null;

    try {
      const reservationClaim = claimSlot(slotSeed(testInfo, 'joinable'));
      reservationSlot = reservationClaim.slot;
      releaseReservationSlot = reservationClaim.release;
      reservationId = await createReservation(coordinatorContext, reservationSlot, { isJoinable: true });
      if (typeof reservationId !== 'number') {
        throw new Error('Failed to create joinable reservation for calendar test.');
      }

      const eventsResponsePromise = waitForCalendarEvents(page);
      await page.goto(calendarPath);
      await eventsResponsePromise;

      await scrollCalendarToSlot(page, reservationSlot);
      const reservationLocator = page.locator(`[data-event-id="reservation-${reservationId}"]`).first();
      await expect(reservationLocator).toHaveCount(1, { timeout: 15000 });
      await reservationLocator.scrollIntoViewIfNeeded();
      await expect(reservationLocator).toBeVisible();
      await expect(reservationLocator).toHaveClass(/event-joinable/);
    } finally {
      if (reservationId !== null) {
        await coordinatorContext.delete(`/api/v1/reservations/${reservationId}`).catch(() => {});
      }
      releaseReservationSlot?.();
      await coordinatorContext.dispose();
    }
  });
});
