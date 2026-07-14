import type { Contact } from '../types';
import { getImageLibraryState } from './imageLibraryStore';

const MAX_PROMPT_ITEMS = 30;

export const buildImageLibraryPromptForContact = (contact: Contact): string => {
  let selectedGroupIds: string[];
  if (contact.useCustomImageLibraryGroups === true) {
    selectedGroupIds = Array.isArray(contact.imageLibraryGroupIds)
      ? contact.imageLibraryGroupIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];
    if (selectedGroupIds.length === 0) return '';
  } else {
    const { groups } = getImageLibraryState();
    selectedGroupIds = groups.map((group) => group.id);
    if (selectedGroupIds.length === 0) return '';
  }
  const { groups, items } = getImageLibraryState();
  const groupNameMap = new Map(groups.map((group) => [group.id, group.name]));
  const available = items
    .filter((item) => selectedGroupIds.includes(item.groupId))
    .slice(0, MAX_PROMPT_ITEMS);
  if (available.length === 0) return '';
  const lines = available.map((item, index) => {
    const groupName = groupNameMap.get(item.groupId) || '默认相册';
    const desc = item.desc ? `描述：${item.desc}` : '描述：未填写';
    return `${index + 1}. [${groupName}] ${desc}\n   url: ${item.url}`;
  });
  return [
    '【联系人专属相册】',
    '- 当你需要发送图片时，只能从以下相册 URL 中选择，禁止自行编造新链接。',
    '- 输出图片标签格式：{ "type": "image", "url": "..." }',
    ...lines
  ].join('\n');
};
