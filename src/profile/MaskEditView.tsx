import React, { useState } from 'react';
import { Mask } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { InlineFieldRow, TextareaFieldBlock } from '../utils/UtilsContactFormPrimitives';

// 编辑面具视图
export const MaskEditView: React.FC<{
  mask: Mask;
  onBack: () => void;
  onSave: (mask: Mask) => void;
}> = ({ mask, onBack, onSave }) => {
  const [form, setForm] = useState<Mask>({ ...mask });

  const updateField = (key: keyof Mask, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...form, updatedAt: Date.now() });
    onBack();
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="编辑面具"
        onBack={onBack}
        actions={
          <button
            className="app-button app-button-primary"
            onClick={handleSave}
          >
            保存
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="基本信息" />
        <div className="render-bg-secondary">
          <InlineFieldRow
            label="名称"
            value={form.name}
            placeholder="面具名称"
            onChange={value => updateField('name', value)}
          />
        </div>

        <SectionDivider label="人设属性" />
        <div className="render-bg-secondary">
          <InlineFieldRow
            label="年龄"
            value={form.age || ''}
            placeholder="如：25"
            onChange={value => updateField('age', value)}
          />
          <div className="app-list-item">
            <div className="app-list-item-main max-w-[7rem]">
              <div className="app-list-item-title">性别</div>
            </div>
            <div className="app-list-item-side flex-1">
              <select
                className="app-field-select app-list-item-input app-list-item-select text-[14px] render-text-primary"
                value={form.gender || 'male'}
                onChange={e => updateField('gender', e.target.value)}
              >
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          <InlineFieldRow
            label="星座"
            value={form.constellation || ''}
            placeholder="如：天蝎座"
            onChange={value => updateField('constellation', value)}
          />
          <InlineFieldRow
            label="MBTI"
            value={form.mbti || ''}
            placeholder="如：INTJ"
            onChange={value => updateField('mbti', value)}
          />
          <InlineFieldRow
            label="职业"
            value={form.occupation || ''}
            placeholder="如：程序员"
            onChange={value => updateField('occupation', value)}
          />
          <InlineFieldRow
            label="性格"
            value={form.personalityTraits || ''}
            placeholder="如：内向、理性"
            onChange={value => updateField('personalityTraits', value)}
          />
          <InlineFieldRow
            label="兴趣爱好"
            value={form.hobbies || ''}
            placeholder="如：游戏、音乐"
            onChange={value => updateField('hobbies', value)}
          />
        </div>

        <SectionDivider label="详细设定" />
        <TextareaFieldBlock
          label="人设描述"
          value={form.description || ''}
          placeholder="详细描述这个面具的性格、背景、说话风格等..."
          rowsClassName="min-h-[100px] leading-relaxed"
          onChange={value => updateField('description', value)}
        />
        <div className="render-bg-secondary">
          <InlineFieldRow
            label="口头禅"
            value={form.catchphrase || ''}
            placeholder="这个面具的标志性口头禅..."
            onChange={value => updateField('catchphrase', value)}
          />
        </div>
      </div>
    </div>
  );
};
