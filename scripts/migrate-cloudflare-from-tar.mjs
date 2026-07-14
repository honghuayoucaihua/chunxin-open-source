import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , tarballArg, workDirArg = '.cloudflare-migrate', modeArg = 'both'] = process.argv;

if (!tarballArg) {
  console.error('Usage: node scripts/migrate-cloudflare-from-tar.mjs <data.tar.gz> [work-dir] [production|preview|both]');
  process.exit(1);
}

const repoRoot = process.cwd();
const tarballPath = path.resolve(tarballArg);
const workDir = path.resolve(workDirArg);
const extractDir = path.join(workDir, 'extract');
const exportDir = path.join(workDir, 'export');
const allowedModes = new Set(['production', 'preview', 'both']);
const targetMode = allowedModes.has(modeArg) ? modeArg : 'both';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const ensureCleanDir = async (dir) => {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
};

const main = async () => {
  await fs.mkdir(workDir, { recursive: true });
  await ensureCleanDir(extractDir);
  await ensureCleanDir(exportDir);

  run('tar', ['-xzf', tarballPath, '-C', extractDir]);

  const sqlitePath = path.join(extractDir, 'data', 'usage.db');
  const uploadsDir = path.join(extractDir, 'data', 'uploads');

  run('node', ['scripts/export-cloudflare-migration.mjs', sqlitePath, uploadsDir, exportDir]);

  const sqlPath = path.join(exportDir, 'migration.sql');
  const manifestPath = path.join(exportDir, 'r2-manifest.tsv');

  if (targetMode === 'production' || targetMode === 'both') {
    run('node', ['scripts/upload-cloudflare-r2-manifest.mjs', manifestPath, 'production']);
    run('node', ['scripts/run-cloudflare-d1-batch.mjs', sqlPath, 'production']);
  }

  if (targetMode === 'preview' || targetMode === 'both') {
    run('node', ['scripts/upload-cloudflare-r2-manifest.mjs', manifestPath, 'preview']);
    run('node', ['scripts/run-cloudflare-d1-batch.mjs', sqlPath, 'preview']);
  }

  console.log(`Migration completed. Export artifacts are in ${exportDir}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
