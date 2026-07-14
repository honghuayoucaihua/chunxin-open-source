import React from 'react';
import { MobileHeader } from '../../Common';
import type { AISettings, AppearanceSettings, BubbleTemplate, HtmlTemplate, Mask, SoundVibrationSettings, SubView, UserProfile, WorldBook } from '../../types';
import {
  AISettingsView,
  BubbleWorkshopEditView,
  BubbleWorkshopListView,
  ChatBgSettingsView,
  DisplaySettingsView,
  HtmlTemplateEditView,
  HtmlTemplatesView,
  MaskEditView,
  MasksView,
  SettingsView,
  SkinSettingsView,
  SoundSettingsView,
  StorageSettingsView,
  PromptRuleTreeView,
  WorldBookEditView,
  WorldBooksView
} from '../AppLazyViews';

export type SettingsSubView = Extract<
  SubView,
  | 'settings'
  | 'aiSettings'
  | 'storageSettings'
  | 'worldBooks'
  | 'worldBookEdit'
  | 'promptRuleTree'
  | 'masks'
  | 'maskEdit'
  | 'htmlTemplates'
  | 'htmlTemplateEdit'
  | 'bubbleTemplates'
  | 'bubbleTemplateEdit'
  | 'soundSettings'
  | 'displaySettings'
  | 'skinSettings'
  | 'chatBgSettings'
>;

export type SettingsSubViewParams = {
  subView: SettingsSubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  aiSettings: AISettings;
  onAiSettingsChange: React.Dispatch<React.SetStateAction<AISettings>>;
  settings: AppearanceSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  soundVibrationSettings: SoundVibrationSettings;
  onSoundVibrationSettingsChange: React.Dispatch<React.SetStateAction<SoundVibrationSettings>>;
  worldBooks: WorldBook[];
  onWorldBooksChange: React.Dispatch<React.SetStateAction<WorldBook[]>>;
  editingWorldBook: string | null;
  onEditWorldBook: (id: string) => void;
  onSaveWorldBook: (nextBook: WorldBook) => void;
  masks: Mask[];
  user: UserProfile;
  onUserChange: React.Dispatch<React.SetStateAction<UserProfile>>;
  onMasksChange: React.Dispatch<React.SetStateAction<Mask[]>>;
  onEditMask: (id: string) => void;
  editingMaskId: string | null;
  onSaveMask: (nextMask: Mask) => void;
  htmlTemplates: HtmlTemplate[];
  onHtmlTemplatesChange: React.Dispatch<React.SetStateAction<HtmlTemplate[]>>;
  editingHtmlTemplateId: string | null;
  onEditHtmlTemplate: (id: string) => void;
  onSaveHtmlTemplate: (next: HtmlTemplate) => void;
  bubbleTemplates: BubbleTemplate[];
  onBubbleTemplatesChange: React.Dispatch<React.SetStateAction<BubbleTemplate[]>>;
  editingBubbleTemplateId: string | null;
  onEditBubbleTemplate: (id: string) => void;
  onSaveBubbleTemplate: (next: BubbleTemplate) => void;
  selectedContactId: string | null;
  onSetContactChatBg: (bg: string) => void;
  getSnapshot: () => Promise<any>;
  getTokenUsage: () => Promise<any>;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<void>;
  onClearStorage: () => void;
  onClearMailbox: () => void;
  onClearForums: () => void;
  onClearMusic: () => void;
  onClearAnonymous: () => void;
};

type StorageSettingsRuntimeViewProps = Pick<
  SettingsSubViewParams,
  'goBackSubView'
  | 'getSnapshot'
  | 'getTokenUsage'
  | 'onBackup'
  | 'onRestore'
  | 'onClearStorage'
  | 'onClearMailbox'
  | 'onClearForums'
  | 'onClearMusic'
  | 'onClearAnonymous'
>;

