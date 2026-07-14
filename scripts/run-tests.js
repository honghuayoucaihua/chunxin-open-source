import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const testsDir = join(process.cwd(), 'tests');
const browserStorageSetup = pathToFileURL(join(testsDir, 'helpers', 'browserStorageSetup.mjs')).href;
const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort();

for (const file of testFiles) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--import', browserStorageSetup, join(testsDir, file)],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`测试通过：已运行 ${testFiles.length} 个测试文件。`);
