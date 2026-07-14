import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const indexCss = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const tailwindConfig = fs.readFileSync(new URL('../tailwind.config.cjs', import.meta.url), 'utf8');
const postcssConfig = fs.readFileSync(new URL('../postcss.config.cjs', import.meta.url), 'utf8');

assert.equal(typeof packageJson.devDependencies?.tailwindcss, 'string', '应在 devDependencies 中声明 tailwindcss');
assert.equal(typeof packageJson.devDependencies?.postcss, 'string', '应在 devDependencies 中声明 postcss');
assert.equal(typeof packageJson.devDependencies?.autoprefixer, 'string', '应在 devDependencies 中声明 autoprefixer');

assert.doesNotMatch(indexHtml, /cdn\.tailwindcss\.com/, 'index.html 不应继续使用 Tailwind CDN');
assert.doesNotMatch(indexHtml, /tailwind\.config\s*=/, 'index.html 不应继续内联 Tailwind 配置');

assert.match(indexCss, /@tailwind base;/, 'index.css 应引入 Tailwind base');
assert.match(indexCss, /@tailwind components;/, 'index.css 应引入 Tailwind components');
assert.match(indexCss, /@tailwind utilities;/, 'index.css 应引入 Tailwind utilities');

assert.match(tailwindConfig, /darkMode:\s*'class'/, 'Tailwind 配置应保持 class 模式暗色主题');
assert.match(tailwindConfig, /'\.\/index\.html'/, 'Tailwind 配置应扫描 index.html');
assert.match(tailwindConfig, /'\.\/src\/\*\*\/\*\.\{js,ts,jsx,tsx,html\}'/, 'Tailwind 配置应覆盖 src 目录下全部源码（含 admin、settings 等子模块），避免业务样式被裁掉');

assert.match(postcssConfig, /tailwindcss/, 'PostCSS 配置应启用 tailwindcss 插件');
assert.match(postcssConfig, /autoprefixer/, 'PostCSS 配置应启用 autoprefixer 插件');
