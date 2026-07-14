const isNonEmptyLine = (
  line: string | undefined | null | false
): line is string => typeof line === 'string' && line.trim().length > 0;

export const buildSection = (
  title: string,
  lines: ReadonlyArray<string | undefined | null | false>
) => {
  const content = lines.filter(isNonEmptyLine);
  if (content.length === 0) return '';
  return `\n\n【${title}】\n${content.join('\n')}`;
};

export const joinPromptSections = (sections: ReadonlyArray<string>) =>
  sections.filter((section) => section.trim()).join('').trim();
