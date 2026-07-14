import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const primitiveSource = fs.readFileSync(new URL('../src/utils/DropdownPrimitives.tsx', import.meta.url), 'utf8');
const officialSource = fs.readFileSync(new URL('../src/official/OfficialAccountSubPages.tsx', import.meta.url), 'utf8');
const forumDetailSource = fs.readFileSync(new URL('../src/forum/ForumDetailView.tsx', import.meta.url), 'utf8');
const forumListSource = fs.readFileSync(new URL('../src/forum/ForumListView.tsx', import.meta.url), 'utf8');
const forumIdentitySource = fs.readFileSync(new URL('../src/forum/ForumIdentityMenu.tsx', import.meta.url), 'utf8');
const chatMenuSource = fs.readFileSync(new URL('../src/shell/PlusMenu.tsx', import.meta.url), 'utf8');
const messageMenuSource = fs.readFileSync(new URL('../src/chatroom/ChatRoomMessageList.tsx', import.meta.url), 'utf8');
const auxPanelSource = fs.readFileSync(new URL('../src/chatroom/ChatRoomAuxPanels.tsx', import.meta.url), 'utf8');
const momentCardSource = fs.readFileSync(new URL('../src/moments/MomentCard.tsx', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

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

assert.match(primitiveSource, /DropdownMenu/, '需要提供统一下拉菜单 primitive');
assert.match(primitiveSource, /DropdownItem/, '需要提供统一下拉菜单项 primitive');
assert.match(primitiveSource, /DropdownLabel/, '需要提供统一下拉菜单分组标题 primitive');
assert.match(cssSource, /\.app-dropdown-menu/, '样式层需要提供统一下拉菜单样式');
assert.match(cssSource, /\.app-dropdown-item/, '样式层需要提供统一下拉菜单项样式');
assert.match(cssSource, /\.app-dropdown-item--danger/, '样式层需要提供统一下拉危险项样式');
assert.match(cssSource, /\.app-dropdown-label/, '样式层需要提供统一下拉菜单分组标题样式');
assert.match(cssSource, /\.app-dropdown-arrow/, '样式层需要提供统一下拉菜单箭头样式');
assert.match(cssSource, /\.app-dropdown-menu\.absolute\s*\{\s*position:\s*absolute;/, '统一下拉菜单在带有 absolute 类时应保持绝对定位');
assert.match(cssSource, /\.app-dropdown-menu\.fixed\s*\{\s*position:\s*fixed;/, '统一下拉菜单在带有 fixed 类时应保持固定定位');
assert.match(officialSource, /DropdownMenu/, '订阅号菜单应接入统一下拉菜单 primitive');
assert.match(forumDetailSource, /DropdownMenu/, '论坛详情菜单应接入统一下拉菜单 primitive');
assert.match(forumListSource, /DropdownMenu/, '论坛列表动作菜单应接入统一下拉菜单 primitive');
assert.match(forumIdentitySource, /DropdownMenu/, '论坛身份菜单应接入统一下拉菜单 primitive');
assert.match(forumIdentitySource, /DropdownLabel/, '论坛身份菜单分组标题应接入统一下拉菜单分组标题 primitive');
assert.match(chatMenuSource, /DropdownMenu/, '聊天加号菜单应接入统一下拉菜单 primitive');
assert.match(messageMenuSource, /DropdownMenu/, '消息长按菜单应接入统一下拉菜单 primitive');
assert.match(momentCardSource, /DropdownMenu/, '朋友圈卡片动作菜单应接入统一下拉菜单 primitive');
assert.doesNotMatch(auxPanelSource, /app-menu-item/, '聊天辅助面板动作行不应继续误用菜单项样式');
assert.match(auxPanelSource, /app-list-item/, '聊天辅助面板动作行应改回列表项语义');
assert.doesNotMatch(officialSource, /app-menu-item|app-menu\b/, '订阅号菜单不应继续直接依赖旧菜单类');
assert.doesNotMatch(forumDetailSource, /app-menu-item|app-menu-label/, '论坛详情菜单不应继续直接依赖旧菜单项类');
assert.doesNotMatch(forumListSource, /app-menu-item|app-menu\b/, '论坛列表动作菜单不应继续直接依赖旧菜单类');
assert.doesNotMatch(forumIdentitySource, /app-menu-label/, '论坛身份菜单分组标题不应继续直接依赖旧菜单标题类');
assert.doesNotMatch(chatMenuSource, /app-menu\b/, '聊天加号菜单不应继续直接依赖旧菜单类');
assert.doesNotMatch(messageMenuSource, /app-menu-item|app-menu-grid|app-menu-arrow/, '消息长按菜单不应继续直接依赖旧菜单项、旧网格类和旧箭头类');
assert.doesNotMatch(momentCardSource, /app-menu-item|app-menu\b/, '朋友圈卡片动作菜单不应继续直接依赖旧菜单类');

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const legacyMenuMatches = collectSourceFiles(repoRoot)
  .map((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const matches = source.match(/app-menu-item|app-menu-label|app-menu-grid|app-menu-arrow/g);
    return matches ? `${path.relative(repoRoot, filePath)} => ${matches.join(', ')}` : null;
  })
  .filter(Boolean);

assert.deepEqual(legacyMenuMatches, [], '业务源码中不应再直接使用旧菜单结构类');
