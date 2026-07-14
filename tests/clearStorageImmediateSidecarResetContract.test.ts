import assert from 'node:assert/strict';
import { createDefaultDivinationDraft } from '../src/services/divinationService.ts';

const originalSetTimeout = globalThis.setTimeout;
const scheduledTasks: Array<() => void> = [];

(globalThis as any).Audio = class {
  paused = true;
  currentTime = 0;
  duration = 0;
  src = '';
  preload = 'auto';
  play = async () => {
    this.paused = false;
  };
  pause = () => {
    this.paused = true;
  };
  addEventListener = () => {};
  removeEventListener = () => {};
};
(globalThis as any).setTimeout = ((callback: (...args: any[]) => void) => {
  scheduledTasks.push(() => callback());
  return scheduledTasks.length as any;
}) as typeof setTimeout;
(globalThis as any).localStorage = {
  clear: () => {},
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
(globalThis as any).sessionStorage = {
  clear: () => {}
};
(globalThis as any).indexedDB = {
  databases: undefined,
  deleteDatabase: () => {
    const request: any = {};
    queueMicrotask(() => {
      request.onsuccess?.();
    });
    return request;
  }
};
(globalThis as any).caches = {
  keys: async () => [],
  delete: async () => true
};
Object.defineProperty(globalThis, 'navigator', {
  value: {
    serviceWorker: {
      getRegistrations: async () => []
    }
  },
  configurable: true
});
(globalThis as any).window = globalThis;
(globalThis as any).window.setTimeout = (globalThis as any).setTimeout;
(globalThis as any).window.clearTimeout = (() => {}) as typeof clearTimeout;

const { runClearStorageFlow } = await import('../src/app/clearDataFlow.ts');

(globalThis as any).window.customEmojis = [{ id: 'custom-old', url: 'data:image/png;base64,OLD', desc: '旧表情' }];
(globalThis as any).window.emojiGroups = [{ id: 'group-old', name: '旧分组', folder: 'old', enabled: true, isBuiltIn: false, order: 0 }];
(globalThis as any).window.allGroupEmojis = {
  'group-old': [{ id: 'group-old-1', url: 'data:image/png;base64,OLDGROUP', desc: '旧分组表情', groupId: 'group-old' }]
};
(globalThis as any).window.hiddenEmojiIds = ['hidden-old'];
(globalThis as any).window.customEmojiOrder = ['custom-old'];
(globalThis as any).window.allEnabledEmojis = [{ id: 'custom-old', url: 'data:image/png;base64,OLD', desc: '旧表情' }];
(globalThis as any).window.selectedContacts = ['contact-old'];
(globalThis as any).window.currentArticle = { id: 'article-old', title: '旧文章' };
(globalThis as any).window.newStickers = [{ url: 'data:image/png;base64,STICKER', desc: '旧贴纸' }];
(globalThis as any).window.imageLibraryGroups = [{ id: 'img-group-old', name: '旧相册', order: 0, createdAt: 1, updatedAt: 1 }];
(globalThis as any).window.imageLibraryItems = [{ id: 'img-item-old', groupId: 'img-group-old', url: 'data:image/png;base64,IMG', desc: '旧图片', createdAt: 1 }];
(globalThis as any).window.groupEmojis_group_old = [{ id: 'legacy-cache' }];
(globalThis as any).window.__xushuoRuntimeResetEpoch = 7;

let selectedContactId: string | null = 'contact-old';
let activeSubView: string = 'emojiGroups';
let subViewStack: string[] = ['none', 'emojiGroups'];
let stateLoaded = true;
const toasts: string[] = [];
const reloadCalls: number[] = [];

const waitForCondition = async (predicate: () => boolean, rounds: number = 40): Promise<void> => {
  for (let index = 0; index < rounds; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.ok(predicate(), '等待清空成功分支生效超时');
};

runClearStorageFlow({
  openConfirm: (_message: string, onConfirm: () => void) => onConfirm(),
  openAlert: () => {
    throw new Error('本测试不应走失败分支');
  },
  forceReloadApp: () => {
    reloadCalls.push(Date.now());
  },
  setContacts: () => {},
  setUser: () => {},
  setWalletBalance: () => {},
  setMessages: () => {},
  setMoments: () => {},
  setFavorites: () => {},
  setSettings: () => {},
  setAiSettings: () => {},
  normalizeAiSettings: (value: any) => value,
  normalizeSoundVibrationSettings: (value?: any) => value || {},
  setWorldBooks: () => {},
  setMasks: () => {},
  setHtmlTemplates: () => {},
  setBubbleTemplates: () => {},
  setForums: () => {},
  setSoundVibrationSettings: () => {},
  setContactMemories: () => {},
  setOfficialArticles: () => {},
  setFriendRequests: () => {},
  setDiscoverUnreadCount: () => {},
  setInboxLetters: () => {},
  setSentLetters: () => {},
  setSelectedMailboxLetter: () => {},
  setMailboxTheme: () => {},
  setAnonymousChatSettings: () => {},
  setAnonymousHistory: () => {},
  setAnonymousHasUnfinishedSession: () => {},
  setAnonymousUnfinishedSession: () => {},
  setAnonymousSessionActive: () => {},
  setAnonymousPartner: () => {},
  setAnonymousSessionStartedAt: () => {},
  setAnonymousPeerLeft: () => {},
  setAnonymousInputValue: () => {},
  setAnonymousViewingHistoryId: () => {},
  setAnonymousIsMatching: () => {},
  setDivinationDraft: (value: any) => {
    const draft = createDefaultDivinationDraft();
    return typeof value === 'function' ? value(draft) : value;
  },
  setDivinationHistory: () => {},
  setCurrentDivinationRecord: () => {},
  setDivinationSubmitting: () => {},
  setHasAgreedTerms: () => {},
  setWalletBank: () => {},
  setMusicState: () => {},
  setSelectedContactId: (value: any) => {
    selectedContactId = typeof value === 'function' ? value(selectedContactId) : value;
  },
  setActiveSubView: (value: any) => {
    activeSubView = typeof value === 'function' ? value(activeSubView) : value;
  },
  setSubViewStack: (value: any) => {
    subViewStack = typeof value === 'function' ? value(subViewStack) : value;
  },
  setIsStateLoaded: (value: any) => {
    stateLoaded = typeof value === 'function' ? value(stateLoaded) : value;
  },
  showToast: (message: string) => {
    toasts.push(message);
  }
});

await waitForCondition(() => stateLoaded === false);

assert.equal(stateLoaded, false, '清空成功后应立刻关闭自动落盘');
assert.equal(selectedContactId, null, '清空成功后应立刻卸载当前会话，避免表情等子模块继续写回');
assert.equal(activeSubView, 'none', '清空成功后应立刻退出工具子页，避免旁路模块继续驻留');
assert.deepEqual(subViewStack, ['none'], '清空成功后应立刻重置子视图栈');
assert.deepEqual((window as any).customEmojis, [], '清空成功后应立刻清空运行时自定义表情');
assert.deepEqual((window as any).emojiGroups, [], '清空成功后应立刻清空运行时表情分组');
assert.deepEqual((window as any).allGroupEmojis, {}, '清空成功后应立刻清空运行时分组表情映射');
assert.deepEqual((window as any).hiddenEmojiIds, [], '清空成功后应立刻清空运行时隐藏表情列表');
assert.deepEqual((window as any).customEmojiOrder, [], '清空成功后应立刻清空运行时表情排序');
assert.deepEqual((window as any).allEnabledEmojis, [], '清空成功后应立刻清空运行时可用表情集合');
assert.equal((window as any).groupEmojis_group_old, undefined, '清空成功后应立刻移除旧 groupEmojis_* 快捷缓存');
assert.deepEqual((window as any).selectedContacts, [], '清空成功后应立刻清空已选联系人旁路状态');
assert.equal((window as any).currentArticle, null, '清空成功后应立刻清空当前文章旁路状态');
assert.equal((window as any).newStickers, null, '清空成功后应立刻清空待导入贴纸旁路状态');
assert.deepEqual((window as any).imageLibraryGroups, [], '清空成功后应立刻清空图片素材库运行态分组');
assert.deepEqual((window as any).imageLibraryItems, [], '清空成功后应立刻清空图片素材库运行态项目');
assert.equal((window as any).__xushuoRuntimeResetEpoch, 8, '清空成功后应推进运行时重置代次，令旧异步任务自动失效');
assert.ok(toasts.includes('已清空，正在刷新...'), '清空成功后应提示正在刷新');

while (scheduledTasks.length > 0) {
  const task = scheduledTasks.shift();
  task?.();
}

assert.ok(reloadCalls.length >= 2, '清空成功后应安排双重刷新兜底');

(globalThis as any).setTimeout = originalSetTimeout;
(globalThis as any).window.setTimeout = originalSetTimeout;
(globalThis as any).window.clearTimeout = clearTimeout;

console.log('测试通过：清空本地数据成功后会立刻熄掉旁路运行态，避免刷新失败前脏状态回写。');
