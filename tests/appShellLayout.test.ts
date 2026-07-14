import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAppShellLayout } from '../src/app/shellLayout.ts';

{
  const layout = resolveAppShellLayout({
    isMobile: true,
    activeSubView: 'none',
    tabsPosition: 'bottom',
    isTelegramLayout: false,
    showStatusBar: false,
    reserveBottomInset: '44px'
  });

  assert.equal(layout.hasVisibleBottomTabs, true, '移动端主页底部标签栏应被视为可见');
  assert.equal(layout.safeContainerBottom, '0px', '底部标签栏可见时壳层不应再叠加系统导航底部预留');
  assert.equal(layout.tabbarSafeBottom, 'var(--safe-padding-bottom, 0px)', '底部标签栏内部应继续消费原生安全区');
  assert.equal(layout.tabbarBottomOffset, '44px', '底部标签栏应避开桌面系统导航');
  assert.equal(
    layout.tabScrollPaddingBottom,
    'calc(56px + var(--safe-padding-bottom, 0px) + 44px)',
    '主页滚动区应同时预留标签栏、安全区和桌面系统导航高度'
  );
}

{
  const layout = resolveAppShellLayout({
    isMobile: true,
    activeSubView: 'chat',
    tabsPosition: 'bottom',
    isTelegramLayout: false,
    showStatusBar: false,
    reserveBottomInset: '44px'
  });

  assert.equal(layout.hasVisibleBottomTabs, false, '进入消息页后底部标签栏不应继续占位');
  assert.equal(layout.safeContainerBottom, '44px', '无底部标签栏时壳层应承接桌面系统导航预留');
  assert.equal(layout.tabScrollPaddingBottom, '10px', '无底部标签栏时普通列表仅保留轻量底部呼吸空间');
}

{
  const layout = resolveAppShellLayout({
    isMobile: true,
    activeSubView: 'none',
    tabsPosition: 'top',
    isTelegramLayout: false,
    showStatusBar: true,
    reserveBottomInset: ''
  });

  assert.equal(layout.isTopTabs, true, '顶部标签栏布局应被识别');
  assert.equal(layout.hasVisibleBottomTabs, false, '顶部标签栏布局不应产生底部标签栏预留');
  assert.equal(layout.appSafeTopOffset, '0px', '显示桌面状态栏时页面头部不应再次叠加顶部安全区');
}

const chatsTabSource = readFileSync(new URL('../src/tabs/ChatsTab.tsx', import.meta.url), 'utf8');
const contactsTabSource = readFileSync(new URL('../src/tabs/ContactsTab.tsx', import.meta.url), 'utf8');
const discoverTabSource = readFileSync(new URL('../src/tabs/DiscoverTab.tsx', import.meta.url), 'utf8');
const meTabSource = readFileSync(new URL('../src/tabs/MeTab.tsx', import.meta.url), 'utf8');
const indexCssSource = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const appShellSource = readFileSync(new URL('../src/AppShell.tsx', import.meta.url), 'utf8');
const telegramMenuSource = readFileSync(new URL('../src/shell/TelegramNavigationMenu.tsx', import.meta.url), 'utf8');

for (const [name, source] of [
  ['消息列表', chatsTabSource],
  ['通讯录', contactsTabSource],
  ['发现', discoverTabSource],
  ['我', meTabSource]
] as const) {
  assert.doesNotMatch(source, /--tab-scroll-pb-top/, `${name} 不应再绕过统一底部滚动预留变量`);
  assert.match(source, /paddingBottom: 'var\(--tab-scroll-pb\)'/, `${name} 应消费统一底部滚动预留变量`);
}

assert.doesNotMatch(indexCssSource, /--tab-scroll-pb-top/, '全局样式不应继续保留 Y2K 专属底部滚动变量');
assert.match(indexCssSource, /--app-floating-tabbar-bottom-offset/, '浮动底栏皮肤应消费统一底栏位置变量');
assert.match(indexCssSource, /--app-chat-footer-bottom-inset/, '聊天 footer 皮肤样式应消费统一聊天底部安全区变量');
assert.match(appShellSource, /telegramMenuTopOffset/, 'Telegram 侧边菜单应复用顶部偏移变量');
assert.match(telegramMenuSource, /height:\s*isMobile \? '100%' : `calc\(100% - \$\{telegramMenuTopOffset\}\)`/, 'Telegram 侧边菜单高度应扣除顶部偏移，避免底部设置入口滚不出来');
assert.doesNotMatch(appShellSource, /<aside[^>]*h-full[^>]*top-\[calc\(32px\+var\(--safe-top,0px\)\)\]/, 'Telegram 侧边菜单不应再使用 top + h-full 组合');

console.log('测试通过：应用壳层布局语义已统一主页和消息页的底部预留。');
