import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Contact } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { compressImage } from '../services/imageService';
import { ContactFormData, buildContactFormData } from './UtilsContactFormModel';
import {
  CONSTELLATIONS,
  CONTACT_OUTPUT_LANGUAGES,
  MBTI_LIST,
  MINIMAX_LANGUAGES
} from './UtilsContactFormFields';
import {
  InlineFieldRow,
  InlineRangeRow,
  InlineSegmentedRow,
  InlineSelectRow,
  InlineToggleRow,
  TextareaFieldBlock
} from './UtilsContactFormPrimitives';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';

export const ContactFormView: React.FC<{
  title: string;
  onBack: () => void;
  onSubmit: (form: ContactFormData) => void;
  submitLabel?: string;
  initialContact?: Contact;
  initialForm?: Partial<ContactFormData>;
  aiEnabled?: boolean;
  onAIGenerate?: (description: string) => Promise<Partial<ContactFormData>>;
  onFormChange?: (form: ContactFormData) => void;
  footer?: React.ReactNode | ((form: ContactFormData) => React.ReactNode);
  extraSections?: React.ReactNode;
  topActions?: React.ReactNode | ((form: ContactFormData, patchForm: (patch: Partial<ContactFormData>) => void) => React.ReactNode);
}> = ({ title, onBack, onSubmit, submitLabel = '完成', initialContact, initialForm, aiEnabled = false, onAIGenerate, onFormChange, footer, extraSections, topActions }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevContactIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const buildInitialForm = useCallback((): ContactFormData => {
    return {
      ...buildContactFormData(initialContact),
      ...(initialForm || {})
    };
  }, [initialContact, initialForm]);
  const [form, setForm] = useState<ContactFormData>(() => buildInitialForm());
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const contactId = initialContact?.id ? String(initialContact.id) : null;
    if (contactId === prevContactIdRef.current) return;
    prevContactIdRef.current = contactId;
    setForm(buildInitialForm());
  }, [buildInitialForm, initialContact?.id]);

  useEffect(() => {
    if (!onFormChange) return;
    onFormChange(form);
  }, [form, onFormChange]);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({ ...form, name: form.name.trim() });
  };

  const handleInput = (key: keyof ContactFormData, value: ContactFormData[keyof ContactFormData]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const patchForm = (patch: Partial<ContactFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleAIGenerate = async () => {
    if (!onAIGenerate || !aiPrompt.trim() || isGenerating) return;
    const runtimeResetEpoch = captureRuntimeResetEpoch();
    setIsGenerating(true);
    try {
      const next = await onAIGenerate(aiPrompt.trim());
      if (!isMountedRef.current || isRuntimeResetEpochStale(runtimeResetEpoch)) return;
      if (next && typeof next === 'object') {
        setForm((prev) => ({ ...prev, ...next }));
      }
    } finally {
      if (isMountedRef.current && !isRuntimeResetEpochStale(runtimeResetEpoch)) {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="h-full render-bg-primary flex flex-col animate-in slide-in-from-right duration-200">
      <MobileHeader
        title={title}
        onBack={onBack}
        actions={
          <button
            className="app-button app-button-primary whitespace-nowrap"
            disabled={!form.name.trim()}
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {topActions ? (typeof topActions === 'function' ? topActions(form, patchForm) : topActions) : null}

        {aiEnabled && (
          <div className="app-surface-panel rounded-none border-x-0 border-t-0">
            <div className="app-surface-body !pt-3">
              <div className="text-[12px] text-gray-400 mb-2">描述联系人，AI 自动填写全部字段</div>
              <div className="app-field-row items-stretch">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="例如：28岁上海产品经理，理性温和，爱骑行和美食，女"
                  className="app-field-textarea flex-1 h-20 text-[14px] render-text-primary"
                />
                <button
                  className="app-button app-button-primary whitespace-nowrap"
                  disabled={!aiPrompt.trim() || isGenerating}
                  onClick={handleAIGenerate}
                >
                  {isGenerating ? '生成中...' : 'AI生成'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="render-bg-secondary p-4 flex items-center space-x-4 border-b render-border-subtle">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const dataUrl = await compressImage(file);
              handleInput('avatar', dataUrl);
            } catch (err) {
              console.error('图片压缩失败:', err);
            }
            if (e.target) e.target.value = '';
          }} />
          <img src={form.avatar || '/assets/image/user.png'} className="w-16 h-16 rounded-md object-cover shadow-sm" />
          <button className="app-button app-button-muted whitespace-nowrap" onClick={() => fileInputRef.current?.click()}>
            修改头像
          </button>
        </div>

        <SectionDivider label="基础信息" />
        <div className="render-bg-secondary">
          <InlineFieldRow label="姓名" value={form.name} placeholder="必填" onChange={(v) => handleInput('name', v)} />
          <InlineFieldRow label="备注" value={form.remark} placeholder="可选" onChange={(v) => handleInput('remark', v)} />
          <InlineFieldRow label="账号ID" value={form.wechatId} placeholder="可选" onChange={(v) => handleInput('wechatId', v)} />
          <InlineFieldRow label="地区" value={form.region} placeholder="如：上海" onChange={(v) => handleInput('region', v)} />
          <InlineFieldRow label="余额" value={String(form.balance)} placeholder="如：128.5" onChange={(v) => handleInput('balance', Number(v) || 0)} />
          <InlineFieldRow label="个性签名" value={form.signature} placeholder="可选" onChange={(v) => handleInput('signature', v)} />
        </div>

        <SectionDivider label="人设构建" />
        <div className="render-bg-secondary">
          <InlineFieldRow label="年龄" value={form.age} placeholder="如：24" onChange={(v) => handleInput('age', v)} />
          <InlineSegmentedRow
            label="性别"
            value={form.gender || ''}
            options={[{ key: '', label: '未填写' }, { key: 'female', label: '女' }, { key: 'male', label: '男' }, { key: 'other', label: '其他' }]}
            onChange={(v) => handleInput('gender', v as ContactFormData['gender'])}
          />
          <InlineSelectRow label="星座" value={form.constellation} options={CONSTELLATIONS} emptyLabel="未填写" onChange={(v) => handleInput('constellation', v)} />
          <InlineSelectRow label="MBTI" value={form.mbti} options={MBTI_LIST} emptyLabel="未填写" onChange={(v) => handleInput('mbti', v)} />
          <InlineFieldRow label="职业" value={form.occupation} placeholder="如：插画师" onChange={(v) => handleInput('occupation', v)} />
          <InlineFieldRow label="与我关系" value={form.relationship} placeholder="如：同事、大学同学、伴侣" onChange={(v) => handleInput('relationship', v)} />
          <InlineFieldRow label="性格" value={form.personalityTraits} placeholder="如：温柔、细腻" onChange={(v) => handleInput('personalityTraits', v)} />
          <InlineFieldRow label="兴趣爱好" value={form.hobbies} placeholder="如：画画、音乐" onChange={(v) => handleInput('hobbies', v)} />
          <InlineFieldRow label="口头禅" value={form.catchphrase} placeholder="如：让我想想" onChange={(v) => handleInput('catchphrase', v)} />
          <InlineFieldRow label="拍一拍" value={form.patDesc} placeholder="如：拍了拍我头上的小揪揪" onChange={(v) => handleInput('patDesc', v)} />
          <TextareaFieldBlock label="描述" value={form.description} placeholder="补充人物背景" rowsClassName="h-24" onChange={(v) => handleInput('description', v)} />
          <TextareaFieldBlock label="开场白" value={form.openingLine} placeholder="如：嗨，今天过得怎么样？" rowsClassName="h-24" onChange={(v) => handleInput('openingLine', v)} />
          <InlineSelectRow label="输出语言" value={form.language} options={CONTACT_OUTPUT_LANGUAGES} onChange={(v) => {
            handleInput('language', v);
            if (v !== '普通话') handleInput('translateToChinese', true);
          }} />
          {form.language !== '普通话' && (
            <InlineToggleRow
              label="翻译成中文"
              desc="开启后回复将按“原文 + 简体中文”双语输出"
              active={form.translateToChinese}
              onToggle={() => handleInput('translateToChinese', !form.translateToChinese)}
            />
          )}
        </div>

        <SectionDivider label="核心人设" />
        <TextareaFieldBlock label="人设定位" desc="概括这个角色的核心形象" value={form.persona} placeholder="描述角色核心人设..." rowsClassName="h-24" onChange={(v) => handleInput('persona', v)} />
        <TextareaFieldBlock label="背景故事" desc="角色的成长经历、人生轨迹、重要事件等背景信息" value={form.background} placeholder="描述角色的背景故事..." rowsClassName="h-24" onChange={(v) => handleInput('background', v)} />
        <TextareaFieldBlock label="表达风格" desc="说话方式、语气特点、常用表达习惯等" value={form.expressionStyle} placeholder='如：说话轻柔，喜欢用"呢"、"呀"等语气词，偶尔会发颜文字...' rowsClassName="h-20" onChange={(v) => handleInput('expressionStyle', v)} />

        <SectionDivider label="聊天偏好" />
        <div className="render-bg-secondary">
          <InlineRangeRow label="分句范围" min={form.sentenceRangeMin} max={form.sentenceRangeMax} onChangeMin={(v) => handleInput('sentenceRangeMin', v)} onChangeMax={(v) => handleInput('sentenceRangeMax', v)} />
          <InlineFieldRow label="回复字数上限" value={String(form.replyLimit)} placeholder="如：120" onChange={(v) => handleInput('replyLimit', Number(v) || 0)} />
          <InlineToggleRow label="允许朋友圈/订阅号" active={form.allowRichActions} onToggle={() => handleInput('allowRichActions', !form.allowRichActions)} />
          <InlineFieldRow label="发布次数" value={String(form.socialPostLimit)} placeholder="如：1" onChange={(v) => handleInput('socialPostLimit', Math.max(Number(v) || 0, 0))} />
        </div>

        <SectionDivider label="MiniMax 语音合成" />
        <div className="render-bg-secondary">
          <InlineToggleRow label="启用角色 TTS" desc="启用后可配置 voice_id、语速和语言" active={form.minimaxTTSEnabled} onToggle={() => handleInput('minimaxTTSEnabled', !form.minimaxTTSEnabled)} />
          {form.minimaxTTSEnabled && (
            <>
              <InlineFieldRow label="voice_id" value={form.minimaxVoiceId} placeholder="输入 MiniMax voice_id" onChange={(v) => handleInput('minimaxVoiceId', v)} />
              <InlineFieldRow label="语速" value={String(form.minimaxSpeed)} placeholder="默认 1.0" onChange={(v) => handleInput('minimaxSpeed', Number(v) || 1)} />
              <InlineSelectRow label="语言" value={form.minimaxLanguage} options={MINIMAX_LANGUAGES} onChange={(v) => handleInput('minimaxLanguage', v)} />
            </>
          )}
        </div>

        {extraSections}
        {typeof footer === 'function' ? footer(form) : footer}
      </div>
    </div>
  );
};
