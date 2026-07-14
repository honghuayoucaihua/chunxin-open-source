export type EmojiMessageLayoutClasses = {
  containerClass: string;
  imageClass: string;
};

export const buildEmojiMessageLayoutClasses = (input: { isMe: boolean }): EmojiMessageLayoutClasses => {
  const alignClass = input.isMe ? 'ml-auto' : 'mr-auto';
  return {
    containerClass: `${alignClass} inline-flex items-start`,
    imageClass: 'block w-[120px] h-[120px] object-contain object-top max-w-none shrink-0'
  };
};
