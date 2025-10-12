
import { readdir, rm } from 'fs/promises';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..'); // Assumes script is in 'scripts' subdir

const dbName = 'strzel-sobie-db';
const migrationsDir = join(projectRoot, 'migrations');
const wranglerStateDir = join(projectRoot, 'src', 'worker', '.wrangler', 'state');
const wranglerConfig = join(projectRoot, 'src', 'worker', 'wrangler.jsonc');
// --- End Configuration ---

async function main() {
  try {
    const shouldRegenerate = process.argv.includes('--regenerate');
    if (shouldRegenerate) {
      console.log('--- Regenerating DB mock ---');
      console.log(`Deleting old local database state in ${wranglerStateDir}...`);
      await rm(wranglerStateDir, { recursive: true, force: true });
      console.log('...Done. Database will be recreated from all migrations.');
    }

    console.log('--- Starting DB mock generation/update ---');

    // 1. Get all available migration files from the filesystem
    console.log('[1/4] Finding migration files...');
    const allFiles = await readdir(migrationsDir);
    const availableMigrations = allFiles
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (availableMigrations.length === 0) {
      console.log('No migration files found. Exiting.');
      return;
    }
    console.log(`Found ${availableMigrations.length} migration file(s):`);
    availableMigrations.forEach(file => console.log(`  - ${file}`));

    // 2. Get already applied migrations from the database
    console.log('[2/4] Checking for applied migrations in the database...');
    let appliedMigrations = [];
    try {
      const command = `wrangler d1 execute ${dbName} --local --config=${wranglerConfig} --command="SELECT migration_name FROM schema_migrations"`;
      // The output of a successful command is a JSON string like `[{"results":[{"migration_name":"0000_initial_schema.sql"}]}]`
      const result = execSync(command, { cwd: projectRoot, encoding: 'utf-8' });
      const parsedResult = JSON.parse(result);
      if (parsedResult && parsedResult[0] && parsedResult[0].results) {
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
      file => !appliedMigrations.includes(file)
    );

    if (migrationsToApply.length === 0) {
      console.log('No new migrations to apply. Database is up to date.');
      console.log('--- DB mock generation complete! ---');
      return;
    }

    console.log(`Found ${migrationsToApply.length} new migration(s) to apply:`);
    migrationsToApply.forEach(file => console.log(`  - ${file}`));

    // 4. Execute each new migration
    console.log('[4/4] Applying new migrations...');
    for (const file of migrationsToApply) {
      const filePath = join(migrationsDir, file);
      console.log(`Applying ${file}...`);
      const applyCommand = `wrangler d1 execute ${dbName} --local --file=${filePath} --config=${wranglerConfig}`;
      execSync(applyCommand, { stdio: 'inherit', cwd: projectRoot });

      console.log(`Recording ${file} in schema_migrations...`);
      const recordCommand = `wrangler d1 execute ${dbName} --local --config=${wranglerConfig} --command="INSERT INTO schema_migrations (migration_name) VALUES ('${file}')"`;
      execSync(recordCommand, { stdio: 'inherit', cwd: projectRoot });
    }

    console.log('--- DB mock generation complete! ---');
  } catch (error) {
    console.error('An error occurred during DB mock generation:', error);
    process.exit(1);
  }
}

main();
