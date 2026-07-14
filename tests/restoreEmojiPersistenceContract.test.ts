import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';
import {
  CUSTOM_EMOJI_ORDER_STORAGE_KEY,
  EMOJI_GROUPS_STORAGE_KEY,
  HIDDEN_EMOJI_IDS_STORAGE_KEY
} from '../src/chatroom/emojiState.ts';

class FakeIDBRequest<T = any> {
  result: T | null = null;
  error: any = null;
  onsuccess: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
  onerror: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
  onupgradeneeded: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
}

const stores = new Map<string, Map<string, any>>();
let dbVersion = 0;
const fakeDB = {
  objectStoreNames: {
    contains: (name: string) => stores.has(name)
  },
  createObjectStore: (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  },
  transaction: (name: string) => ({
    objectStore: () => ({
      get: (key: string) => {
        const request = new FakeIDBRequest<any>();
        queueMicrotask(() => {
          request.result = stores.get(name)?.get(key);
          request.onsuccess?.call(request, {});
        });
        return request;
      },
      put: (value: any, key: string) => {
        const request = new FakeIDBRequest<any>();
        queueMicrotask(() => {
          if (!stores.has(name)) stores.set(name, new Map());
          stores.get(name)!.set(key, value);
          request.result = value;
          request.onsuccess?.call(request, {});
        });
        return request;
      }
    })
  })
};

(globalThis as any).indexedDB = {
  open: (_name: string, version: number) => {
    const request = new FakeIDBRequest<any>();
    queueMicrotask(() => {
      const needsUpgrade = version > dbVersion;
      dbVersion = Math.max(dbVersion, version);
      request.result = fakeDB;
      if (needsUpgrade) {
        request.onupgradeneeded?.call(request, {});
      }
      request.onsuccess?.call(request, {});
    });
    return request;
  }
};

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  }
};

if (!stores.has('emoji_state')) stores.set('emoji_state', new Map());
stores.get('emoji_state')!.set('custom_emojis', [{ id: 'custom-old', url: 'data:image/png;base64,OLD', desc: '旧表情' }]);
stores.get('emoji_state')!.set('group_emojis', {
  'group-old': [{ id: 'group-old-1', url: 'data:image/png;base64,OLDGROUP', desc: '旧分组表情', groupId: 'group-old' }]
});
storage.set(EMOJI_GROUPS_STORAGE_KEY, JSON.stringify([{ id: 'group-old', name: '旧分组', folder: 'old', enabled: true, isBuiltIn: false, order: 0 }]));
storage.set(HIDDEN_EMOJI_IDS_STORAGE_KEY, JSON.stringify(['hidden-old']));
storage.set(CUSTOM_EMOJI_ORDER_STORAGE_KEY, JSON.stringify(['custom-old']));

