import React from 'react';
import { MailboxSkinMode, MailboxThemeSettings } from './MailboxSubPages';

export const resolveMailboxPageStyle = (theme: MailboxThemeSettings): React.CSSProperties => {
  const skinOverrides: Record<MailboxSkinMode, Partial<React.CSSProperties>> = {
    mailbox: {
      fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
      backgroundColor: '#dbe7f7',
      backgroundImage: 'radial-gradient(circle at 12% 10%, #eef4ff 0%, transparent 34%), radial-gradient(circle at 90% 18%, #f5f9ff 0%, transparent 36%), linear-gradient(180deg, #dbe7f7 0%, #cfdcf0 100%)'
    },
    postbox: {
      fontFamily: '"Noto Serif SC","Songti SC",serif',
      letterSpacing: '0.01em',
      backgroundColor: '#ecd9bc',
      backgroundImage: 'radial-gradient(circle at 10% 12%, #f7ecdb 0%, transparent 38%), radial-gradient(circle at 84% 20%, #f2e4cc 0%, transparent 40%), linear-gradient(180deg, #ecd9bc 0%, #ddc59f 100%)'
    },
    retro: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      color: '#22311f',
      backgroundColor: '#8e9f76',
      backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(242,248,216,0.45) 0%, transparent 52%), repeating-linear-gradient(0deg, rgba(34,48,30,0.08) 0, rgba(34,48,30,0.08) 2px, transparent 2px, transparent 4px), linear-gradient(180deg, #93a67a 0%, #84956d 100%)'
    }
  };
  return {
    ...skinOverrides[theme.skin],
    minHeight: '100%',
    ...(theme.fontColor ? { color: theme.fontColor } : {})
  };
};

