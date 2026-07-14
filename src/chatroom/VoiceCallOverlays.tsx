import React from 'react';
import type { Contact, Message } from '../types';

type VoiceCallOverlaysProps = {
  isInVoiceCall: boolean;
  isIncomingCallOpen: boolean;
  contact: Contact;
  callDurationSec: number;
  messages: Message[];
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  onEndVoiceCall: () => void;
  onRejectVoiceCall: () => void;
  onAcceptVoiceCall: () => void;
};

const VoiceCallOverlays: React.FC<VoiceCallOverlaysProps> = ({
  isInVoiceCall,
  isIncomingCallOpen,
  contact,
  callDurationSec,
  messages,
  inputValue,
  setInputValue,
  onSend,
  onEndVoiceCall,
  onRejectVoiceCall,
  onAcceptVoiceCall
}) => (
  <>
    {isInVoiceCall && (
      <div className="fixed inset-0 z-[520] bg-gradient-to-b from-[#2B2B2B] via-[#1A1A1A] to-[#101010] text-white">
        <div className="h-full w-full flex flex-col">
          <div className="px-5 pb-4 border-b border-white/10 flex-shrink-0" style={{ paddingTop: 'calc(40px + var(--safe-top))' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-white/60">语音通话中</div>
                <div className="text-[22px] font-semibold mt-1">{contact.remark?.trim() || contact.name}</div>
              </div>
              <div className="text-[20px] font-mono tracking-wide text-[#86F09A]">
                {Math.floor(callDurationSec / 60).toString().padStart(2, '0')}:{(callDurationSec % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="px-6 pt-4 flex flex-col items-center">
            <img src={contact.avatar} className="w-28 h-28 app-avatar-radius object-cover shadow-2xl ring-2 ring-white/20" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.filter((item) => item.type === 'text' || item.type === 'voice').slice(-30).map((item, idx) => {
              const mine = item.senderId === 'me';
              return (
                <div key={`call-dialog-${item.id}-${item.timestamp}-${idx}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${mine ? 'text-white rounded-br-md' : 'bg-white/12 text-white rounded-bl-md border border-white/15'}`} style={mine ? { backgroundColor: 'var(--app-accent-color)' } : {}}>
                    {item.type === 'voice' ? `【语音】${item.content || ''}` : item.content}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 pt-3 border-t border-white/10 flex-shrink-0" style={{ paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
            <div className="flex items-center gap-2">
              <textarea
                className="flex-1 h-11 max-h-24 resize-none rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/45 px-3 py-2 outline-none"
                placeholder="输入文字发送给对方…"
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                className="h-11 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--app-accent-color)' }}
                disabled={!inputValue.trim()}
                onClick={() => onSend()}
              >
                发送
              </button>
            </div>
            <button
              className="w-full mt-3 h-11 rounded-full bg-danger text-white font-semibold whitespace-nowrap"
              onClick={onEndVoiceCall}
            >
              挂断
            </button>
          </div>
        </div>
      </div>
    )}

    {isIncomingCallOpen && (
      <div className="fixed inset-0 z-[500] bg-gradient-to-b from-[#2B2B2B] via-[#1A1A1A] to-[#101010] text-white" onClick={(e) => e.stopPropagation()}>
        <div className="h-full w-full flex flex-col items-center justify-between px-8" style={{ paddingTop: 'calc(56px + var(--safe-top))', paddingBottom: 'calc(56px + var(--safe-bottom))' }}>
          <div className="text-center">
            <div className="text-[14px] text-white/70 tracking-wide">语音通话</div>
            <div className="text-[28px] font-semibold mt-2">{contact.remark?.trim() || contact.name}</div>
            <div className="text-[13px] text-white/65 mt-2">邀请你进行语音通话</div>
          </div>

          <div className="flex flex-col items-center">
            <img src={contact.avatar} className="w-28 h-28 app-avatar-radius object-cover shadow-2xl ring-2 ring-white/20" />
            <div className="mt-4 text-[13px] text-white/65">轻触按钮进行操作</div>
          </div>

          <div className="w-full max-w-[360px]">
            <div className="flex items-center justify-between px-4">
              <button className="flex flex-col items-center" onClick={onRejectVoiceCall}>
                <div className="w-16 h-16 rounded-full bg-danger text-white text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <i className="fa-solid fa-phone-slash"></i>
                </div>
                <span className="text-[12px] text-white/80 mt-2">拒绝</span>
              </button>
              <button className="flex flex-col items-center" onClick={onAcceptVoiceCall}>
                <div className="w-16 h-16 rounded-full text-white text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform" style={{ backgroundColor: 'var(--app-accent-color)' }}>
                  <i className="fa-solid fa-phone"></i>
                </div>
                <span className="text-[12px] text-white/80 mt-2">接听</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

export default VoiceCallOverlays;