(globalThis as any).window = {
  customEmojis: [{ id: 'custom-old', url: 'data:image/png;base64,OLD', desc: '旧表情' }],
  emojiGroups: [{ id: 'group-old', name: '旧分组', folder: 'old', enabled: true, isBuiltIn: false, order: 0 }],
  allGroupEmojis: {
    'group-old': [{ id: 'group-old-1', url: 'data:image/png;base64,OLDGROUP', desc: '旧分组表情', groupId: 'group-old' }]
  },
  hiddenEmojiIds: ['hidden-old'],
  customEmojiOrder: ['custom-old'],
  allEnabledEmojis: [],
  selectedContacts: [],
  currentArticle: null
};

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      contacts: [],
      user: { id: 'me', name: '我' },
      messages: {},
      settings: {},
      worldBooks: [],
      customEmojis: [{ id: 'custom-new', url: 'data:image/png;base64,NEW', desc: '新自定义表情' }],
      emojiGroups: [{ id: 'group-new', name: '新分组', folder: 'new', enabled: true, isBuiltIn: false, order: 1 }],
      groupEmojis: {
        'group-new': [{ id: 'group-new-1', url: 'data:image/png;base64,NEWGROUP', desc: '新分组表情', groupId: 'group-new' }]
      },
      hiddenEmojiIds: ['hidden-new'],
      customEmojiOrder: ['custom-new']
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'contacts') ? 1 : 0,
  normalizeLegacyContacts: (contacts: any[]) => contacts,
  shouldSkipImportedContact: () => false,
  mergeBuiltInContacts: (contacts: any[]) => contacts,
  normalizeLegacyMessages: (messages: any) => messages,
  normalizeAppearanceSettings: (settings: any) => settings,
  normalizeAiSettings: (settings: any) => settings,
  normalizeSoundVibrationSettings: (settings: any) => settings || {},
  setContacts: createSetter(),
  setUser: createSetter(),
  setWalletBalance: createSetter(),
  setMessages: createSetter(),
  setFavorites: createSetter(),
  setMoments: createSetter(),
  setSettings: createSetter(),
  setAiSettings: createSetter(),
  setWorldBooks: createSetter(),
  setMasks: createSetter(),
  setHtmlTemplates: createSetter(),
  setBubbleTemplates: createSetter(),
  setForums: createSetter(),
  setSoundVibrationSettings: createSetter(),
  setContactMemories: createSetter(),
  setOfficialArticles: createSetter(),
  setFriendRequests: createSetter(),
  setDiscoverUnreadCount: createSetter(),
  setInboxLetters: createSetter(),
  setSentLetters: createSetter(),
  setMailboxTheme: createSetter(),
  setAnonymousChatSettings: createSetter(),
  setAnonymousHistory: createSetter(),
  setAnonymousHasUnfinishedSession: createSetter(),
  setAnonymousUnfinishedSession: createSetter(),
  setDivinationHistory: createSetter(),
  setHasAgreedTerms: createSetter(),
  setWalletBank: createSetter(),
  setMusicState: createSetter()
}, new File(['{}'], 'emoji-full-backup.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual((window as any).customEmojis, [{ id: 'custom-new', url: 'data:image/png;base64,NEW', desc: '新自定义表情' }], '完整导入恢复应覆盖自定义表情');
assert.deepEqual((window as any).emojiGroups, [{ id: 'group-new', name: '新分组', folder: 'new', enabled: true, isBuiltIn: false, order: 1 }], '完整导入恢复应覆盖表情分组');
assert.deepEqual((window as any).allGroupEmojis, {
  'group-new': [{ id: 'group-new-1', url: 'data:image/png;base64,NEWGROUP', desc: '新分组表情', groupId: 'group-new' }]
}, '完整导入恢复应覆盖分组表情映射');
assert.deepEqual((window as any).hiddenEmojiIds, ['hidden-new'], '完整导入恢复应覆盖隐藏表情列表');
assert.deepEqual((window as any).customEmojiOrder, ['custom-new'], '完整导入恢复应覆盖表情排序');

assert.equal(storage.get(EMOJI_GROUPS_STORAGE_KEY), JSON.stringify((window as any).emojiGroups), '完整导入恢复后应写回表情分组缓存');
assert.equal(storage.get(HIDDEN_EMOJI_IDS_STORAGE_KEY), JSON.stringify(['hidden-new']), '完整导入恢复后应写回隐藏表情缓存');
assert.equal(storage.get(CUSTOM_EMOJI_ORDER_STORAGE_KEY), JSON.stringify(['custom-new']), '完整导入恢复后应写回表情排序缓存');
assert.deepEqual(stores.get('emoji_state')?.get('custom_emojis'), (window as any).customEmojis, '完整导入恢复后应写回自定义表情 IndexedDB');
assert.deepEqual(stores.get('emoji_state')?.get('group_emojis'), (window as any).allGroupEmojis, '完整导入恢复后应写回分组表情 IndexedDB');

console.log('测试通过：完整 JSON 导入恢复会统一恢复整套表情持久化状态。');
