const COMMUNITY_AUTHOR_NAME_KEY = 'community_author_name';
const COMMUNITY_AUTHOR_PASSWORD_KEY = 'community_author_password';

const safeGetItem = (key: string): string => {
  try {
    return String(localStorage.getItem(key) || '');
  } catch {
    return '';
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 本地记住作者信息失败不应影响社区上传或查询。
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const readCommunityAuthorCredentials = (): { authorName: string; authorPassword: string } => ({
  authorName: safeGetItem(COMMUNITY_AUTHOR_NAME_KEY).trim(),
  authorPassword: safeGetItem(COMMUNITY_AUTHOR_PASSWORD_KEY).trim()
});

export const saveCommunityAuthorCredentials = (authorName: string, authorPassword: string): void => {
  safeSetItem(COMMUNITY_AUTHOR_NAME_KEY, authorName.trim());
  safeSetItem(COMMUNITY_AUTHOR_PASSWORD_KEY, authorPassword.trim());
};

export const clearCommunityAuthorCredentials = (): void => {
  safeRemoveItem(COMMUNITY_AUTHOR_NAME_KEY);
  safeRemoveItem(COMMUNITY_AUTHOR_PASSWORD_KEY);
};
