import assert from 'node:assert/strict';
import { getInitialEmojiGroups } from '../src/chatroom/emojiState.ts';

const storage = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  }
};

const persistedGroups = [
  { id: 'custom-1', name: '我的分组', folder: 'mine', enabled: true, isBuiltIn: false, order: 0 }
];

storage.set('xushuo_emoji_groups', JSON.stringify(persistedGroups));

const fakeWindow: Record<string, any> = {
  emojiGroups: []
};

(globalThis as any).window = fakeWindow;

// 复现：旧逻辑会先把 window.emojiGroups 的空数组写回 localStorage，导致刷新后持久化分组被清空。
const result = getInitialEmojiGroups();

assert.deepEqual(result, persistedGroups, '当全局分组为空数组时，应优先恢复 localStorage 中的持久化分组');
assert.deepEqual(fakeWindow.emojiGroups, persistedGroups, '恢复后应同步回 window.emojiGroups');
assert.equal(storage.get('xushuo_emoji_groups'), JSON.stringify(persistedGroups), '恢复过程中不应把持久化分组覆盖为空数组');

console.log('测试通过：表情分组初始化不会被空全局状态覆盖。');
