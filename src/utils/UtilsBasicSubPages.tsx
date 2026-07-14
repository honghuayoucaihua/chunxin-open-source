import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AISettings, Contact, UserProfile } from '../types';
import { MobileHeader } from '../Common';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { buildShakeContactByAI } from './shakeContactAiRuntimeLoader';

export const SendLocationView: React.FC<{
  onBack: () => void,
  onSend: (loc: { name: string; address: string }) => void,
  recentLocations: { name: string; address: string }[]
}> = ({ onBack, onSend, recentLocations }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const canSend = name.trim() && address.trim();

  const handleSend = () => {
    if (!canSend) return;
    onSend({ name: name.trim(), address: address.trim() });
  };

  return (
    <div className="fixed inset-0 z-[300] render-bg-tertiary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader
         title="发送位置"
         onBack={onBack}
         actions={<button className={`app-button whitespace-nowrap ${canSend ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`} disabled={!canSend} onClick={handleSend}>发送</button>}
      />

      <div className="p-4 flex-1 overflow-y-auto">
         <div className="app-surface-panel mb-6 space-y-3">
            <div className="flex items-center app-field-input transition-colors focus-within:border-[var(--app-accent-color)]">
              <i className="fa-solid fa-location-dot mr-3" style={{ color: 'var(--app-accent-color)' }}></i>
              <input
                 placeholder="第一行：位置名称（如：广州塔）"
                 className="flex-1 bg-transparent outline-none dark:text-white text-[15px]"
                 autoFocus
                 value={name}
                 onChange={e => setName(e.target.value)}
              />
              {name && <i className="fa-solid fa-circle-xmark text-gray-300 ml-2 cursor-pointer" onClick={() => setName('')}></i>}
            </div>

            <div className="flex items-center app-field-input transition-colors focus-within:border-[var(--app-accent-color)]">
              <i className="fa-solid fa-road text-[#3B82F6] mr-3"></i>
              <input
                 placeholder="第二行：详细地址（如：海珠区阅江西路222号）"
                 className="flex-1 bg-transparent outline-none dark:text-white text-[15px]"
                 value={address}
                 onChange={e => setAddress(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              {address && <i className="fa-solid fa-circle-xmark text-gray-300 ml-2 cursor-pointer" onClick={() => setAddress('')}></i>}
            </div>
         </div>

         <div className="px-1">
            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">最近发送</h3>
            <div className="app-surface-panel overflow-hidden">
               {recentLocations.length === 0 ? (
                 <SharedEmptyState className="p-6 text-sm">暂无发送记录</SharedEmptyState>
               ) : (
                 recentLocations.map((item, i) => (
                    <button
                       type="button"
                       key={`${item.name}-${item.address}-${i}`}
                       className={`app-list-item app-list-item--interactive w-full text-left ${i !== recentLocations.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}
                       onClick={() => {
                         setName(item.name || '');
                         setAddress(item.address || '');
                       }}
                    >
                       <i className="fa-solid fa-clock-rotate-left text-gray-300 mr-4 text-sm mt-1"></i>
                       <div className="app-list-item-main min-w-0">
                         <div className="app-list-item-title truncate">{item.name}</div>
                         <div className="app-list-item-desc truncate">{item.address}</div>
                       </div>
                    </button>
                 ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

// 扫一扫
export const ScanView: React.FC<{ onBack: () => void; onScanImage?: (file: File) => void }> = ({ onBack, onScanImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setScanning(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 z-10" style={{ paddingTop: 'var(--safe-top)', height: 'calc(48px + var(--safe-top))' }}>
         <button onClick={onBack} className="app-icon-button text-white text-xl bg-white/10 border border-white/15"><i className="fa-solid fa-chevron-left"></i></button>
         <h2 className="flex-1 text-center text-white font-medium text-[17px]">扫一扫</h2>
         <button className="app-icon-button text-white text-xl bg-white/10 border border-white/15"><i className="fa-solid fa-ellipsis-h"></i></button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
         <div className="w-64 h-64 border-2 border-white/30 relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: 'var(--app-accent-color)' }}></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: 'var(--app-accent-color)' }}></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: 'var(--app-accent-color)' }}></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: 'var(--app-accent-color)' }}></div>
            {scanning && (
              <div className="absolute top-0 left-0 right-0 h-0.5 animate-scan-move" style={{ backgroundColor: 'var(--app-accent-color)', boxShadow: '0 0 8px var(--app-accent-color)' }}></div>
            )}
         </div>
         <p className="absolute bottom-20 text-white/70 text-sm">将二维码/条码放入框内，即可自动扫描</p>
      </div>

      <div className="h-28 flex items-center justify-around px-8 pb-safe">
         <button type="button" className="flex flex-col items-center space-y-2 text-white/50">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl border border-white/10"><i className="fa-solid fa-bolt"></i></div>
            <span className="text-[11px]">开灯</span>
         </button>
         <button type="button" className="flex flex-col items-center space-y-2" style={{ color: 'var(--app-accent-color)' }}>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl border" style={{ borderColor: 'var(--app-accent-color)' }}><i className="fa-solid fa-qrcode"></i></div>
            <span className="text-[11px]">名片</span>
         </button>
         <button type="button" className="flex flex-col items-center space-y-2 text-white/50" onClick={() => fileInputRef.current?.click()}>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl border border-white/10"><i className="fa-solid fa-image"></i></div>
            <span className="text-[11px]">相册</span>
         </button>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onScanImage?.(file);
        if (e.target) e.target.value = '';
      }} />
    </div>
  );
};

type ShakePreference = {
  gender: '不限' | '男生' | '女生' | '非二元';
  age: '不限' | '18-22' | '23-27' | '28-32' | '33+';
  personality: '不限' | '温柔' | '理性' | '活泼' | '文艺' | '技术';
  identity: '不限' | '学生' | '职场新人' | '自由职业' | '创作者' | '互联网从业';
  trait: '不限' | '同城' | '高频聊天' | '有边界感' | '幽默感' | '自律';
};

const SHAKE_FILTERS = {
  gender: ['不限', '男生', '女生', '非二元'] as const,
  age: ['不限', '18-22', '23-27', '28-32', '33+'] as const,
  personality: ['不限', '温柔', '理性', '活泼', '文艺', '技术'] as const,
  identity: ['不限', '学生', '职场新人', '自由职业', '创作者', '互联网从业'] as const,
  trait: ['不限', '同城', '高频聊天', '有边界感', '幽默感', '自律'] as const,
};

const DEFAULT_SHAKE_PREFERENCE: ShakePreference = {
  gender: '不限',
  age: '不限',
  personality: '不限',
  identity: '不限',
  trait: '不限'
};

const formatShakeResultMeta = (contact: Contact): string => {
  const parts = [contact.occupation, contact.region]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return parts.join(' · ') || '新朋友';
};

export const ShakeView: React.FC<{
  onBack: () => void;
  contacts: Contact[];
  user: UserProfile;
  aiSettings: AISettings;
  onCreateContact: (contact: Contact) => void;
}> = ({ onBack, contacts, user, aiSettings, onCreateContact }) => {
  const [preference, setPreference] = useState<ShakePreference>(DEFAULT_SHAKE_PREFERENCE);
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [result, setResult] = useState<Contact | null>(null);

  const activeFilters = [preference.gender, preference.age, preference.personality, preference.identity, preference.trait].filter(item => item !== '不限');
  const filterSummary = activeFilters.length ? activeFilters.slice(0, 2).join(' · ') : '筛选';

  const handleShake = () => {
    if (isShaking) return;
    setResult(null);
    setIsShaking(true);
    window.setTimeout(async () => {
      try {
        const next = await buildShakeContactByAI(preference, contacts.filter(c => !c.isGroup && c.id !== 'officialAccounts'), aiSettings, user);
        setResult(next);
      } catch (error: any) {
        setResult(null);
        window.alert(error?.message || 'AI 生成失败');
      } finally {
        setIsShaking(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* 顶部安全区适配 */}
      <header 
        className="flex-shrink-0 px-4 flex items-center relative z-10"
        style={{ paddingTop: 'var(--safe-top)', height: 'calc(48px + var(--safe-top))' }}
      >
        <button onClick={onBack} className="app-icon-button text-white text-xl"><i className="fa-solid fa-chevron-left"></i></button>
        <h2 className="flex-1 text-center text-[17px] font-medium">摇一摇</h2>
        <button onClick={() => setShowTagSheet(true)} className="app-button app-button-muted text-white text-[13px] px-2.5 py-1 border border-white/30 bg-white/5 backdrop-blur">
          {filterSummary}
        </button>
      </header>

      <div className="flex-1 relative overflow-hidden" onClick={handleShake}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,.35),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(59,130,246,.35),transparent_42%),radial-gradient(circle_at_50%_85%,rgba(168,85,247,.25),transparent_45%)]" />
        <div className="shake-blob shake-blob-1" />
        <div className="shake-blob shake-blob-2" />
        <div className="shake-blob shake-blob-3" />

        <div className={`absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[150px] h-[264px] rounded-[30px] border border-white/25 bg-black/55 shadow-[0_24px_60px_rgba(0,0,0,.45)] backdrop-blur-md ${isShaking ? 'wechat-shake-phone' : ''}`}>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full"></div>
          <div className="absolute inset-4 rounded-[20px] bg-gradient-to-b from-white/10 to-white/[0.03] border border-white/10 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full border border-white/35 flex items-center justify-center mb-3">
              <i className="fa-solid fa-hand-point-up text-[28px] text-white/90"></i>
            </div>
            <div className="text-[12px] text-white/75">轻触开始匹配</div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center px-5 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur" style={{ bottom: 'calc(40px + var(--safe-bottom))' }}>
          <div className="text-white/80 text-[13px]">筛选越精准，匹配越贴近</div>
        </div>
      </div>

      {result && (
        <div className="px-4 flex-shrink-0" style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
          <div className="app-surface-panel bg-white/10 border-white/10 flex items-center gap-3">
              <img src={result.avatar || '/assets/image/user.png'} className="w-12 h-12 rounded-md object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium truncate">{result.name}</div>
              <div className="text-[12px] text-white/70 truncate">{formatShakeResultMeta(result)}</div>
            </div>
            <button
              className="app-button app-button-primary"
              onClick={(e) => {
                e.stopPropagation();
                onCreateContact(result);
              }}
            >
              发消息
            </button>
          </div>
        </div>
      )}

      {showTagSheet && (
        <div className="fixed inset-0 z-[520] bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTagSheet(false)}>
          <div className="absolute inset-0 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-xl mx-auto min-h-full flex flex-col">
              <div className="h-12 flex items-center justify-between">
                <button className="app-button app-button-muted text-white/70 text-sm bg-white/5 border-white/15" onClick={() => setPreference(DEFAULT_SHAKE_PREFERENCE)}>重置</button>
                <div className="text-white font-medium">精准筛选</div>
                <button className="app-icon-button text-white text-xl bg-white/5 border border-white/15" onClick={() => setShowTagSheet(false)}><i className="fa-solid fa-xmark"></i></button>
              </div>

              <div className="mt-4 space-y-5 pb-10">
                {([
                  { key: 'gender', label: '性别偏好' },
                  { key: 'age', label: '年龄区间' },
                  { key: 'personality', label: '性格特征' },
                  { key: 'identity', label: '身份特点' },
                  { key: 'trait', label: '个人特征' }
                ] as const).map(section => (
                  <div key={section.key} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                    <div className="text-[13px] text-white/80 mb-3">{section.label}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {SHAKE_FILTERS[section.key].map(item => {
                        const selected = preference[section.key] === item;
                        return (
                          <button
                            key={item}
                            className={`h-10 rounded-xl text-[13px] transition-all ${selected ? 'text-white border border-white/60 bg-white/20' : 'text-white/75 border border-white/15 bg-white/5'}`}
                            onClick={() => setPreference(prev => ({ ...prev, [section.key]: item }))}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 py-3 bg-gradient-to-t from-black via-black/90 to-transparent">
                <button
                  className="app-button app-button-primary w-full h-11"
                  onClick={() => setShowTagSheet(false)}
                >
                  完成筛选
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 小程序页面
