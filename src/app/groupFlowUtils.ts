import type { Contact, Message } from '../types';

type BuildGroupPayload = {
  ids: string[];
  groupName: string;
  userName: string;
  groupId: string;
};

const GROUP_NAME_SUFFIX_PATTERN = /\s*（\d+）\s*$/;

const resolveBaseGroupName = (groupName: string, userName: string): string => {
  const rawBaseName = (groupName.trim() || '新建群聊').replace(GROUP_NAME_SUFFIX_PATTERN, '');
  const trimmedUserName = userName.trim();
  if (!trimmedUserName) return rawBaseName;
  return rawBaseName.includes(trimmedUserName) ? rawBaseName : `${rawBaseName}、${trimmedUserName}`;
};

export const buildGroupContact = ({ ids, groupName, userName, groupId }: BuildGroupPayload): Contact => {
  const baseName = resolveBaseGroupName(groupName, userName);
  return {
    id: groupId,
    name: baseName,
    pinyin: baseName.charAt(0).toUpperCase(),
    avatar: `group:${ids.join(',')}`,
    unreadCount: 0,
    isAi: true,
    isGroup: true,
    memberIds: ids,
    remark: '',
    signature: `${ids.length}位群成员`,
    chatMode: 'online',
    worldBookIds: [],
    groupPreset: '',
    groupRelations: []
  };
};

export const buildGroupWelcomeMessage = (groupId: string, groupName: string, groupSize: number): Message => ({
  id: `group-welcome-${Date.now()}`,
  senderId: groupId,
  content: `你创建了群聊「${groupName}（${groupSize}）」`,
  timestamp: Date.now(),
  type: 'system'
});
