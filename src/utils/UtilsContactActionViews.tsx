import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Contact, FriendRequest } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { ContactFormData, buildContactFromForm } from './UtilsContactFormModel';
import { ContactFormView } from './UtilsContactFormView';
import { InlineActionRow, TextareaFieldBlock } from './UtilsContactFormPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { parseContactJsonImport } from '../app/contactJsonImportUtils';
import { fetchContactCardImageBlob, resolveBase64ImageData } from './contactCardImage';

const isNativeAndroid = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

const saveImageToAndroidAlbum = async (filename: string, imageDataUrl: string): Promise<boolean> => {
  const base64Data = await resolveBase64ImageData(imageDataUrl);
  try {
    await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true
    });
    return true;
  } catch {
    await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true
    });
    return true;
  }
};

const PROMPT_GENERATOR_URL = '';

const openPromptGenerator = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: PROMPT_GENERATOR_URL });
      return;
    }
  } catch {
    // 回退到浏览器原生打开逻辑
  }

  try {
    globalThis.open?.(PROMPT_GENERATOR_URL, '_blank', 'noopener,noreferrer');
  } catch {
    globalThis.location.href = PROMPT_GENERATOR_URL;
  }
};

export const AddFriendView: React.FC<{
  onBack: () => void;
  onCreate: (contact: Contact) => void;
  onAIGenerate?: (description: string) => Promise<Partial<ContactFormData>>;
  onRequestIncoming?: (form: ContactFormData, greeting: string, openingLine: string) => void;
  onExportQr?: (contact: Contact) => void;
  initialForm?: Partial<ContactFormData>;
  onFormChange?: (form: ContactFormData) => void;
  initialGreeting?: string;
  onGreetingChange?: (value: string) => void;
}> = ({ onBack, onCreate, onAIGenerate, onRequestIncoming, onExportQr, initialForm, onFormChange, initialGreeting = '你好呀，想加你为好友～', onGreetingChange }) => {
  const [greeting, setGreeting] = useState(initialGreeting);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonImportError, setJsonImportError] = useState('');

  useEffect(() => {
    setGreeting(initialGreeting);
  }, [initialGreeting]);

  useEffect(() => {
    if (!onGreetingChange) return;
    onGreetingChange(greeting);
  }, [greeting, onGreetingChange]);

  return (
    <ContactFormView
      title="添加好友"
      onBack={onBack}
      initialForm={initialForm}
      onFormChange={onFormChange}
      topActions={(form, patchForm) => (
        <>
          <div className="render-bg-secondary p-4 border-b render-border-subtle">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="app-button app-button-muted w-full"
                onClick={() => {
                  void openPromptGenerator();
                }}
              >
                提示词生成器
              </button>
              <button
                className="app-button app-button-muted w-full"
                onClick={() => {
                  setJsonImportError('');
                  setJsonInput('');
                  setShowJsonImportModal(true);
                }}
              >
                从 JSON 导入
              </button>
            </div>
          </div>

          {showJsonImportModal && (
            <div className="fixed inset-0 z-[360] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowJsonImportModal(false)}>
              <div className="w-full max-w-[420px] app-surface-panel rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="app-surface-header">
                  <div className="text-[16px] font-semibold render-text-primary">从 JSON 导入</div>
                  <div className="mt-1 text-[12px] render-text-secondary">支持单联系人对象，或带 `contacts` 数组的联系人包。</div>
                </div>
                <div className="app-surface-body">
                  <textarea
                    className="app-field-textarea w-full min-h-[220px] text-[13px] leading-6 render-text-primary"
                    placeholder={`例如：\n{\n  "name": "林雾禾"\n}`}
                    value={jsonInput}
                    onChange={(e) => {
                      setJsonInput(e.target.value);
                      if (jsonImportError) setJsonImportError('');
                    }}
                  />
                  {jsonImportError ? (
                    <div className="mt-3 text-[12px] leading-5 text-red-500">{jsonImportError}</div>
                  ) : (
                    <div className="mt-3 text-[12px] leading-5 render-text-secondary">
                      导入后会直接回填当前表单，已填写内容会被同名字段覆盖。
                    </div>
                  )}
                </div>
                <div className="app-surface-footer">
                  <button
                    className="app-button app-button-muted app-footer-button whitespace-nowrap"
                    onClick={() => setShowJsonImportModal(false)}
                  >
                    取消
                  </button>
                  <button
                    className="app-button app-button-primary app-footer-button whitespace-nowrap"
                    onClick={() => {
                      try {
                        const { patch } = parseContactJsonImport(jsonInput);
                        patchForm(patch);
                        setShowJsonImportModal(false);
                        setJsonImportError('');
                        setJsonInput('');
                      } catch (error) {
                        setJsonImportError(error instanceof Error ? error.message : '导入失败，请检查 JSON 内容');
                      }
                    }}
                  >
                    导入
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      aiEnabled
      onAIGenerate={onAIGenerate}
      footer={(form) => (
        <>
          <SectionDivider label="更多功能" />
          <div className="app-surface-panel">
            <TextareaFieldBlock
              label="主动加好友文案"
              desc="展示在「新的朋友」中。"
              value={greeting}
              placeholder="输入主动加好友文案"
              rowsClassName="h-16 resize-none"
              onChange={setGreeting}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`app-button w-full ${form.name.trim() ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
                disabled={!form.name.trim()}
                onClick={() => {
                  if (!form.name.trim()) return;
                  onRequestIncoming?.(form, greeting.trim(), form.openingLine.trim());
                }}
              >
                对方加我
              </button>
              <button
                className={`app-button w-full ${form.name.trim() ? 'app-button-muted' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
                disabled={!form.name.trim()}
                onClick={() => {
                  if (!form.name.trim()) return;
                  const id = form.wechatId?.trim() || `share-${Date.now()}`;
                  onExportQr?.(buildContactFromForm(form, id));
                }}
              >
                导出联系人名片
              </button>
            </div>
          </div>
        </>
      )}
      onSubmit={(form) => {
        const id = `ai-${Date.now()}`;
        const contact = buildContactFromForm(form, id);
        onCreate(contact);
      }}
      submitLabel="完成"
    />
  );
};

export const NewFriendsView: React.FC<{
  requests: FriendRequest[];
  onBack: () => void;
  onAccept: (requestId: string) => void;
}> = ({ requests, onBack, onAccept }) => (
  <div className="h-full render-bg-primary flex flex-col animate-in slide-in-from-right duration-200">
    <MobileHeader title="新的朋友" onBack={onBack} />
    <div className="flex-1 overflow-y-auto">
      {requests.length === 0 ? (
        <SharedEmptyState className="h-full flex items-center justify-center text-sm">暂无新的朋友</SharedEmptyState>
      ) : requests.map((item, idx) => {
        const displayName = item.contact.remark?.trim() || item.contact.name;
        return (
          <div key={item.id} className={`render-bg-secondary ${idx !== requests.length - 1 ? 'border-b render-border-subtle' : ''}`}>
            <div className="app-list-item">
              <img src={item.contact.avatar} className="w-11 h-11 rounded-md object-cover mr-3" />
              <div className="app-list-item-main min-w-0">
                <div className="app-list-item-title truncate">{displayName}</div>
                <div className="app-list-item-desc truncate">{item.greeting || '请求添加你为朋友'}</div>
              </div>
              {item.status === 'accepted' ? (
                <div className="app-list-item-side">
                  <span className="text-[12px] text-gray-400">已添加</span>
                </div>
              ) : item.status === 'ignored' ? (
                <div className="app-list-item-side">
                  <span className="text-[12px] text-gray-400">已忽略</span>
                </div>
              ) : (
                <div className="app-list-item-side">
                  <button className="app-button app-button-primary" onClick={() => onAccept(item.id)}>接受</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const ContactCardView: React.FC<{
  contact: Contact;
  cardImage: string;
  onBack: () => void;
  onSaveResult?: (ok: boolean) => void;
}> = ({ contact, cardImage, onBack, onSaveResult }) => {
  const handleSave = async () => {
    const filename = `${(contact.remark?.trim() || contact.name || 'contact').replace(/[\\/:*?"<>|]/g, '_')}-名片.png`;

    const triggerDownload = (href: string) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    try {
      if (isNativeAndroid()) {
        const ok = await saveImageToAndroidAlbum(filename, cardImage);
        onSaveResult?.(ok);
        return;
      }

      const blob = await fetchContactCardImageBlob(cardImage);
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
      onSaveResult?.(true);
    } catch {
      onSaveResult?.(false);
    }
  };

  return (
    <div className="h-full render-bg-primary flex flex-col animate-in slide-in-from-right duration-200">
      <MobileHeader title="联系人名片" onBack={onBack} actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={handleSave}>保存到相册</button>} />
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <img src={cardImage} className="w-full max-w-[360px] rounded-2xl border render-border-subtle shadow-sm object-cover" />
      </div>
    </div>
  );
};
