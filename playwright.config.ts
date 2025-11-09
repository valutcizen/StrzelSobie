import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const escapeForRegExp = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const roleGrep = (role: string) => new RegExp(`@(?:all|${escapeForRegExp(role)})\\b`);
const globalSetupFile = fileURLToPath(new URL('./tests-e2e/globalSetup.ts', import.meta.url));

export default defineConfig({
  globalSetup: path.resolve(globalSetupFile),
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'setup', testMatch: /globalSetup\.ts/ },
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.unauthenticated.spec.ts',
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('admin'),
    },
    {
      name: 'coordinator',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/coordinator.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('coordinator'),
    },
    {
      name: 'member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/member.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('member'),
    },
    {
      name: 'guest',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/guest.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('guest'),
    },
    {
      name: 'confirmator',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/confirmator.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('confirmator'),
    },
    {
      name: 'range-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/range-admin.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('range-admin'),
    },
    {
      name: 'standard-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/standard-user.json',
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.unauthenticated.spec.ts',
      grep: roleGrep('standard-user'),
    },
  ],
});
