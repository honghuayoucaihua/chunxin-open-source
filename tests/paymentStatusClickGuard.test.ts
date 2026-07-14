import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-payment-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `payment-click-guard-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/app/chatActionHandlers.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { buildChatActionHandlers } = await import(pathToFileURL(bundledFile).href);

const noop = () => undefined;
const buildAiSettings = () => ({
  provider: 'builtin',
  apiKey: '',
  model: '',
  baseUrl: '',
  responseFormat: 'openai',
  enableDelayReply: false,
  enableSentenceSend: false,
  enableTimeAwareness: false,
  momentInteractionSource: 'none',
  minimaxTTS: {
    enabled: false,
    region: 'official',
    apiKey: '',
    groupId: '',
    model: ''
  }
});

const createHarness = (paymentStatus: 'pending' | 'received' | 'refunded' | 'expired', isOpened?: boolean) => {
  const contact = {
    id: 'friend-1',
    name: '测试联系人',
    pinyin: '',
    avatar: '',
    unreadCount: 0
  };
  const paymentMsg = {
    id: `pay-${paymentStatus}`,
    senderId: contact.id,
    content: '测试红包',
    amount: '5.00',
    timestamp: 1,
    type: 'redpacket',
    paymentStatus,
    ...(typeof isOpened === 'boolean' ? { isOpened } : {})
  };
  let activePayment: any = null;
  let showRedPacketPreview = false;
  const handlers = buildChatActionHandlers({
    inputValue: '',
    selectedContactId: contact.id,
    quotedMessage: null,
    setMessages: noop,
    setContacts: noop,
    playSendSignal: noop,
    setInputValue: noop,
    setQuotedMessage: noop,
    setSelectedContactId: noop,
    goBackSubView: noop,
    currentChat: contact,
    pushSubView: noop,
    setActiveVoiceCallContactId: noop,
    user: {
      name: '我',
      wechatId: 'me',
      avatar: '',
      gender: 'other',
      region: '',
      signature: '',
      momentsCover: '',
      balance: 10
    },
    contacts: [contact],
    setProfileSnapshot: noop,
    setProfileId: noop,
    messages: { [contact.id]: [paymentMsg] },
    setActivePaymentMessage: (updater: any) => {
      activePayment = typeof updater === 'function' ? updater(activePayment) : updater;
    },
    setShowRedPacketPreview: (updater: any) => {
      showRedPacketPreview = typeof updater === 'function' ? updater(showRedPacketPreview) : updater;
    },
    updateMemoryWithAutoSummary: noop,
    resolveMemorySummaryThreshold: () => 20,
    aiSettings: buildAiSettings(),
    handleSendMessage: async () => undefined,
    applyWalletIncome: noop,
    applyContactBalanceDelta: noop,
    showToast: noop
  });
  return {
    handlers,
    getActivePayment: () => activePayment,
    getShowRedPacketPreview: () => showRedPacketPreview
  };
};

const expiredHarness = createHarness('expired');
expiredHarness.handlers.handleChatPaymentClick('pay-expired', 'redpacket');
assert.equal(expiredHarness.getActivePayment(), null, '失效红包不应打开领取或已领取弹窗');
assert.equal(expiredHarness.getShowRedPacketPreview(), false);

const refundedHarness = createHarness('refunded');
refundedHarness.handlers.handleChatPaymentClick('pay-refunded', 'redpacket');
assert.equal(refundedHarness.getActivePayment(), null, '已退款红包不应打开领取或已领取弹窗');

const pendingHarness = createHarness('pending', false);
pendingHarness.handlers.handleChatPaymentClick('pay-pending', 'redpacket');
assert.deepEqual(pendingHarness.getActivePayment(), { chatId: 'friend-1', msgId: 'pay-pending', type: 'redpacket' });
assert.equal(pendingHarness.getShowRedPacketPreview(), true);

const receivedHarness = createHarness('received', true);
receivedHarness.handlers.handleChatPaymentClick('pay-received', 'redpacket');
assert.deepEqual(receivedHarness.getActivePayment(), { chatId: 'friend-1', msgId: 'pay-received', type: 'redpacket' });
assert.equal(receivedHarness.getShowRedPacketPreview(), false);

const chatItemSource = readFileSync(new URL('../src/ChatMessageItem.tsx', import.meta.url), 'utf8');
assert.match(chatItemSource, /resolvePaymentStatus\(msg\) === 'received'/, '支付气泡展示应统一按 paymentStatus 解析已领取状态');

const chatSubViewSource = readFileSync(new URL('../src/app/subviews/chatSubView.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(chatSubViewSource, /isOpened=\{paymentMsg\.isOpened !== false\}/, '领取结果页不应绕过 paymentStatus 判断已领取状态');
assert.match(chatSubViewSource, /resolvePaymentStatus\(paymentMsg\) === 'received'/, '领取结果页应统一按 paymentStatus 判断已领取状态');

console.log('测试通过：失效/退款支付消息不会被点击成已领取状态。');
