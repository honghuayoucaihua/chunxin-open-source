import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function collectSourceFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'dev-dist', 'tests'].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const commonPath = path.join(repoRoot, 'src', 'Common.tsx');
const commonSource = fs.readFileSync(commonPath, 'utf8');

assert.match(commonSource, /export const WeChatCell/, '兼容层中仍应保留 WeChatCell 定义');
assert.match(commonSource, /export const WeChatSwitch/, '兼容层中仍应保留 WeChatSwitch 定义');

const legacyUsageMatches = collectSourceFiles(repoRoot)
  .filter((filePath) => filePath !== commonPath)
  .flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const matches = source.match(/WeChatCell|WeChatSwitch|render-header-action/g);
    return matches ? [`${path.relative(repoRoot, filePath)} => ${matches.join(', ')}`] : [];
  });

assert.deepEqual(
  legacyUsageMatches,
  [],
  '业务源码中不应再直接依赖 WeChatCell、WeChatSwitch 或 render-header-action'
);
