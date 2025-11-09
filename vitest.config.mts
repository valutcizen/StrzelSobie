import { defineProject, defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const includePatterns = ['**/*.test.ts', '**/*.spec.ts', '**/*.tests.ts'];
const customExcludePatterns = ['tests-e2e/**'];
const testExcludePatterns = [...configDefaults.exclude, ...customExcludePatterns];
const coverageExcludePatterns = [
  ...(configDefaults.coverage?.exclude ?? []),
  'src/client/**',
  '**/index.ts',
  ...customExcludePatterns,
];

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
      exclude: testExcludePatterns,
    },
  }),
);

export default defineConfig({
  root: rootDir,
  test: {
    include: includePatterns,
    exclude: testExcludePatterns,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
      exclude: coverageExcludePatterns,
    },
  },
  projects,
});
