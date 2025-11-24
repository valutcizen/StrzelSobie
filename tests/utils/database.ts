import { readdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { IDatabase, IDbStatement } from '@strzel-sobie/common/models';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..', '..');
const migrationsDir = join(projectRoot, 'migrations');
const mockDataDir = join(projectRoot, 'mock-data');

type BetterSqliteStatement = {
  get: (...values: unknown[]) => any;
  all: (...values: unknown[]) => any[];
  run: (...values: unknown[]) => any;
};

type BetterSqliteInstance = {
  prepare: (sql: string) => BetterSqliteStatement;
  exec: (sql: string) => void;
  close: () => void;
  pragma: (query: string) => unknown;
};

class SqliteStatement implements IDbStatement {
  private boundValues: unknown[] = [];

  constructor(private readonly statement: BetterSqliteStatement) {}

  bind(...values: unknown[]): this {
    this.boundValues = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const row = this.statement.get(...this.boundValues) as T | undefined;
    this.boundValues = [];
    return row ?? null;
  }

  async run(): Promise<any> {
    const result = this.statement.run(...this.boundValues);
    this.boundValues = [];
    return result;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rows = this.statement.all(...this.boundValues) as T[];
    this.boundValues = [];
    return { results: rows };
  }
}

class SqliteDatabaseAdapter implements IDatabase {
  constructor(private readonly db: BetterSqliteInstance) {}

  prepare(query: string): IDbStatement {
    return new SqliteStatement(this.db.prepare(query));
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}

export type TestDatabase = {
  db: IDatabase;
  d1: SqliteDatabaseAdapter;
  cleanup: () => void;
};

async function executeSqlFile(db: SqliteDatabaseAdapter, filePath: string): Promise<void> {
  const sql = await readFile(filePath, 'utf-8');
  if (sql.trim().length === 0) {
    return;
  }
  db.exec(sql);
}

export async function createTestDatabase(options: { includeMockData?: boolean } = {}): Promise<TestDatabase> {
  const includeMockData = options.includeMockData ?? true;
  const sqliteDb = new Database(':memory:');
  sqliteDb.pragma('foreign_keys = ON');
  const adapter = new SqliteDatabaseAdapter(sqliteDb);

  const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    await executeSqlFile(adapter, filePath);
  }

  if (includeMockData) {
    try {
  const mockFiles = (await readdir(mockDataDir)).filter((file) => file.endsWith('.sql')).sort();
      for (const file of mockFiles) {
        const filePath = join(mockDataDir, file);
        await executeSqlFile(adapter, filePath);
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return {
    db: adapter,
    d1: adapter,
    cleanup: () => {
      adapter.close();
    },
  };
}
