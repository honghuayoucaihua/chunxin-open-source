import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

type PaymentType = 'redpacket' | 'transfer';

const bundledDir = join(tmpdir(), 'chunxin-payment-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `chatActionHandlers-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/app/chatActionHandlers.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { buildChatActionHandlers } = await import(pathToFileURL(bundledFile).href);

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

const noop = () => undefined;

const createHarness = (type: PaymentType) => {
  const contact = {
    id: 'friend-1',
    name: '测试联系人',
    pinyin: '',
    avatar: '',
    unreadCount: 0,
    balance: 95
  };
  const paymentMsg = {
    id: `${type}-1`,
    senderId: contact.id,
    content: type === 'redpacket' ? '测试红包' : '转账 ¥5.00',
    amount: '5.00',
    timestamp: 1,
    type,
    isOpened: false,
    paymentStatus: 'pending'
  };
  const user = {
    name: '我',
    wechatId: 'me',
    avatar: '',
    gender: 'other',
    region: '',
    signature: '',
    momentsCover: '',
    balance: 10
  };
  let messages = {
    [contact.id]: [paymentMsg]
  };
  let walletIncome = 0;
  const contactDeltas = [];
  const toasts: string[] = [];
  let activePayment = {
    chatId: contact.id,
    msgId: paymentMsg.id,
    type
  };
  let showRedPacketPreview = type === 'redpacket';

  const handlers = buildChatActionHandlers({
    inputValue: '',
    selectedContactId: contact.id,
    quotedMessage: null,
    setMessages: (updater) => {
      messages = typeof updater === 'function' ? updater(messages) : updater;
    },
    setContacts: noop,
    playSendSignal: noop,
    setInputValue: noop,
    setQuotedMessage: noop,
    setSelectedContactId: noop,
    goBackSubView: noop,
    currentChat: contact,
    pushSubView: () => undefined,
    setActiveVoiceCallContactId: noop,
    user,
    contacts: [contact],
    setProfileSnapshot: noop,
    setProfileId: noop,
    messages,
    setActivePaymentMessage: (updater) => {
      activePayment = typeof updater === 'function' ? updater(activePayment) : updater;
    },
    setShowRedPacketPreview: (updater) => {
      showRedPacketPreview = typeof updater === 'function' ? updater(showRedPacketPreview) : updater;
    },
    updateMemoryWithAutoSummary: noop,
    resolveMemorySummaryThreshold: () => 20,
    aiSettings: buildAiSettings(),
    handleSendMessage: async () => undefined,
    applyWalletIncome: (amount) => {
      walletIncome += Number(amount || 0);
    },
    applyContactBalanceDelta: (contactId, delta) => {
      contactDeltas.push({ contactId, delta });
    },
    showToast: (message) => {
      toasts.push(message);
    }
  });

  return {
    handlers,
    paymentMsg,
    getMessages: () => messages,
    getWalletIncome: () => walletIncome,
    getContactDeltas: () => contactDeltas,
    getActivePayment: () => activePayment,
    getShowRedPacketPreview: () => showRedPacketPreview,
    getToasts: () => toasts
  };
};

const redPacketHarness = createHarness('redpacket');
redPacketHarness.handlers.handleConfirmReceiveRedPacket(redPacketHarness.paymentMsg);
assert.equal(redPacketHarness.getWalletIncome(), 5);
assert.deepEqual(redPacketHarness.getContactDeltas(), []);
assert.equal(redPacketHarness.getMessages()['friend-1'][0].paymentStatus, 'received');
assert.equal(redPacketHarness.getMessages()['friend-1'][0].isOpened, true);
assert.equal(redPacketHarness.getShowRedPacketPreview(), false);
assert.deepEqual(redPacketHarness.getToasts(), ['已领取红包']);

const transferHarness = createHarness('transfer');
transferHarness.handlers.handleConfirmReceiveTransfer(transferHarness.paymentMsg);
assert.equal(transferHarness.getWalletIncome(), 5);
assert.deepEqual(transferHarness.getContactDeltas(), []);
assert.equal(transferHarness.getMessages()['friend-1'][0].paymentStatus, 'received');
assert.equal(transferHarness.getMessages()['friend-1'][0].isOpened, true);
assert.equal(transferHarness.getActivePayment(), null);
assert.deepEqual(transferHarness.getToasts(), ['已确认收款']);

console.log('测试通过：领取红包/确认收款不会重复扣减联系人余额。');
