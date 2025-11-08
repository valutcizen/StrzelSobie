import { rmSync } from 'fs';
import { join } from 'path';
import { FullConfig, request } from '@playwright/test';
import type { CalendarEventsDto } from '@strzel-sobie/common';

const adminUser = {
  email: 'admin@e2e.com',
  password: 'adminpassword',
  storageState: 'tests-e2e/.auth/admin.json',
};

const coordinatorUser = {
  email: 'coordinator@e2e.com',
  password: 'coordinatorpassword',
  storageState: 'tests-e2e/.auth/coordinator.json',
};

const memberUser = {
  email: 'member@e2e.com',
  password: 'memberpassword',
  storageState: 'tests-e2e/.auth/member.json',
};

const guestUser = {
  email: 'guest@e2e.com',
  password: 'guestpassword',
  storageState: 'tests-e2e/.auth/guest.json',
};

const confirmatorUser = {
  email: 'confirmator@e2e.com',
  password: 'confirmatorpassword',
  storageState: 'tests-e2e/.auth/confirmator.json',
};

const rangeAdminUser = {
  email: 'rangeadmin@e2e.com',
  password: 'rangeadminpassword',
  storageState: 'tests-e2e/.auth/range-admin.json',
};

const standardUser = {
  email: 'standard-user@e2e.com',
  password: 'standardpassword',
  storageState: 'tests-e2e/.auth/standard-user.json',
};

const DEFAULT_RANGE_SLUG = 'dobczyce';
const ADMIN_CREDENTIALS = {
  email: adminUser.email,
  password: adminUser.password,
};
const SLOT_LOCK_ROOT = join(process.cwd(), 'tmp', 'e2e-slot-locks');

const formatDate = (date: Date) => date.toISOString().split('T')[0];

async function clearRangeEvents(baseURL: string, rangeSlug: string) {
  const context = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  try {
    const loginResponse = await context.post('/api/v1/auth/login', {
      data: ADMIN_CREDENTIALS,
    });
    if (!loginResponse.ok()) {
      throw new Error(
        `Failed to login for cleanup. Status: ${loginResponse.status()} ${loginResponse.statusText()}`,
      );
    }

    const startDate = formatDate(new Date(2000, 0, 1));
    const endDate = formatDate(new Date(2100, 11, 31));
    const query = new URLSearchParams({ startDate, endDate }).toString();
    const eventsResponse = await context.get(`/api/v1/ranges/${rangeSlug}/events?${query}`);

    if (!eventsResponse.ok()) {
      throw new Error(
        `Failed to fetch events for cleanup. Status: ${eventsResponse.status()} ${eventsResponse.statusText()}`,
      );
    }

    const events = (await eventsResponse.json()) as CalendarEventsDto;
    const deletionTasks: Promise<unknown>[] = [];

    for (const reservation of events.reservations ?? []) {
      deletionTasks.push(
        context.delete(`/api/v1/reservations/${reservation.id}`).catch((error) => {
          console.warn(`Failed to delete reservation ${reservation.id}`, error);
        }),
      );
    }

    for (const proposition of events.propositions ?? []) {
      deletionTasks.push(
        context.delete(`/api/v1/propositions/${proposition.id}`).catch((error) => {
          console.warn(`Failed to delete proposition ${proposition.id}`, error);
        }),
      );
    }

    await Promise.all(deletionTasks);
  } finally {
    await context.dispose();
  }
}

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const users = [adminUser, coordinatorUser, memberUser, guestUser, confirmatorUser, rangeAdminUser, standardUser];

  rmSync(SLOT_LOCK_ROOT, { recursive: true, force: true });
  await clearRangeEvents(baseURL ?? '', DEFAULT_RANGE_SLUG);

  for (const user of users) {
    const requestContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    try {
      console.log(`Creating storage state for ${user.email}`);
      const response = await requestContext.post('/api/v1/auth/login', {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      if (!response.ok()) {
        throw new Error(`Failed to login as ${user.email}. Status: ${response.status()} ${response.statusText()}`);
      }

      await requestContext.storageState({ path: user.storageState });
      console.log(`Saved storage state for ${user.email}`);
    } catch (error) {
      console.error(`Failed to create storage state for ${user.email}`, error);
      throw error;
    } finally {
      await requestContext.dispose();
    }
  }
}

export default globalSetup;
