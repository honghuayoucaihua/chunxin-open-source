const escapeHtml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);

const applyInlineMarkdown = (value: string): string => {
  return value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
};

const renderInline = (value: string): string => applyInlineMarkdown(escapeHtml(value));

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => renderInline(cell.trim()));
};

const isTableDivider = (line: string): boolean => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  if (!trimmed) return false;
  return trimmed.split('|').every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
};

const isTableBlock = (lines: string[], index: number): boolean => {
  if (index + 1 >= lines.length) return false;
  const current = lines[index].trim();
  const next = lines[index + 1].trim();
  return current.includes('|') && isTableDivider(next);
};

export const markdownToHtml = (source: string): string => {
  const normalized = String(source || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const html: string[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let quoteBuffer: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
    inCodeBlock = false;
    codeBuffer = [];
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    html.push(`<p>${paragraphBuffer.join('<br/>')}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listType || !listBuffer.length) return;
    html.push(`<${listType}>${listBuffer.join('')}</${listType}>`);
    listType = null;
    listBuffer = [];
  };

  const flushQuote = () => {
    if (!quoteBuffer.length) return;
    html.push(`<blockquote><p>${quoteBuffer.join('<br/>')}</p></blockquote>`);
    quoteBuffer = [];
  };

  const flushBlocks = () => {
    flushCodeBlock();
    flushQuote();
    flushList();
    flushParagraph();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushQuote();
        flushList();
        flushParagraph();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushQuote();
      flushList();
      flushParagraph();
      continue;
    }

    if (isTableBlock(lines, index)) {
      flushBlocks();
      const headerCells = splitTableRow(lines[index]);
      const bodyRows: string[] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        const rowCells = splitTableRow(lines[index]);
        bodyRows.push(`<tr>${rowCells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`);
        index += 1;
      }
      index -= 1;
      html.push(
        `<table><thead><tr>${headerCells.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${bodyRows.join('')}</tbody></table>`
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushBlocks();
      html.push('<hr/>');
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const blockquote = trimmed.match(/^>\s?(.*)$/);
    if (blockquote) {
      flushList();
      flushParagraph();
      quoteBuffer.push(renderInline(blockquote[1]));
      continue;
    }

    const ordered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (ordered) {
      flushQuote();
      flushParagraph();
      if (listType && listType !== 'ol') {
        flushList();
      }
      listType = 'ol';
      listBuffer.push(`<li>${renderInline(ordered[2])}</li>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushQuote();
      flushParagraph();
      if (listType && listType !== 'ul') {
        flushList();
      }
      listType = 'ul';
      listBuffer.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    flushQuote();
    flushList();
    paragraphBuffer.push(renderInline(trimmed));
  }

  flushBlocks();
  return html.join('');
};