export const resolveMailboxPaperStyle = (theme: MailboxThemeSettings): React.CSSProperties => {
  const skinPaperTone: Record<MailboxSkinMode, string> = {
    mailbox: '#eef3ff',
    postbox: '#f3e6cf',
    retro: '#c9d7ae'
  };
  const skinTexture: Record<MailboxSkinMode, string> = {
    mailbox: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(235,243,255,0.18) 100%)',
    postbox: 'radial-gradient(circle at 20% 20%, rgba(136,90,43,0.08) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(136,90,43,0.06) 0, transparent 38%)',
    retro: 'linear-gradient(180deg, rgba(234,243,202,0.45) 0%, rgba(201,215,174,0.2) 100%)'
  };
  return {
    backgroundColor: skinPaperTone[theme.skin],
    backgroundImage: theme.paperBackground ? `url(${theme.paperBackground})` : skinTexture[theme.skin],
    backgroundSize: theme.paperBackground ? 'cover' : undefined,
    backgroundPosition: theme.paperBackground ? 'center' : undefined,
    border: theme.skin === 'postbox' ? '1px solid #ceb28a' : 'none',
    boxShadow: theme.skin === 'postbox' ? '0 8px 24px rgba(108,74,39,0.14), inset 0 0 0 1px rgba(255,255,255,0.35)' : 'none',
    ...(theme.paperBackground ? { backgroundImage: `url(${theme.paperBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    ...(theme.fontColor ? { color: theme.fontColor } : {})
  };
};

export const resolveMailboxContainerClass = (theme: MailboxThemeSettings): string => {
  if (theme.skin === 'retro') return 'border-[3px] border-[#384b33] rounded-[10px] bg-[#bccca0] shadow-[inset_0_0_0_2px_#dbe8c1,inset_0_0_0_4px_#7b8f66,0_10px_20px_rgba(28,40,24,0.35)]';
  if (theme.skin === 'postbox') return 'border border-[#c7ad86] bg-[#efdfc3] shadow-[0_4px_14px_rgba(112,72,31,0.16)]';
  return 'border border-[#b8c9e4] bg-[#eaf1fc] shadow-[0_4px_14px_rgba(33,57,96,0.16)]';
};

export const resolveMailboxRowClass = (theme: MailboxThemeSettings): string => {
  if (theme.skin === 'retro') return 'w-full h-12 px-4 flex items-center justify-between border-b border-[#445a3d] bg-[#bccca0] text-[#22311f] active:bg-[#2f442b] active:text-[#e8f0d7] transition-colors';
  if (theme.skin === 'postbox') return 'w-full h-12 px-4 flex items-center justify-between border-b border-[#ccb28f] bg-[#f6ead4] text-[#4a3221] active:bg-[#ecdcbf]';
  return 'w-full h-12 px-4 flex items-center justify-between border-b border-[#c7d4ea] bg-[#f6f9ff] text-[#2a3547] active:bg-[#e5edf9]';
};

export const resolveMailboxPanelClass = (theme: MailboxThemeSettings): string => {
  if (theme.skin === 'retro') return 'border-t-2 border-[#445a3d] bg-[#bccca0]';
  if (theme.skin === 'postbox') return 'border-t border-[#c7ad86] bg-[#efdfc3]';
  return 'border-t border-[#b8c9e4] bg-[#eaf1fc]';
};

export const resolveMailboxSheetClass = (theme: MailboxThemeSettings): string => {
  if (theme.skin === 'retro') return 'min-h-full px-5 py-4 border-2 border-[#455b3d] shadow-[inset_0_0_0_2px_#83966f]';
  if (theme.skin === 'postbox') return 'min-h-full px-5 py-4 border border-[#ceb28a] shadow-[0_8px_22px_rgba(100,68,37,0.14)]';
  return 'min-h-full px-5 py-4 border border-[#c8d7ed] shadow-[0_8px_22px_rgba(34,66,110,0.14)]';
};

export const resolveMailboxLetterClass = (theme: MailboxThemeSettings): string => {
  if (theme.skin === 'retro') return 'text-[15px] leading-[30px] tracking-[0.02em]';
  if (theme.skin === 'postbox') return 'text-[17px] leading-[38px] tracking-[0.01em]';
  return 'text-[16px] leading-[34px]';
};

export const resolveMailboxRecipientLineClass = (theme: MailboxThemeSettings, selectedName: string): string => {
  const base = selectedName
    ? 'inline-flex items-center h-[32px] px-1 border-b border-transparent'
    : 'inline-flex items-center h-[32px] w-[180px] border-b border-dashed';
  if (theme.skin === 'retro') return `${base} ${selectedName ? 'hover:border-[#3e5337]' : 'border-[#3e5337]'}`;
  if (theme.skin === 'postbox') return `${base} ${selectedName ? 'hover:border-[#9b6d3f]' : 'border-[#9b6d3f]'}`;
  return `${base} ${selectedName ? 'hover:border-[#5f7ea8]' : 'border-[#5f7ea8]'}`;
};

export const resolveMailboxStampClass = (theme: MailboxThemeSettings, canSend: boolean): string => {
  const active = canSend ? 'active:scale-95' : 'opacity-40';
  if (theme.skin === 'retro') return `fixed right-5 bottom-2 w-[98px] h-[98px] rounded-md text-[#2f4b2c] bg-[#cfe0ac] flex items-center justify-center rotate-[-4deg] transition-transform z-[302] ${active}`;
  if (theme.skin === 'postbox') return `fixed right-5 bottom-2 w-[102px] h-[102px] rounded-full text-[#8f3c2e] bg-[#fbf3e8] flex items-center justify-center rotate-[-10deg] transition-transform z-[302] ${active}`;
  return `fixed right-5 bottom-2 w-[102px] h-[102px] rounded-full text-[#365b8d] bg-[#f1f6ff] flex items-center justify-center rotate-[-8deg] transition-transform z-[302] ${active}`;
};

export const resolveMailboxStampStyle = (theme: MailboxThemeSettings): React.CSSProperties => {
  if (theme.skin === 'retro') return { boxShadow: 'inset 0 0 0 2px #2f4b2c, inset 0 0 0 8px #cfe0ac' };
  if (theme.skin === 'postbox') return { boxShadow: 'inset 0 0 0 2px #8f3c2e, inset 0 0 0 8px #fbf3e8, inset 0 0 0 10px #8f3c2e' };
  return { boxShadow: 'inset 0 0 0 2px #365b8d, inset 0 0 0 8px #f1f6ff, inset 0 0 0 10px #365b8d' };
};
