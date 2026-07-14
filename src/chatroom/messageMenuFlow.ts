import { copyToClipboard, isNative, showToast } from '../services/nativeService';
import type { Message } from '../types';

type MenuItem = {
  icon: string;
  label: string;
  onClick: () => void | Promise<void>;
};

const closeMenu = (setMenuMsgId: (id: string | null) => void, setMenuSourceField: (field: 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc' | null) => void) => {
  setMenuMsgId(null);
  setMenuSourceField(null);
};

export const buildMessageMenuItems = (params: any): MenuItem[] => {
  const targetMsg = (params.messages as Message[]).find((item) => item.id === params.menuMsgId);
  const isTextMsg = targetMsg?.type === 'text';
  const hasInner = !!String(targetMsg?.innerVoice || '').trim();
  const hasAction = !!String(targetMsg?.actionDesc || '').trim();
  const hasNarration = !!String(targetMsg?.narrationDesc || '').trim();
  const allowEditContent = isTextMsg && (params.menuSourceField ? params.menuSourceField === 'content' : true);
  const allowEditInner = isTextMsg && hasInner && (params.menuSourceField ? params.menuSourceField === 'innerVoice' : true);
  const allowEditAction = isTextMsg && hasAction && (params.menuSourceField ? params.menuSourceField === 'actionDesc' : true);
  const allowEditNarration = isTextMsg && hasNarration && (params.menuSourceField ? params.menuSourceField === 'narrationDesc' : true);

  return [
    {
      icon: 'fa-copy',
      label: '复制',
      onClick: async () => {
        const content = (params.messages as Message[]).find((item) => item.id === params.menuMsgId)?.content || '';
        await copyToClipboard(content);
        if (isNative) showToast('已复制');
        closeMenu(params.setMenuMsgId, params.setMenuSourceField);
      }
    },
    { icon: 'fa-trash', label: '删除', onClick: () => { params.onAction?.('delete', params.menuMsgId!); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } },
    { icon: 'fa-check-double', label: '多选', onClick: () => { params.setIsMultiSelecting(true); params.setMultiSelectIds([params.menuMsgId!]); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } },
    { icon: 'fa-quote-left', label: '引用', onClick: () => { params.onAction?.('quote', params.menuMsgId!); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } },
    { icon: 'fa-star', label: '收藏', onClick: () => { params.onAction?.('favorite', params.menuMsgId!); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } },
    ...(allowEditContent
      ? [{ icon: 'fa-pen-to-square', label: '编辑正文', onClick: () => { params.onAction?.('edit', params.menuMsgId!, { field: 'content' }); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } }]
      : []),
    ...(allowEditInner
      ? [{ icon: 'fa-brain', label: '编辑心声', onClick: () => { params.onAction?.('edit', params.menuMsgId!, { field: 'innerVoice' }); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } }]
      : []),
    ...(allowEditAction
      ? [{ icon: 'fa-person-walking', label: '编辑动作', onClick: () => { params.onAction?.('edit', params.menuMsgId!, { field: 'actionDesc' }); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } }]
      : []),
    ...(allowEditNarration
      ? [{ icon: 'fa-quote-left', label: '编辑旁白', onClick: () => { params.onAction?.('edit', params.menuMsgId!, { field: 'narrationDesc' }); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } }]
      : []),
    { icon: 'fa-code-branch', label: 'if线', onClick: () => { params.onAction?.('ifLineMultiple', '', [params.menuMsgId!]); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } },
    { icon: 'fa-rotate-right', label: '重新发送', onClick: () => { params.onAction?.('resendFrom', params.menuMsgId!); closeMenu(params.setMenuMsgId, params.setMenuSourceField); } }
  ];
};
