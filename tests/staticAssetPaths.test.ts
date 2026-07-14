import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import {
  APP_LOGO_COMPACT_SRC,
  APP_LOGO_SRC,
  APP_USER_AVATAR_SRC
} from '../src/services/staticAssetPaths.ts';

assert.equal(APP_LOGO_SRC, '/assets/image/logo.jpg', '原始 logo 路径应保持稳定，避免影响现有分享、启动图和图标入口');
assert.equal(APP_LOGO_COMPACT_SRC, '/assets/image/logo-128.jpg', '应新增轻量级 logo 资源供列表头像和加载态使用');
assert.equal(APP_USER_AVATAR_SRC, '/assets/image/user.png', '用户默认头像路径应集中管理');

const originalLogoPath = new URL('../public/assets/image/logo.jpg', import.meta.url);
const compactLogoPath = new URL('../public/assets/image/logo-128.jpg', import.meta.url);

assert.equal(existsSync(compactLogoPath), true, '轻量级 logo 文件应实际存在');
assert.ok(
  statSync(compactLogoPath).size < statSync(originalLogoPath).size,
  '轻量级 logo 文件体积应显著小于原图'
);

console.log('测试通过：公共静态资源路径和轻量级 logo 资源可用。');
