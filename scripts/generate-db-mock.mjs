import { readdir, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..'); // Assumes script is in 'scripts' subdir

const dbName = 'strzel-sobie-db';
const migrationsDir = join(projectRoot, 'migrations');
const mockDataDir = join(projectRoot, 'mock-data');
const workerDir = join(projectRoot, 'src', 'worker');
const wranglerDir = join(workerDir, '.wrangler');
const wranglerStateDir = join(wranglerDir, 'state');
const wranglerTmpDir = join(wranglerDir, 'tmp');
const wranglerConfig = join(workerDir, 'wrangler.jsonc');
const wranglerHomeDir = join(wranglerDir, 'home');
// --- End Configuration ---

const isWindows = process.platform === 'win32';
const wranglerBinaryCandidate = join(projectRoot, 'node_modules', '.bin', isWindows ? 'wrangler.cmd' : 'wrangler');
const wranglerBinary = existsSync(wranglerBinaryCandidate)
  ? wranglerBinaryCandidate
  : isWindows
    ? 'wrangler.cmd'
    : 'wrangler';

function runWrangler(args, { capture = false } = {}) {
  const result = spawnSync(wranglerBinary, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      WRANGLER_HOME: wranglerHomeDir,
      XDG_CONFIG_HOME: wranglerHomeDir,
    },
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf-8' : undefined,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : '';
    throw new Error(`wrangler ${args.join(' ')} exited with code ${result.status}\n${stderr}`);
  }

  return capture ? result.stdout : undefined;
}

function parseArgs(argv) {
  const parsed = {
    regenerate: false,
    seedFiles: [],
    includeMockData: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--regenerate') {
      parsed.regenerate = true;
    } else if (arg === '--no-mock-data') {
      parsed.includeMockData = false;
    } else if (arg === '--file' || arg === '--seed') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error(`Expected a path after "${arg}"`);
      }
      parsed.seedFiles.push(resolve(projectRoot, next));
      i += 1;
    }
  }

  return parsed;
}

async function main() {
  try {
    const { regenerate: shouldRegenerate, seedFiles: extraSeedFiles, includeMockData } = parseArgs(process.argv.slice(2));

    await mkdir(wranglerHomeDir, { recursive: true });
    await mkdir(wranglerStateDir, { recursive: true });

    for (const seedFile of extraSeedFiles) {
      if (!existsSync(seedFile)) {
        throw new Error(`Seed file not found: ${seedFile}`);
      }
    }

    if (shouldRegenerate) {
      console.log('--- Regenerating DB mock ---');
      console.log(`Deleting old local database state in ${wranglerStateDir}...`);
      await Promise.all([
        rm(wranglerStateDir, { recursive: true, force: true }),
        rm(wranglerTmpDir, { recursive: true, force: true }),
      ]);
      await mkdir(wranglerStateDir, { recursive: true });
      console.log('...Done. Database will be recreated from all migrations.');
    }

    console.log('--- Starting DB mock generation/update ---');

    // 1. Get all available migration files from the filesystem
    console.log('[1/4] Finding migration files...');
    const migrationFiles = (await readdir(migrationsDir)).map(file => ({ dir: migrationsDir, name: file }));
    let mockDataFiles = [];
    if (includeMockData) {
      try {
        mockDataFiles = (await readdir(mockDataDir)).map(file => ({ dir: mockDataDir, name: file }));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        console.log('No mock-data directory found, skipping.');
      }
    }

    const additionalSeedFiles = extraSeedFiles
      .map(filePath => ({ dir: dirname(filePath), name: basename(filePath), absolutePath: filePath }));

    const availableMigrations = [...migrationFiles, ...mockDataFiles]
      .filter(file => file.name.endsWith('.sql'))
      .map(file => ({
        ...file,
        absolutePath: join(file.dir, file.name),
      }))
      .concat(additionalSeedFiles)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (availableMigrations.length === 0) {
      console.log('No migration files found. Exiting.');
      return;
    }
    console.log(`Found ${availableMigrations.length} migration file(s):`);
    availableMigrations.forEach(file => console.log(`  - ${file.name}`));

    // 2. Get already applied migrations from the database
    console.log('[2/4] Checking for applied migrations in the database...');
    let appliedMigrations = [];
    try {
      const output = runWrangler(
        [
          'd1',
          'execute',
          dbName,
          '--local',
          '--config',
          wranglerConfig,
          '--command',
          'SELECT migration_name FROM schema_migrations',
          '--json',
        ],
        { capture: true }
      );

      const parsedResult = JSON.parse(output ?? '[]');
      if (parsedResult && Array.isArray(parsedResult) && parsedResult[0] && parsedResult[0].results) {
        appliedMigrations = parsedResult[0].results.map(row => row.migration_name);
      }
      console.log(`Found ${appliedMigrations.length} applied migration(s).`);
    } catch (e) {
      // This can fail if the table doesn't exist (fresh DB) or if the DB is not initialized.
      console.log('Could not retrieve applied migrations. Assuming fresh database.');
    }

    // 3. Determine which migrations to apply
    console.log('[3/4] Determining new migrations to apply...');
    const migrationsToApply = availableMigrations.filter(
      file => !appliedMigrations.includes(file.name)
    );

    if (migrationsToApply.length === 0) {
      console.log('No new migrations to apply. Database is up to date.');
      console.log('--- DB mock generation complete! ---');
      return;
    }

    console.log(`Found ${migrationsToApply.length} new migration(s) to apply:`);
    migrationsToApply.forEach(file => console.log(`  - ${file.name}`));

    // 4. Execute each new migration
    console.log('[4/4] Applying new migrations...');
    for (const file of migrationsToApply) {
      const filePath = file.absolutePath ?? join(file.dir, file.name);
      console.log(`Applying ${file.name}...`);

      runWrangler([
        'd1',
        'execute',
        dbName,
        '--local',
        '--config',
        wranglerConfig,
        '--file',
        filePath,
      ]);

      const sanitizedName = file.name.replace(/'/g, "''");
      console.log(`Recording ${file.name} in schema_migrations...`);
      runWrangler([
        'd1',
        'execute',
        dbName,
        '--local',
        '--config',
        wranglerConfig,
        '--command',
        `INSERT INTO schema_migrations (migration_name) VALUES ('${sanitizedName}')`,
      ]);
    }

    console.log('--- DB mock generation complete! ---');
  } catch (error) {
    console.error('An error occurred during DB mock generation:', error);
    process.exit(1);
  }
}

main();
