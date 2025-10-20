import { defineProject, defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const includePatterns = ['**/*.test.ts', '**/*.spec.ts', '**/*.tests.ts'];

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const projects = [
  'audit',
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
      dir: path.join(rootDir, 'tests', name),
      include: includePatterns,
    },
  }),
);

export default defineConfig({
  root: rootDir,
  test: {
    include: includePatterns,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
    },
  },
  projects,
});
