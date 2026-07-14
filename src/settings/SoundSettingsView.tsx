import React, { useRef } from 'react';
import { SoundVibrationSettings } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { InlineActionRow, InlineSwitchRow } from '../utils/UtilsContactFormPrimitives';

interface SoundSettingsViewProps {
  onBack: () => void;
  soundSettings: SoundVibrationSettings;
  setSoundSettings: (next: SoundVibrationSettings) => void;
}

export const SoundSettingsView: React.FC<SoundSettingsViewProps> = ({
  onBack,
  soundSettings,
  setSoundSettings
}) => {
  const sendSoundInputRef = useRef<HTMLInputElement>(null);
  const receiveSoundInputRef = useRef<HTMLInputElement>(null);

  const updateSound = (patch: Partial<typeof soundSettings>) => {
    setSoundSettings({ ...soundSettings, ...patch });
  };

  const handleSoundFileUpload = (key: 'sendSoundSrc' | 'receiveSoundSrc', file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
      alert('请选择有效的音频文件（mp3, wav, ogg, m4a, aac, webm）');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('音频文件大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateSound({
          [key]: dataUrl,
          [key === 'sendSoundSrc' ? 'sendSoundEnabled' : 'receiveSoundEnabled']: true
        } as Partial<typeof soundSettings>);
      }
    };
    reader.onerror = () => {
      alert('文件读取失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  const clearCustomSound = (key: 'sendSoundSrc' | 'receiveSoundSrc') => {
    updateSound({ [key]: '' } as Partial<typeof soundSettings>);
  };

  const isCustomUploaded = (src: string) => src.startsWith('data:audio/');

  const getSoundDisplayName = (src: string) => {
    if (!src) return '未设置';
    if (src.startsWith('data:audio/')) return '自定义音效';
    return src;
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <input
        type="file"
        ref={sendSoundInputRef}
        className="hidden"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSoundFileUpload('sendSoundSrc', file);
          if (e.target) e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={receiveSoundInputRef}
        className="hidden"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSoundFileUpload('receiveSoundSrc', file);
          if (e.target) e.target.value = '';
        }}
      />

      <MobileHeader title="声音与震动" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="消息音效" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="发送消息音效"
            active={soundSettings.sendSoundEnabled}
            onChange={() => updateSound({ sendSoundEnabled: !soundSettings.sendSoundEnabled })}
          />
        </div>
        <div className="render-bg-secondary px-4 py-2 border-b render-border-subtle text-xs text-gray-500">
          当前：{soundSettings.sendSoundEnabled ? getSoundDisplayName(soundSettings.sendSoundSrc) : '已关闭'}
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="使用默认音效" rightText="fasong.mp3" onClick={() => updateSound({ sendSoundSrc: '/assets/sound/fasong.mp3', sendSoundEnabled: true })} />
          <InlineActionRow label="上传自定义音效" rightText="选择文件" onClick={() => sendSoundInputRef.current?.click()} />
          {isCustomUploaded(soundSettings.sendSoundSrc) && (
            <InlineActionRow label="清除自定义音效" rightText="删除" danger onClick={() => clearCustomSound('sendSoundSrc')} />
          )}
        </div>

        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="接收消息音效"
            active={soundSettings.receiveSoundEnabled}
            onChange={() => updateSound({ receiveSoundEnabled: !soundSettings.receiveSoundEnabled })}
          />
        </div>
        <div className="render-bg-secondary px-4 py-2 border-b render-border-subtle text-xs text-gray-500">
          当前：{soundSettings.receiveSoundEnabled ? getSoundDisplayName(soundSettings.receiveSoundSrc) : '已关闭'}
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="使用默认音效" rightText="jieshou.mp3" onClick={() => updateSound({ receiveSoundSrc: '/assets/sound/jieshou.mp3', receiveSoundEnabled: true })} />
          <InlineActionRow label="上传自定义音效" rightText="选择文件" onClick={() => receiveSoundInputRef.current?.click()} />
          {isCustomUploaded(soundSettings.receiveSoundSrc) && (
            <InlineActionRow label="清除自定义音效" rightText="删除" danger onClick={() => clearCustomSound('receiveSoundSrc')} />
          )}
        </div>

        <SectionDivider label="震动" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="震动提醒"
            desc="安卓 APK 场景可用"
            active={soundSettings.vibrationEnabled}
            onChange={() => updateSound({ vibrationEnabled: !soundSettings.vibrationEnabled })}
          />
        </div>

        <SectionDivider label="说明" />
        <div className="render-bg-secondary px-4 py-3 text-xs text-gray-500 leading-relaxed">
          <p>• 自定义音效支持 mp3、wav、ogg、m4a、aac、webm 格式</p>
          <p>• 文件大小限制 2MB，音频将保存在本地浏览器中</p>
          <p>• 清除浏览器数据后，自定义音效将丢失</p>
        </div>
      </div>
    </div>
  );
};
