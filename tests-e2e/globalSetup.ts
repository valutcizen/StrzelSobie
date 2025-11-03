import { execFileSync } from 'child_process';
import * as path from 'path';

async function globalSetup() {
  const dbMockScript = path.resolve(__dirname, '../scripts/generate-db-mock.mjs');
  const e2eMockData = path.resolve(__dirname, './e2e-mock-data.sql');

  execFileSync('node', [dbMockScript, '--regenerate', '--file', e2eMockData], {
    stdio: 'inherit',
  });
}

export default globalSetup;
