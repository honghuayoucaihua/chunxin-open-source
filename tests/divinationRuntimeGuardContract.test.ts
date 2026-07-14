import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDefaultDivinationDraft } from '../src/services/divinationService.ts';

const divinationFlowSource = readFileSync(new URL('../src/hooks/useDivinationFlow.ts', import.meta.url), 'utf8');
const clearDataFlowSource = readFileSync(new URL('../src/app/clearDataFlow.ts', import.meta.url), 'utf8');
const handlerRuntimeSource = readFileSync(new URL('../src/app/dataMaintenanceHandlerRuntime.ts', import.meta.url), 'utf8');
const actionHandlersSource = readFileSync(new URL('../src/app/dataMaintenanceActionHandlers.ts', import.meta.url), 'utf8');
const utilityDomainSource = readFileSync(new URL('../src/hooks/useUtilityActionDomain.ts', import.meta.url), 'utf8');

assert.match(divinationFlowSource, /captureRuntimeResetEpoch/, '占卜提交流程应捕获运行时重置代次');
assert.match(divinationFlowSource, /isRuntimeResetEpochStale/, '占卜提交流程应检查运行时重置代次是否失效');
assert.match(
  divinationFlowSource,
  /const runtimeResetEpoch = captureRuntimeResetEpoch\(\);[\s\S]*?const isDivinationRequestCurrent = \(\) => !isRuntimeResetEpochStale\(runtimeResetEpoch\);/s,
  '占卜提交流程应统一封装当前请求是否仍有效的判断'
);
assert.match(
  divinationFlowSource,
  /onMeta: \(meta\) => \{[\s\S]*?if \(!isDivinationRequestCurrent\(\)\) return;[\s\S]*?setCurrentDivinationRecord/s,
  '占卜流式 meta 回写前应拦截清空后的旧请求'
);
assert.match(
  divinationFlowSource,
  /onText: \(chunk\) => \{[\s\S]*?if \(!isDivinationRequestCurrent\(\)\) return;[\s\S]*?setCurrentDivinationRecord/s,
  '占卜流式文本回写前应拦截清空后的旧请求'
);
assert.match(
  divinationFlowSource,
  /const response = await requestDivinationStream[\s\S]*?if \(!isDivinationRequestCurrent\(\)\) return;[\s\S]*?setCurrentDivinationRecord\(record\);[\s\S]*?setDivinationHistory/s,
  '占卜最终结果与历史落库前应拦截清空后的旧请求'
);
assert.match(
  divinationFlowSource,
  /catch \(error\) \{[\s\S]*?if \(!isDivinationRequestCurrent\(\)\) return;[\s\S]*?showToast/s,
  '占卜失败提示前应拦截清空后的旧请求'
);
assert.match(
  divinationFlowSource,
  /finally \{[\s\S]*?if \(!isDivinationRequestCurrent\(\)\) return;[\s\S]*?setDivinationSubmitting\(false\);/s,
  '占卜提交收尾前应拦截清空后的旧请求，避免误结束后续新请求'
);

for (const snippet of [
  'setDivinationDraft: Dispatch<SetStateAction<DivinationDraft>>;',
  'setCurrentDivinationRecord: Dispatch<SetStateAction<DivinationHistoryItem | null>>;',
  'setDivinationSubmitting: Dispatch<SetStateAction<boolean>>;'
]) {
  assert.match(
    actionHandlersSource,
    new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `数据维护动作参数应声明占卜运行态 setter：${snippet}`
  );
}

for (const snippet of [
  'setDivinationDraft: options.setDivinationDraft,',
  'setCurrentDivinationRecord: options.setCurrentDivinationRecord,',
  'setDivinationSubmitting: options.setDivinationSubmitting,'
]) {
  assert.match(
    handlerRuntimeSource,
    new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `清空数据运行时应把占卜运行态 setter 传给清空流程：${snippet}`
  );
}

for (const snippet of [
  'setDivinationDraft: s.setDivinationDraft,',
  'setCurrentDivinationRecord: s.setCurrentDivinationRecord,',
  'setDivinationSubmitting: s.setDivinationSubmitting'
]) {
  assert.match(
    utilityDomainSource,
    new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `数据维护入口应把占卜运行态 setter 传给清空流程：${snippet}`
  );
}

assert.match(clearDataFlowSource, /createDefaultDivinationDraft/, '清空数据应能重建默认占卜草稿');
for (const snippet of [
  'params.setDivinationDraft(createDefaultDivinationDraft());',
  'params.setCurrentDivinationRecord(null);',
  'params.setDivinationSubmitting(false);'
]) {
  assert.match(
    clearDataFlowSource,
    new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `清空数据应重置占卜运行态：${snippet}`
  );
}

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

let divinationDraft = {
  ...createDefaultDivinationDraft(),
  question: '旧占卜问题'
};
let currentDivinationRecord: any = {
  id: 'div-old',
  createdAt: 1,
  requestId: 'req-old',
  title: '旧占卜',
  draft: divinationDraft,
  type: 'liuyao',
  divination: { hexagram: '乾' },
  interpretation: '旧解读'
};
let divinationSubmitting = true;
let stateLoaded = true;

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
  forceReloadApp: () => {},
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
    divinationDraft = typeof value === 'function' ? value(divinationDraft) : value;
  },
  setDivinationHistory: () => {},
  setCurrentDivinationRecord: (value: any) => {
    currentDivinationRecord = typeof value === 'function' ? value(currentDivinationRecord) : value;
  },
  setDivinationSubmitting: (value: any) => {
    divinationSubmitting = typeof value === 'function' ? value(divinationSubmitting) : value;
  },
  setHasAgreedTerms: () => {},
  setWalletBank: () => {},
  setMusicState: () => {},
  setSelectedContactId: () => {},
  setActiveSubView: () => {},
  setSubViewStack: () => {},
  setIsStateLoaded: (value: any) => {
    stateLoaded = typeof value === 'function' ? value(stateLoaded) : value;
  },
  showToast: () => {}
});

await waitForCondition(() => stateLoaded === false);

assert.deepEqual(divinationDraft, createDefaultDivinationDraft(), '清空成功后应立刻重置占卜草稿，避免旧问题残留');
assert.equal(currentDivinationRecord, null, '清空成功后应立刻清空当前占卜结果，避免旧流式结果继续显示');
assert.equal(divinationSubmitting, false, '清空成功后应立刻结束占卜提交态，避免旧请求收尾影响后续新请求');

while (scheduledTasks.length > 0) {
  const task = scheduledTasks.shift();
  task?.();
}

(globalThis as any).setTimeout = originalSetTimeout;
(globalThis as any).window.setTimeout = originalSetTimeout;
(globalThis as any).window.clearTimeout = clearTimeout;

console.log('测试通过：占卜模块已接入运行时守卫，清空后旧流式请求与旧运行态不会继续污染界面。');