const StorageSettingsRuntimeView: React.FC<StorageSettingsRuntimeViewProps> = ({
  goBackSubView,
  getSnapshot,
  getTokenUsage,
  onBackup,
  onRestore,
  onClearStorage,
  onClearMailbox,
  onClearForums,
  onClearMusic,
  onClearAnonymous
}) => {
  const [snapshot, setSnapshot] = React.useState<any | null>(null);
  const [tokenUsage, setTokenUsage] = React.useState<any | null>(null);
  const [loadError, setLoadError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);
  const snapshotGetterRef = React.useRef(getSnapshot);
  const tokenUsageGetterRef = React.useRef(getTokenUsage);

  snapshotGetterRef.current = getSnapshot;
  tokenUsageGetterRef.current = getTokenUsage;

  React.useEffect(() => {
    let cancelled = false;
    setLoadError('');
    setSnapshot(null);
    setTokenUsage(null);

    void Promise.all([snapshotGetterRef.current(), tokenUsageGetterRef.current()])
      .then(([nextSnapshot, nextTokenUsage]) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
        setTokenUsage(nextTokenUsage);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : '存储数据加载失败');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (!snapshot || !tokenUsage) {
    return (
      <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
        <MobileHeader title="存储管理" onBack={goBackSubView} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-[280px] text-center">
            <div className="text-[15px] font-medium render-text-primary">
              {loadError ? '存储数据加载失败' : '正在读取本地数据...'}
            </div>
            <div className="mt-2 text-[13px] render-text-secondary">
              {loadError || '正在准备备份统计、字数概览和导出数据。'}
            </div>
            {loadError ? (
              <button
                type="button"
                className="mt-4 app-button app-button-primary"
                onClick={() => setReloadKey((prev) => prev + 1)}
              >
                重新加载
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StorageSettingsView
      snapshot={snapshot}
      tokenUsage={tokenUsage}
      onBackup={onBackup}
      onRestore={onRestore}
      onClear={onClearStorage}
      onClearMailbox={onClearMailbox}
      onClearForums={onClearForums}
      onClearMusic={onClearMusic}
      onClearAnonymous={onClearAnonymous}
      onBack={goBackSubView}
    />
  );
};

export const renderSettingsSubView = (params: SettingsSubViewParams) => {
  switch (params.subView) {
    case 'settings':
      return <SettingsView onBack={params.goBackSubView} setSub={params.pushSubView} />;
    case 'aiSettings':
      return <AISettingsView settings={params.aiSettings} setSettings={params.onAiSettingsChange} onBack={params.goBackSubView} />;
    case 'storageSettings':
      return (
        <StorageSettingsRuntimeView
          getSnapshot={params.getSnapshot}
          getTokenUsage={params.getTokenUsage}
          onBackup={params.onBackup}
          onRestore={params.onRestore}
          onClearStorage={params.onClearStorage}
          onClearMailbox={params.onClearMailbox}
          onClearForums={params.onClearForums}
          onClearMusic={params.onClearMusic}
          onClearAnonymous={params.onClearAnonymous}
          goBackSubView={params.goBackSubView}
        />
      );
    case 'worldBooks':
      return <WorldBooksView books={params.worldBooks} setBooks={params.onWorldBooksChange} onBack={params.goBackSubView} onEdit={(book) => params.onEditWorldBook(book.id)} onOpenRuleTree={() => params.pushSubView('promptRuleTree')} />;
    case 'promptRuleTree':
      return <PromptRuleTreeView settings={params.aiSettings} setSettings={params.onAiSettingsChange} onBack={params.goBackSubView} />;
    case 'worldBookEdit': {
      const currentBook = params.worldBooks.find(book => book.id === params.editingWorldBook);
      if (!currentBook) return null;
      return (
        <WorldBookEditView
          book={currentBook}
          onBack={params.goBackSubView}
          onSave={params.onSaveWorldBook}
          onDelete={(id) => params.onWorldBooksChange((prev) => prev.filter((book) => book.id !== id))}
        />
      );
    }
    case 'masks':
      return <MasksView user={params.user} masks={params.masks} onBack={params.goBackSubView} onUpdateMasks={params.onMasksChange} onEditMask={(mask) => params.onEditMask(mask.id)} />;
    case 'maskEdit': {
      const currentMask = params.masks.find(mask => mask.id === params.editingMaskId);
      if (!currentMask) return null;
      return <MaskEditView mask={currentMask} onBack={params.goBackSubView} onSave={params.onSaveMask} />;
    }
    case 'htmlTemplates':
      return <HtmlTemplatesView templates={params.htmlTemplates} setTemplates={params.onHtmlTemplatesChange} onBack={params.goBackSubView} onEdit={(tpl) => params.onEditHtmlTemplate(tpl.id)} />;
    case 'htmlTemplateEdit': {
      const currentTemplate = params.htmlTemplates.find(t => t.id === params.editingHtmlTemplateId);
      if (!currentTemplate) return null;
      return (
        <HtmlTemplateEditView
          template={currentTemplate}
          onBack={params.goBackSubView}
          onSave={params.onSaveHtmlTemplate}
          onDelete={(id) => params.onHtmlTemplatesChange((prev) => prev.filter((t) => t.id !== id))}
        />
      );
    }
    case 'bubbleTemplates':
      return <BubbleWorkshopListView templates={params.bubbleTemplates} setTemplates={params.onBubbleTemplatesChange} onBack={params.goBackSubView} onEdit={(tpl) => params.onEditBubbleTemplate(tpl.id)} />;
    case 'bubbleTemplateEdit': {
      const currentBubble = params.bubbleTemplates.find(t => t.id === params.editingBubbleTemplateId);
      if (!currentBubble) return null;
      return (
        <BubbleWorkshopEditView
          template={currentBubble}
          onBack={params.goBackSubView}
          onSave={params.onSaveBubbleTemplate}
          onDelete={(id) => params.onBubbleTemplatesChange((prev) => prev.filter((t) => t.id !== id))}
        />
      );
    }
    case 'soundSettings':
      return <SoundSettingsView onBack={params.goBackSubView} soundSettings={params.soundVibrationSettings} setSoundSettings={params.onSoundVibrationSettingsChange} />;
    case 'displaySettings':
      return <DisplaySettingsView settings={params.settings} setSettings={params.onSettingsChange} onBack={params.goBackSubView} />;
    case 'skinSettings':
      return <SkinSettingsView onBack={params.goBackSubView} settings={params.settings} setSettings={params.onSettingsChange} aiSettings={params.aiSettings} user={params.user} setUser={params.onUserChange} bubbleTemplates={params.bubbleTemplates} setBubbleTemplates={params.onBubbleTemplatesChange} pushSubView={params.pushSubView} onEditBubbleTemplate={params.onEditBubbleTemplate} />;
    case 'chatBgSettings':
      return (
        <ChatBgSettingsView
          setBg={params.onSetContactChatBg}
          globalBg={params.settings.globalBg}
          setGlobalBg={(value) => params.onSettingsChange(prev => ({ ...prev, globalBg: value }))}
          globalBgOverlayOpacity={params.settings.globalBgOverlayOpacity}
          setGlobalBgOverlayOpacity={(value) => params.onSettingsChange(prev => ({ ...prev, globalBgOverlayOpacity: value }))}
          globalBgBlur={params.settings.globalBgBlur}
          setGlobalBgBlur={(value) => params.onSettingsChange(prev => ({ ...prev, globalBgBlur: value }))}
          headerImage={params.settings.headerImage}
          setHeaderImage={(value) => params.onSettingsChange(prev => ({ ...prev, headerImage: value }))}
          footerImage={params.settings.footerImage}
          setFooterImage={(value) => params.onSettingsChange(prev => ({ ...prev, footerImage: value }))}
          redPacketPreviewBg={params.settings.redPacketPreviewBg}
          setRedPacketPreviewBg={(value) => params.onSettingsChange(prev => ({ ...prev, redPacketPreviewBg: value }))}
          onBack={params.goBackSubView}
        />
      );
    default:
      return null;
  }
};

export const SettingsSubViewRouter: React.FC<SettingsSubViewParams> = (params) => renderSettingsSubView(params);
