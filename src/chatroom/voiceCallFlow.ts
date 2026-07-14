import { useCallback, useEffect, useRef, useState } from 'react';
import type { Contact, Message } from '../types';
import { buildCallMessage } from './chatRoomMessageUtils';

type VoiceCallFlowParams = {
  contact: Contact;
  onAppendMessage?: (message: Message) => void;
  onVoiceCallStateChange?: (active: boolean) => void;
  setShowPanel: (panel: 'emoji' | 'more' | 'none') => void;
};

export const useVoiceCallFlow = (params: VoiceCallFlowParams) => {
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [callStartAt, setCallStartAt] = useState<number | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);

  const isIncomingCallOpenRef = useRef(false);
  const isInVoiceCallRef = useRef(false);
  const callDurationSecRef = useRef(0);
  const onAppendMessageRef = useRef(params.onAppendMessage);
  const onVoiceCallStateChangeRef = useRef(params.onVoiceCallStateChange);
  const contactIdRef = useRef(params.contact.id);
  const contactNameRef = useRef(params.contact.remark?.trim() || params.contact.name);

  useEffect(() => {
    params.onVoiceCallStateChange?.(isInVoiceCall);
  }, [isInVoiceCall, params.onVoiceCallStateChange]);

  useEffect(() => {
    onAppendMessageRef.current = params.onAppendMessage;
  }, [params.onAppendMessage]);

  useEffect(() => {
    onVoiceCallStateChangeRef.current = params.onVoiceCallStateChange;
  }, [params.onVoiceCallStateChange]);

  useEffect(() => {
    contactIdRef.current = params.contact.id;
    contactNameRef.current = params.contact.remark?.trim() || params.contact.name;
  }, [params.contact.id, params.contact.name, params.contact.remark]);

  useEffect(() => {
    isIncomingCallOpenRef.current = isIncomingCallOpen;
  }, [isIncomingCallOpen]);

  useEffect(() => {
    isInVoiceCallRef.current = isInVoiceCall;
  }, [isInVoiceCall]);

  useEffect(() => {
    callDurationSecRef.current = callDurationSec;
  }, [callDurationSec]);

  useEffect(() => {
    if (!isInVoiceCall || !callStartAt) return;
    const timer = window.setInterval(() => {
      setCallDurationSec(Math.max(0, Math.floor((Date.now() - callStartAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isInVoiceCall, callStartAt]);

  useEffect(() => {
    return () => {
      onVoiceCallStateChangeRef.current?.(false);
      if (!onAppendMessageRef.current) return;
      if (isInVoiceCallRef.current) {
        onAppendMessageRef.current(
          buildCallMessage(contactIdRef.current, 'ended', '语音通话已结束', callDurationSecRef.current)
        );
        return;
      }
      if (isIncomingCallOpenRef.current) {
        onAppendMessageRef.current(
          buildCallMessage(contactIdRef.current, 'missed', `${contactNameRef.current} 未接通语音通话`, 0)
        );
      }
    };
  }, []);

  const appendCallMessage = useCallback((status: 'missed' | 'ongoing' | 'ended', durationSec?: number, content?: string) => {
    params.onAppendMessage?.(buildCallMessage(params.contact.id, status, content || '', durationSec));
  }, [params]);

  const handleStartVoiceCall = useCallback(() => {
    params.setShowPanel('none');
    setIsIncomingCallOpen(true);
  }, [params]);

  const handleRejectVoiceCall = useCallback(() => {
    setIsIncomingCallOpen(false);
    setIsInVoiceCall(false);
    setCallStartAt(null);
    setCallDurationSec(0);
    appendCallMessage('missed', 0, `${params.contact.remark?.trim() || params.contact.name} 未接通语音通话`);
  }, [appendCallMessage, params.contact.name, params.contact.remark]);

  const handleAcceptVoiceCall = useCallback(() => {
    setIsIncomingCallOpen(false);
    setIsInVoiceCall(true);
    const now = Date.now();
    setCallStartAt(now);
    setCallDurationSec(0);
    appendCallMessage('ongoing', 0, `与 ${params.contact.remark?.trim() || params.contact.name} 开始语音通话`);
  }, [appendCallMessage, params.contact.name, params.contact.remark]);

  const handleEndVoiceCall = useCallback(() => {
    if (!isInVoiceCall) return;
    const duration = callDurationSec;
    setIsInVoiceCall(false);
    setCallStartAt(null);
    setCallDurationSec(0);
    appendCallMessage('ended', duration, '语音通话已结束');
  }, [appendCallMessage, callDurationSec, isInVoiceCall]);

  return {
    isIncomingCallOpen,
    isInVoiceCall,
    callDurationSec,
    handleStartVoiceCall,
    handleRejectVoiceCall,
    handleAcceptVoiceCall,
    handleEndVoiceCall
  };
};
