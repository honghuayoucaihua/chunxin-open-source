import assert from 'node:assert/strict';
import {
  getMessageBodyText,
  getMessageMetaPreviewText,
  hasMeaningfulMessageSemantics,
  hasMessageMetaText,
  isDoStyleMessage,
  isMetaOnlyTextMessage
} from '../src/utils/chat/messageSemantics.ts';

{
  const doMessage: any = {
    id: 'u1',
    senderId: 'me',
    type: 'text',
    content: '   ',
    actionDesc: '把纸条递过去'
  };
  assert.equal(getMessageBodyText(doMessage), '', '正文读取器应统一裁剪空白正文');
  assert.equal(isDoStyleMessage(doMessage), true, '只有动作没有正文的文本消息应识别为做发送语义');
  assert.equal(isMetaOnlyTextMessage(doMessage), true, '只有动作没有正文的文本消息应识别为纯元信息文本');
  assert.equal(hasMeaningfulMessageSemantics(doMessage), true, '做发送消息应被视为有有效语义');
}

{
  const metaOnly: any = {
    id: 'm2',
    senderId: 'c1',
    type: 'text',
    content: '',
    innerVoice: '先观察一下',
    actionDesc: '抬手打招呼',
    narrationDesc: '空气安静了一秒'
  };
  assert.equal(getMessageMetaPreviewText(metaOnly), '先观察一下 · 抬手打招呼 · 空气安静了一秒', '元信息预览应统一按固定顺序拼接');
  assert.equal(hasMessageMetaText(metaOnly), true, '存在心声/动作/旁白时应识别为有元信息语义');
}

{
  const emptyText: any = {
    id: 'm3',
    senderId: 'me',
    type: 'text',
    content: '   '
  };
  assert.equal(hasMeaningfulMessageSemantics(emptyText), false, '纯空白文本不应被识别为有效语义');
}

{
  const imageMessage: any = {
    id: 'img1',
    senderId: 'me',
    type: 'image',
    content: 'https://example.com/demo.png',
    imageCaption: '刚拍的照片'
  };
  assert.equal(hasMeaningfulMessageSemantics(imageMessage), true, '图片消息应被识别为有效语义');
}

{
  const commandOnly: any = {
    id: 'sys1',
    senderId: 'system',
    type: 'system',
    content: '',
    truthDareCommand: 'nextRound'
  };
  assert.equal(hasMeaningfulMessageSemantics(commandOnly), false, '仅用于控制流程的系统指令不应被识别为有效聊天语义');
}

{
  const patNotice: any = {
    id: 'sys-pat',
    senderId: 'system',
    type: 'system',
    content: '',
    pat: { fromName: '林夏', targetName: '小满' }
  };
  assert.equal(hasMeaningfulMessageSemantics(patNotice), true, '拍一拍系统通知应被识别为有效界面事件语义');
}

console.log('测试通过：消息语义读取器可统一判断正文、元信息与做发送语义。');
