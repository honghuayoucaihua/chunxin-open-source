import React from 'react';
import {
  InlineFieldRow,
  InlineRangeRow,
  InlineSegmentedRow,
  InlineSelectRow,
  InlineToggleRow,
  TextareaFieldBlock
} from './UtilsContactFormPrimitives';

export const CONSTELLATIONS = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
export const MBTI_LIST = ['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'];
export const CONTACT_OUTPUT_LANGUAGES = ['普通话','粤语','英语','日语','韩语','法语','德语','西班牙语','俄语','阿拉伯语','葡萄牙语','意大利语'];
export const MINIMAX_LANGUAGES = [
  '中文（Chinese）','粤语（Cantonese）','英语（English）','西班牙语（Spanish）','法语（French）','俄语（Russian）','德语（German）',
  '葡萄牙语（Portuguese）','阿拉伯语（Arabic）','意大利语（Italian）','日语（Japanese）','韩语（Korean）','印尼语（Indonesian）',
  '越南语（Vietnamese）','土耳其语（Turkish）','荷兰语（Dutch）','乌克兰语（Ukrainian）','泰语（Thai）','波兰语（Polish）',
  '罗马尼亚语（Romanian）','希腊语（Greek）','捷克语（Czech）','芬兰语（Finnish）','印地语（Hindi）','保加利亚语（Bulgarian）',
  '丹麦语（Danish）','希伯来语（Hebrew）','马来语（Malay）','波斯语（Persian）','斯洛伐克语（Slovak）','瑞典语（Swedish）',
  '克罗地亚语（Croatian）','菲律宾语（Filipino）','匈牙利语（Hungarian）','挪威语（Norwegian）','斯洛文尼亚语（Slovenian）',
  '加泰罗尼亚语（Catalan）','尼诺斯克语（Nynorsk）','泰米尔语（Tamil）','阿非利卡语（Afrikaans）'
];

export const WeChatRow: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: any) => void;
}> = ({ label, value, placeholder, onChange }) => <InlineFieldRow label={label} value={value} placeholder={placeholder || ''} onChange={onChange} />;

export const SelectRow: React.FC<{
  label: string;
  value: string;
  options: string[];
  emptyLabel?: string;
  onChange: (v: string) => void;
}> = ({ label, value, options, emptyLabel, onChange }) => <InlineSelectRow label={label} value={value} options={options} emptyLabel={emptyLabel} onChange={onChange} />;

export const RangeRow: React.FC<{
  label: string;
  min: number;
  max: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}> = ({ label, min, max, onChangeMin, onChangeMax }) => <InlineRangeRow label={label} min={min} max={max} onChangeMin={onChangeMin} onChangeMax={onChangeMax} />;

export const ToggleRow: React.FC<{ label: string; desc?: string; active: boolean; onToggle: () => void }> = ({ label, desc, active, onToggle }) => <InlineToggleRow label={label} desc={desc} active={active} onToggle={onToggle} />;

export const WeChatTextarea: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ label, value, placeholder, onChange }) => <TextareaFieldBlock label={label} value={value} placeholder={placeholder || ''} rowsClassName="h-20" onChange={onChange} />;

export const GenderRow: React.FC<{
  value: 'male' | 'female' | 'other';
  onChange: (v: 'male' | 'female' | 'other') => void;
}> = ({ value, onChange }) => (
  <InlineSegmentedRow
    label="性别"
    value={value}
    options={[{ key: 'female', label: '女' }, { key: 'male', label: '男' }, { key: 'other', label: '其他' }]}
    onChange={(next) => onChange(next as 'male' | 'female' | 'other')}
  />
);
