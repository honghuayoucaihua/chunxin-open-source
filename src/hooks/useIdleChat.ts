import { useEffect, useRef } from 'react';
import type { Contact } from '../types';

interface UseIdleChatParams {
  isInChatView: boolean;
  isInputFocused: boolean;
  currentContact: Contact | undefined;
  triggerProactiveChat: (contact: Contact) => Promise<void>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

export function useIdleChat(params: UseIdleChatParams) {
  const {
    isInChatView, isInputFocused, currentContact,
    triggerProactiveChat, setContacts
  } = params;

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isInChatView || isInputFocused || !currentContact) return;
    if (!currentContact.isAi || currentContact.isGroup) return;
    if (!currentContact.idleChatEnabled) return;

    const timeoutSeconds = Math.max(5, Number(currentContact.idleChatTimeoutSeconds || 30));
    const cooldownMs = timeoutSeconds * 1000;
    const now = Date.now();
    const lastIdleAt = Number(currentContact.lastIdleChatAt || 0);

    if (now - lastIdleAt < cooldownMs) {
      const remaining = cooldownMs - (now - lastIdleAt);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const idleAt = Date.now();
        setContacts(prev => prev.map(c => c.id === currentContact.id ? { ...c, lastIdleChatAt: idleAt } : c));
        triggerProactiveChat(currentContact);
      }, remaining);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const idleAt = Date.now();
      setContacts(prev => prev.map(c => c.id === currentContact.id ? { ...c, lastIdleChatAt: idleAt } : c));
      triggerProactiveChat(currentContact);
    }, cooldownMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isInChatView, isInputFocused, currentContact?.id, currentContact?.idleChatEnabled, currentContact?.idleChatTimeoutSeconds, currentContact?.lastIdleChatAt]);
}
