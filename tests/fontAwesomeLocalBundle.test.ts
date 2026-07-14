import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const indexCss = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const viteConfig = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

assert.equal(
  packageJson.dependencies?.['@fortawesome/fontawesome-free'],
  '^6.4.0',
  '应将 Font Awesome 固定为项目依赖，避免每次打开页面重新走外部 CDN'
);

assert.doesNotMatch(
  indexHtml,
  /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i,
  'index.html 不应继续直接引用外部 Font Awesome CDN'
);

assert.match(
  indexCss,
  /@import '@fortawesome\/fontawesome-free\/css\/fontawesome\.min\.css';/,
  'index.css 应引入本地 Font Awesome 基础样式'
);

assert.match(
  indexCss,
  /@import '@fortawesome\/fontawesome-free\/css\/solid\.min\.css';/,
  'index.css 应引入本地 Font Awesome 实心图标样式'
);

assert.match(
  viteConfig,
  /globPatterns:\s*\['\*\*\/\*\.\{js,css,html,ico,svg,woff,woff2\}'\]/,
  'PWA 预缓存应继续覆盖 woff/woff2，确保本地图标字体可离线命中'
);

console.log('测试通过：Font Awesome 已切换为本地依赖并纳入静态缓存链路。');
