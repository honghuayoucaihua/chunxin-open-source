import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const topLevelDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {})
};

const platformLockedPackages = Object.keys(topLevelDeps).filter((name) =>
  /^@esbuild\/(?:android|darwin|freebsd|linux|netbsd|openbsd|sunos|win32)-/.test(name)
);

assert.deepEqual(
  platformLockedPackages,
  [],
  'package.json 顶层依赖不应直接声明平台限定的 esbuild 二进制包，否则 GitHub Actions 的 Linux runner 在 npm ci 阶段会直接失败'
);

console.log('测试通过：package.json 未直接声明平台限定的 esbuild 二进制包。');
