import { readdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { D1Database, D1DatabaseAPI } from '@miniflare/d1';
import { createSQLiteDB } from '@miniflare/shared';
import type { IDatabase } from '@strzel-sobie/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const migrationsDir = join(projectRoot, 'migrations');
const mockDataDir = join(projectRoot, 'mock-data');

export type TestDatabase = {
  db: IDatabase;
  d1: D1Database;
  cleanup: () => void;
};

async function executeSqlFile(db: D1Database, filePath: string): Promise<void> {
  const sql = await readFile(filePath, 'utf-8');
  if (sql.trim().length === 0) {
    return;
  }
  await db.exec(sql);
}

export async function createTestDatabase(options: { includeMockData?: boolean } = {}): Promise<TestDatabase> {
  const includeMockData = options.includeMockData ?? true;
  const sqliteDb = await createSQLiteDB(':memory:');
  const d1 = new D1Database(new D1DatabaseAPI(sqliteDb));

  const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    await executeSqlFile(d1, filePath);
  }

  if (includeMockData) {
    try {
      const mockFiles = (await readdir(mockDataDir)).filter((file) => file.endsWith('.sql')).sort();
      for (const file of mockFiles) {
        const filePath = join(mockDataDir, file);
        await executeSqlFile(d1, filePath);
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return {
    db: d1 as unknown as IDatabase,
    d1,
    cleanup: () => {
      sqliteDb.close();
    },
  };
}
