export const resolveLanguageHint = (language?: string) => {
  const lang = String(language || '').trim();
  if (!lang || lang === '普通话') return '';
  const map: Record<string, string> = {
    粤语: '粤语',
    英语: 'English',
    日语: '日本語',
    韩语: '한국어',
    法语: 'Français',
    德语: 'Deutsch',
    西班牙语: 'Español',
    俄语: 'Русский',
    阿拉伯语: 'العربية',
    葡萄牙语: 'Português',
    意大利语: 'Italiano'
  };
  return map[lang] || lang;
};
