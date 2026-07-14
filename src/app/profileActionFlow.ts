export const runSetContactChatBg = (params: any, chatBg: string): void => {
  if (params.selectedContactId) {
    params.setContacts((prev: any[]) => prev.map(contact => {
      if (contact.id !== params.selectedContactId) return contact;
      return { ...contact, chatBg };
    }));
    return;
  }
  params.setSettings((prev: any) => ({ ...prev, chatBg }));
};

export const runOpenProfileChat = (params: any, contactId: string | null): void => {
  if (!contactId) return;
  params.setSelectedContactId(contactId);
  params.setContacts((prev: any[]) => prev.map(contact => contact.id === contactId ? { ...contact, unreadCount: 0 } : contact));
  params.pushSubView('chat');
};

export const runSetProfileRemark = (setContacts: (updater: any) => void, contactId: string, remark: string): void => {
  setContacts((prev: any[]) => prev.map(contact => {
    if (contact.id !== contactId) return contact;
    return { ...contact, remark };
  }));
};

export const runOpenProfileMoments = (
  setProfileId: (value: string) => void,
  pushSubView: (subView: any) => void,
  profileId: string
): void => {
  setProfileId(profileId);
  pushSubView('moments');
};

export const runContactPersonaUpdate = (params: any, updated: any, current: any): void => {
  if (current?.encryptedReadOnly) return;
  params.setContacts((prev: any[]) => prev.map(contact => contact.id === updated.id ? { ...contact, ...updated } : contact));
  const nextOpeningLine = updated.openingLine?.trim() || '';
  const prevOpeningLine = current.openingLine?.trim() || '';
  if (nextOpeningLine && nextOpeningLine !== prevOpeningLine) {
    const openingMessage = params.buildOpeningLineMessage(updated.id, nextOpeningLine, 'open-edit');
    params.setMessages((prev: Record<string, any[]>) => ({ ...prev, [updated.id]: [...(prev[updated.id] || []), openingMessage] }));
    params.setContacts((prev: any[]) => prev.map((contact) => params.patchContactByLastMessage(contact, updated.id, openingMessage.content, openingMessage.timestamp)));
  }
  setTimeout(() => params.goBackSubView(), 0);
};

export const runNavigateEditProfileField = (
  setEditingProfileField: (value: any) => void,
  pushSubView: (subView: any) => void,
  key: string,
  label: string,
  value: string
): void => {
  setEditingProfileField({ key, label, value });
  pushSubView('editProfileField');
};

export const runSearchSelectContact = (params: any, contactId: string): void => {
  params.setSelectedContactId(contactId);
  params.setContacts((prev: any[]) => prev.map(contact => contact.id === contactId ? { ...contact, unreadCount: 0 } : contact));
  params.pushSubView('chat');
};

export const runMomentsAvatarClick = (
  setProfileId: (value: string) => void,
  pushSubView: (subView: any) => void,
  id: string
): void => {
  if (id === 'me') {
    setProfileId('me');
    return;
  }
  setProfileId(id);
  pushSubView('profile');
};
