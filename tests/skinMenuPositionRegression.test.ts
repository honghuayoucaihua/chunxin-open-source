import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'src', 'index.css');
const css = fs.readFileSync(cssPath, 'utf8');

const skinBlocks = Array.from(css.matchAll(/\[data-render-skin='([^']+)'\][^{]*\{[\s\S]*?\}/g));
const riskyBlocks = skinBlocks
  .filter((match) => (
    /(?:^|[\s,])\.(?:render-msg-menu|app-plus-menu)(?:[\s,{]|$)/.test(match[0])
    && !/::(?:before|after)/.test(match[0])
    && /position\s*:/.test(match[0])
  ))
  .map((match) => `${match[1]} => ${match[0].replace(/\s+/g, ' ').slice(0, 160)}`);

assert.deepEqual(
  riskyBlocks,
  [],
  '任何皮肤都不应覆盖消息菜单或加号菜单浮层的定位属性'
);

console.log('测试通过：各皮肤未覆盖消息菜单和加号菜单的浮层定位。');
