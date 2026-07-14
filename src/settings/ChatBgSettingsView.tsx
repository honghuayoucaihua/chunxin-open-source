import React, { useRef } from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { compressImage } from '../services/imageService';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';

interface ChatBgSettingsViewProps {
  setBg: (b: string) => void;
  globalBg?: string;
  setGlobalBg: (b: string) => void;
  globalBgOverlayOpacity?: number;
  setGlobalBgOverlayOpacity: (value: number) => void;
  globalBgBlur?: number;
  setGlobalBgBlur: (value: number) => void;
  headerImage?: string;
  setHeaderImage: (b: string) => void;
  footerImage?: string;
  setFooterImage: (b: string) => void;
  redPacketPreviewBg?: string;
  setRedPacketPreviewBg: (b: string) => void;
  onBack: () => void;
}

export const ChatBgSettingsView: React.FC<ChatBgSettingsViewProps> = ({
  setBg,
  globalBg,
  setGlobalBg,
  globalBgOverlayOpacity,
  setGlobalBgOverlayOpacity,
  globalBgBlur,
  setGlobalBgBlur,
  headerImage,
  setHeaderImage,
  footerImage,
  setFooterImage,
  redPacketPreviewBg,
  setRedPacketPreviewBg,
  onBack
}) => {
  const safeOverlayOpacity = Number.isFinite(Number(globalBgOverlayOpacity))
    ? Math.max(0, Math.min(1, Number(globalBgOverlayOpacity)))
    : 0.2;
  const safeGlobalBgBlur = Number.isFinite(Number(globalBgBlur))
    ? Math.max(0, Math.min(30, Number(globalBgBlur)))
    : 10;

  const chatBgFileInputRef = useRef<HTMLInputElement>(null);
  const globalBgFileInputRef = useRef<HTMLInputElement>(null);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const footerImageInputRef = useRef<HTMLInputElement>(null);
  const redPacketBgFileInputRef = useRef<HTMLInputElement>(null);

  const handleChatBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setBg(dataUrl);
      } catch (err) {
        console.error('图片压缩失败:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleGlobalBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setGlobalBg(dataUrl);
      } catch (err) {
        console.error('图片压缩失败:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleHeaderImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setHeaderImage(dataUrl);
      } catch (err) {
        console.error('顶栏图片处理失败:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleFooterImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setFooterImage(dataUrl);
      } catch (err) {
        console.error('底栏图片处理失败:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleRedPacketBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setRedPacketPreviewBg(dataUrl);
      } catch (err) {
        console.error('红包封面图片处理失败:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <input type="file" ref={chatBgFileInputRef} className="hidden" accept="image/*" onChange={handleChatBgFile} />
      <input type="file" ref={globalBgFileInputRef} className="hidden" accept="image/*" onChange={handleGlobalBgFile} />
      <input type="file" ref={headerImageInputRef} className="hidden" accept="image/*" onChange={handleHeaderImageFile} />
      <input type="file" ref={footerImageInputRef} className="hidden" accept="image/*" onChange={handleFooterImageFile} />
      <input type="file" ref={redPacketBgFileInputRef} className="hidden" accept="image/*" onChange={handleRedPacketBgFile} />
      <MobileHeader title="背景图片" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="全局背景" />
        <div className="render-bg-secondary px-4 py-2 text-xs text-gray-500 border-b render-border-subtle">
          {globalBg ? '已设置全局背景' : '未设置，使用默认背景'}
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="上传全局背景" onClick={() => globalBgFileInputRef.current?.click()} />
          {globalBg && <InlineActionRow label="清除全局背景" danger onClick={() => setGlobalBg('')} />}
        </div>
        <div className="render-bg-secondary px-4 py-3 border-b render-border-subtle space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm render-text-primary mb-1">
              <span>背景遮罩透明度</span>
              <span className="text-xs render-text-secondary">{Math.round(safeOverlayOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(safeOverlayOpacity * 100)}
              onChange={(e) => setGlobalBgOverlayOpacity(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm render-text-primary mb-1">
              <span>背景毛玻璃</span>
              <span className="text-xs render-text-secondary">{Math.round(safeGlobalBgBlur)}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={Math.round(safeGlobalBgBlur)}
              onChange={(e) => setGlobalBgBlur(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <SectionDivider label="顶栏与底栏图片" />
        <div className="render-bg-secondary px-4 py-2 text-xs text-gray-500 border-b render-border-subtle">
          可替换全部页面头部与底部导航背景，自动适配当前皮肤风格
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="上传顶栏图片" rightText={headerImage ? '已设置' : '未设置'} onClick={() => headerImageInputRef.current?.click()} />
          {headerImage && <InlineActionRow label="清除顶栏图片" danger onClick={() => setHeaderImage('')} />}
          <InlineActionRow label="上传底栏图片" rightText={footerImage ? '已设置' : '未设置'} onClick={() => footerImageInputRef.current?.click()} />
          {footerImage && <InlineActionRow label="清除底栏图片" danger onClick={() => setFooterImage('')} />}
        </div>

        <SectionDivider label="红包封面" />
        <div className="render-bg-secondary px-4 py-2 text-xs text-gray-500 border-b render-border-subtle">
          设置红包弹窗的背景图，未设置时使用默认样式
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="上传红包背景" rightText={redPacketPreviewBg ? '已设置' : '未设置'} onClick={() => redPacketBgFileInputRef.current?.click()} />
          {redPacketPreviewBg && <InlineActionRow label="恢复红包默认背景" danger onClick={() => setRedPacketPreviewBg('')} />}
        </div>

        <SectionDivider label="聊天背景" />
        <div className="render-bg-secondary px-4 py-2 text-xs text-gray-500 border-b render-border-subtle">
          设置当前聊天背景图，优先级高于全局背景
        </div>
        <div className="render-bg-secondary">
          <InlineActionRow label="从相册选择" onClick={() => chatBgFileInputRef.current?.click()} />
          <InlineActionRow label="恢复默认背景" onClick={() => setBg('')} />
        </div>
      </div>
    </div>
  );
};
