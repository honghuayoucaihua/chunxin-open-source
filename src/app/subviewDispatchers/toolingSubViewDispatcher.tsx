import React from 'react';
import type { Contact, SubView } from '../../types';
import { renderUtilityFinanceSubView } from '../subviews/utilityFinanceSubViews';
import { DivinationSubViewRouter, MailboxSubViewRouter, SettingsSubViewRouter } from '../AppLazySubViews';
import type { AppSubViewRenderParams } from '../subviewRenderParams/types';
import type { DivinationSubView } from '../subviews/divinationSubViews';
import type { MailboxSubView } from '../subviews/mailboxSubViews';
import type { SettingsSubView } from '../subviews/settingsSubViews';
import type { UtilityFinanceSubView } from '../subviews/utilityFinanceSubViews';

export const renderToolingSubView = (params: AppSubViewRenderParams, subView: SubView): React.ReactNode => {
  const divinationSubView: DivinationSubView | null = (
    subView === 'divination'
    || subView === 'divinationResult'
    || subView === 'divinationHistory'
  ) ? subView : null;
  if (divinationSubView) {
    return (
      <DivinationSubViewRouter
        subView={divinationSubView}
        goBackSubView={params.goBackSubView}
        draft={params.divinationDraft}
        onDraftChange={params.setDivinationDraft}
        history={params.divinationHistory}
        currentRecord={params.currentDivinationRecord}
        submitting={params.divinationSubmitting}
        onSubmit={params.handleSubmitDivination}
        onOpenHistory={params.handleOpenDivinationHistory}
        onSelectHistory={params.handleSelectDivinationHistory}
      />
    );
  }

  const settingsSubView: SettingsSubView | null = (
    subView === 'settings'
    || subView === 'aiSettings'
    || subView === 'storageSettings'
    || subView === 'worldBooks'
    || subView === 'worldBookEdit'
    || subView === 'promptRuleTree'
    || subView === 'masks'
    || subView === 'maskEdit'
    || subView === 'htmlTemplates'
    || subView === 'htmlTemplateEdit'
    || subView === 'bubbleTemplates'
    || subView === 'bubbleTemplateEdit'
    || subView === 'soundSettings'
    || subView === 'displaySettings'
    || subView === 'skinSettings'
    || subView === 'chatBgSettings'
  ) ? subView : null;
  if (settingsSubView) {
    return (
      <SettingsSubViewRouter
        subView={settingsSubView}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        aiSettings={params.aiSettings}
        onAiSettingsChange={params.setAiSettings}
        settings={params.settings}
        onSettingsChange={params.setSettings}
        soundVibrationSettings={params.soundVibrationSettings}
        onSoundVibrationSettingsChange={params.setSoundVibrationSettings}
        worldBooks={params.worldBooks}
        onWorldBooksChange={params.setWorldBooks}
        editingWorldBook={params.editingWorldBook}
        onEditWorldBook={params.handleEditWorldBook}
        onSaveWorldBook={params.handleSaveWorldBook}
        masks={params.masks}
        user={params.user}
        onUserChange={params.setUser}
        onMasksChange={params.setMasks}
        onEditMask={params.handleEditMask}
        editingMaskId={params.editingMaskId}
        onSaveMask={params.handleSaveMask}
        htmlTemplates={params.htmlTemplates || []}
        onHtmlTemplatesChange={params.setHtmlTemplates}
        editingHtmlTemplateId={params.editingHtmlTemplateId}
        onEditHtmlTemplate={params.handleEditHtmlTemplate}
        onSaveHtmlTemplate={params.handleSaveHtmlTemplate}
        bubbleTemplates={params.bubbleTemplates || []}
        onBubbleTemplatesChange={params.setBubbleTemplates}
        editingBubbleTemplateId={params.editingBubbleTemplateId}
        onEditBubbleTemplate={params.handleEditBubbleTemplate}
        onSaveBubbleTemplate={params.handleSaveBubbleTemplate}
        selectedContactId={params.selectedContactId}
        onSetContactChatBg={params.handleSetContactChatBg}
        getSnapshot={params.buildSnapshot}
        getTokenUsage={params.estimateTokens}
        onBackup={params.handleBackup}
        onRestore={params.handleRestore}
        onClearStorage={params.handleClearStorage}
        onClearMailbox={params.handleClearMailboxData}
        onClearForums={params.handleClearForumData}
        onClearMusic={params.handleClearMusicData}
        onClearAnonymous={params.handleClearAnonymousData}
      />
    );
  }

  const utilityFinanceSubView: UtilityFinanceSubView | null = (
    subView === 'pay'
    || subView === 'receivePay'
    || subView === 'wallet'
    || subView === 'walletTopUp'
    || subView === 'walletWithdraw'
    || subView === 'miniprograms'
    || subView === 'favorites'
    || subView === 'emojiGroups'
    || subView === 'imageLibraryGroups'
  ) ? subView : null;
  if (utilityFinanceSubView) {
    return renderUtilityFinanceSubView({
      subView: utilityFinanceSubView,
      goBackSubView: params.goBackSubView,
      pushSubView: params.pushSubView,
      walletBalance: params.walletBalance,
      walletBank: params.walletBank,
      onEditWalletBank: params.handleEditWalletBank,
      onWalletTopUpConfirm: params.handleWalletTopUpConfirm,
      onWalletWithdrawConfirm: params.handleWalletWithdrawConfirm,
      favorites: params.favorites,
      contacts: params.contacts,
      user: params.user
    });
  }

  const mailboxSubView: MailboxSubView | null = (
    subView === 'mailbox'
    || subView === 'mailboxCompose'
    || subView === 'mailboxInbox'
    || subView === 'mailboxSent'
    || subView === 'mailboxLetterDetail'
    || subView === 'mailboxContacts'
    || subView === 'mailboxSettings'
  ) ? subView : null;
  if (mailboxSubView) {
    return (
      <MailboxSubViewRouter
        subView={mailboxSubView}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        contacts={params.contacts}
        user={params.user}
        worldBooks={params.worldBooks.map((worldBook: { id: string; name: string }) => ({ id: worldBook.id, name: worldBook.name }))}
        masks={params.masks}
        mailboxTheme={params.mailboxTheme}
        onMailboxThemeChange={params.setMailboxTheme}
        inboxLetters={params.inboxLetters}
        sentLetters={params.sentLetters}
        selectedMailboxType={params.selectedMailboxType}
        selectedMailboxLetter={params.selectedMailboxLetter}
        onSelectMailboxLetter={params.handleSelectMailboxLetter}
        onSendMailboxLetter={params.handleSendMailboxLetter}
        onContactWorldBooksChange={(contactId: string, worldBookIds: string[]) => params.setContacts((prev: Contact[]) => prev.map((contact) => {
          if (contact.id !== contactId) return contact;
          return { ...contact, worldBookIds };
        }))}
        onContactSignatureImageChange={(contactId: string, dataUrl: string) => params.setContacts((prev: Contact[]) => prev.map((contact) => {
          if (contact.id !== contactId) return contact;
          return { ...contact, signatureImage: dataUrl };
        }))}
        onContactStampImageChange={(contactId: string, dataUrl: string) => params.setContacts((prev: Contact[]) => prev.map((contact) => {
          if (contact.id !== contactId) return contact;
          return { ...contact, stampImage: dataUrl };
        }))}
      />
    );
  }

  return null;
};
