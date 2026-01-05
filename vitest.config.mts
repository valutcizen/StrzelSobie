import { defineProject, defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

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
  'events',
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
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@strzel-sobie/common/models',
        replacement: path.join(rootDir, 'src', 'common', 'src', 'index.models.ts'),
      },
      {
        find: '@strzel-sobie/common',
        replacement: path.join(rootDir, 'src', 'common', 'src', 'index.ts'),
      },
      {
        find: /^@strzel-sobie\/(.*)$/,
        replacement: path.join(rootDir, 'src', '$1'),
      },
      {
        find: '@',
        replacement: path.join(rootDir, 'src', 'client', 'src'),
      },
    ],
  },
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
