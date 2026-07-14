type EmojiLike = {
  id: string;
  url: string;
  desc: string;
};

const EMOJI_TOKEN_REGEX = /\[emoji:([^\]]+)\]/gi;

export const collectResolvedEmojiTokens = (
  content: string,
  resolveEmoji: (desc: string) => EmojiLike | null
): Array<{ key: string; url: string; desc: string }> => {
  if (!content) return [];
  return Array.from(content.matchAll(EMOJI_TOKEN_REGEX))
    .map((hit, idx) => {
      const desc = String(hit[1] || '').trim();
      const emoji = resolveEmoji(desc);
      if (!emoji) return null;
      return {
        key: `${emoji.id}-${idx}`,
        url: emoji.url,
        desc: emoji.desc
      };
    })
    .filter(Boolean) as Array<{ key: string; url: string; desc: string }>;
};

export const stripResolvedEmojiTokens = (
  content: string,
  resolveEmoji: (desc: string) => EmojiLike | null
): string => {
  if (!content) return content;
  return content.replace(EMOJI_TOKEN_REGEX, (full, desc) => (
    resolveEmoji(String(desc || '').trim()) ? '' : full
  ));
};
