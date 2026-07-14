import React from 'react';
import { Contact, ContactMemoryEntry } from '../types';
import { SectionDivider } from '../Common';
import { ContactFormView, buildContactPersonality } from '../utils/UtilsSubPages';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';

export const ContactPersonaView: React.FC<{
  contact: Contact;
  memories: ContactMemoryEntry[];
  onBack: () => void;
  onUpdate: (contact: Contact) => void;
  onUpdateMemories: (memories: ContactMemoryEntry[]) => void;
  onViewMemories: () => void;
}> = ({ contact, memories, onBack, onUpdate, onUpdateMemories, onViewMemories }) => (
  (() => {
    const isReadOnly = !!contact.encryptedReadOnly;
    if (isReadOnly) {
      return (
        <div className="h-full render-bg-primary flex flex-col animate-in slide-in-from-right duration-200">
          <div className="border-b render-border-subtle render-bg-secondary" style={{ paddingTop: 'var(--safe-padding-top, 0px)' }}>
            <div className="h-11 px-3 flex items-center justify-between">
              <button className="w-10 h-10 -ml-2 flex items-center justify-center" onClick={onBack}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <div className="font-medium">更多信息</div>
              <div className="w-10" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-3 mt-3 px-3 py-2 rounded-md text-[12px] bg-amber-500/10 text-amber-600">
              该联系人来自加密导入，当前为只读不可编辑
            </div>
            <SectionDivider label="长期记忆" />
            <div className="render-bg-secondary">
              <InlineActionRow
                label="记忆管理"
                rightText={`${memories.length} 条记忆`}
                onClick={onViewMemories}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
  <ContactFormView
    title="更多信息"
    onBack={onBack}
    submitLabel="保存"
    initialContact={contact}
    onSubmit={(form) => {
      const updated = {
        ...contact,
        name: form.name.trim(),
        avatar: form.avatar,
        remark: form.remark,
        wechatId: form.wechatId || contact.wechatId,
        region: form.region,
        signature: form.signature,
        balance: form.balance,
        age: form.age,
        gender: form.gender,
        constellation: form.constellation,
        mbti: form.mbti,
        occupation: form.occupation,
        relationship: form.relationship,
        personalityTraits: form.personalityTraits,
        hobbies: form.hobbies,
        description: form.description,
        catchphrase: form.catchphrase,
        patDesc: form.patDesc,
        openingLine: form.openingLine,
        // 独立人设字段
        persona: form.persona,
        background: form.background,
        expressionStyle: form.expressionStyle,
        language: form.language,
        translateToChinese: form.translateToChinese,
        sentenceRange: { min: form.sentenceRangeMin, max: form.sentenceRangeMax },
        replyLimit: form.replyLimit,
        allowRichActions: form.allowRichActions,
        socialPostLimit: form.socialPostLimit,
        minimaxTTS: {
          enabled: form.minimaxTTSEnabled,
          voiceId: form.minimaxVoiceId,
          speed: form.minimaxSpeed,
          language: form.minimaxLanguage,
        },
      } as Contact;

      const personality = updated.isAi ? buildContactPersonality(form) : updated.personality;

      onUpdate({
        ...updated,
        personality,
      });
    }}
    extraSections={
      <>
        <SectionDivider label="长期记忆" />
        <div className="render-bg-secondary">
          <InlineActionRow
            label="记忆管理"
            rightText={`${memories.length} 条记忆`}
            onClick={onViewMemories}
          />
        </div>
        {memories.length > 0 && (
          <div className="render-bg-secondary px-4 py-3 border-b render-border-subtle">
            <div className="text-xs text-gray-400 mb-2">最近记忆</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {memories.slice(0, 3).map(m => (
                <div key={m.id} className="text-[13px] text-gray-600 dark:text-gray-300 truncate">
                  • {m.text}
                </div>
              ))}
              {memories.length > 3 && (
                <div className="text-[12px] text-gray-400">还有 {memories.length - 3} 条...</div>
              )}
            </div>
          </div>
        )}
      </>
    }
  />
    );
  })()
);
