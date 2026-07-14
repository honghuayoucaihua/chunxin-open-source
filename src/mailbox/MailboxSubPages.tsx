// MailboxSubPages.tsx — Main router / re-export hub
// All component implementations live in ./mailbox/ sub-modules.
// This file re-exports them so that existing import paths remain valid.

// ── Types (defined here so every consumer can import from this file) ──
export type MailboxSkinMode = 'mailbox' | 'postbox' | 'retro';
export interface MailboxThemeSettings {
  skin: MailboxSkinMode;
  paperBackground?: string;
  fontColor?: string;
  signatureImage?: string;
  stampImage?: string;
  myMaskId?: string;
}

// ── Theme utilities ──
export {
  resolveMailboxPageStyle,
  resolveMailboxPaperStyle,
  resolveMailboxContainerClass,
  resolveMailboxRowClass,
  resolveMailboxPanelClass,
  resolveMailboxSheetClass,
  resolveMailboxLetterClass,
  resolveMailboxRecipientLineClass,
  resolveMailboxStampClass,
  resolveMailboxStampStyle
} from './mailboxThemeUtils';

// ── View components ──
export { MailboxHomeView } from './MailboxHomeView';
export { MailComposeView } from './MailComposeView';
export { MailInboxView, MailSentView } from './MailInboxView';
export { MailLetterDetailView } from './MailLetterDetailView';
export { MailboxContactsView, MailboxSettingsView } from './MailboxSettingsView';
