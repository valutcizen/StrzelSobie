import { defineProject, defineConfig } from 'vitest/config';

const projects = [
  'ranges',
  'auth',
  'common',
  'notifications',
  'reservations',
  'users',
  'worker',
].map((name) =>
  defineProject({
    test: {
      name,
      dir: `tests/${name}`,
    },
  }),
);

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
    },
  },
  projects,
});
