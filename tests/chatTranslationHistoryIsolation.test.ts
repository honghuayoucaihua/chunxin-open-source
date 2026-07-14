import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-translation-history-tests');
mkdirSync(bundledDir, { recursive: true });
const entryFile = join(bundledDir, `translationHistoryEntry-${Date.now()}.ts`);
const bundledFile = join(bundledDir, `translationHistoryEntry-${Date.now()}.mjs`);
writeFileSync(entryFile, `
  export { buildSingleReplyHistory } from '${resolve('src/utils/chat/singleReplyRequest.ts').replace(/\\/g, '/')}';
  export { buildGroupReplyHistory } from '${resolve('src/utils/chat/groupReplyRequest.ts').replace(/\\/g, '/')}';
`);
await build({
  entryPoints: [entryFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  logLevel: 'silent'
});
const {
  buildSingleReplyHistory,
  buildGroupReplyHistory
} = await import(`file://${bundledFile.replace(/\\/g, '/')}`) as typeof import('../src/utils/chat/singleReplyRequest.ts') & typeof import('../src/utils/chat/groupReplyRequest.ts');

const aiSettings: any = {
  provider: 'builtin',
  enableTimeAwareness: false,
  customModelSupportsImageRecognition: false
};

{
  const history = buildSingleReplyHistory({
    contact: {
      id: 'c1',
      name: 'Ava',
      chatMode: 'online',
      language: '英语',
      translateToChinese: true
    } as any,
    historyMessages: [
      {
        id: 'm1',
        senderId: 'c1',
        type: 'text',
        content: 'Good morning.',
        translatedContentZhCN: '早上好。',
        timestamp: 1
      } as any,
      {
        id: 'm2',
        senderId: 'me',
        type: 'text',
        content: 'I am fine.',
        translatedContentZhCN: '我很好。',
        timestamp: 2
      } as any
    ],
    aiSettings
  });

  assert.match(history[0]?.text || '', /【译文】早上好。/, '外语角色开启中文翻译时，应保留 AI 历史译文');
  assert.doesNotMatch(history[1]?.text || '', /【译文】/, '用户消息不应把旧译文继续喂给模型');
}

{
  const history = buildSingleReplyHistory({
    contact: {
      id: 'c1',
      name: 'Ava',
      chatMode: 'online',
      language: '英语',
      translateToChinese: false
    } as any,
    historyMessages: [
      {
        id: 'm1',
        senderId: 'c1',
        type: 'text',
        content: 'Good morning.',
        translatedContentZhCN: '早上好。',
        timestamp: 1
      } as any
    ],
    aiSettings
  });

  assert.doesNotMatch(history[0]?.text || '', /【译文】/, '关闭中文翻译后，单聊历史不应保留旧译文格式');
}

{
  const history = buildSingleReplyHistory({
    contact: {
      id: 'c1',
      name: '小林',
      chatMode: 'online',
      language: 'Chinese',
      translateToChinese: true
    } as any,
    historyMessages: [
      {
        id: 'm1',
        senderId: 'c1',
        type: 'text',
        content: '早上好。',
        translatedContentZhCN: 'Good morning.',
        timestamp: 1
      } as any
    ],
    aiSettings
  });

  assert.doesNotMatch(history[0]?.text || '', /【译文】/, '普通中文回复即使误开翻译，也不应把译文格式带入历史');
}

{
  const groupHistory = buildGroupReplyHistory({
    contact: {
      id: 'g1',
      name: '语言小组',
      isGroup: true,
      chatMode: 'online'
    } as any,
    contacts: [
      {
        id: 'alice',
        name: 'Alice',
        chatMode: 'online',
        language: '英语',
        translateToChinese: true
      } as any,
      {
        id: 'bob',
        name: 'Bob',
        chatMode: 'online',
        language: '法语',
        translateToChinese: false
      } as any
    ],
    historyMessages: [
      {
        id: 'm1',
        senderId: 'alice',
        type: 'text',
        content: 'I will be there.',
        translatedContentZhCN: '我会到。',
        timestamp: 1
      } as any,
      {
        id: 'm2',
        senderId: 'bob',
        type: 'text',
        content: 'Je suis la.',
        translatedContentZhCN: '我在这里。',
        timestamp: 2
      } as any,
      {
        id: 'm3',
        senderId: 'me',
        type: 'text',
        content: '收到。',
        translatedContentZhCN: 'Received.',
        timestamp: 3
      } as any
    ],
    aiSettings
  });

  assert.match(groupHistory[0]?.text || '', /Alice：I will be there\./, '群聊历史应保留发言人标识');
  assert.match(groupHistory[0]?.text || '', /【译文】我会到。/, '群成员开启中文翻译时，应保留该成员历史译文');
  assert.doesNotMatch(groupHistory[1]?.text || '', /【译文】/, '群成员关闭中文翻译后，不应保留该成员旧译文');
  assert.doesNotMatch(groupHistory[2]?.text || '', /【译文】/, '群聊用户消息不应把旧译文继续喂给模型');
}

console.log('测试通过：聊天历史会按当前翻译开关隔离旧译文格式。');

rmSync(entryFile, { force: true });
rmSync(bundledFile, { force: true });
