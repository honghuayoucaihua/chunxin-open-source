export const runScanRequestCreated = (params: any, request: any): void => {
  params.setFriendRequests((prev: any[]) => [request, ...prev]);
  params.pushSubView('newFriends');
  params.showToast('名片识别成功');
};

export const runShakeCreateContact = (params: any, contact: any): void => {
  params.setContacts((prev: any[]) => [contact, ...prev]);
  const openingLine = contact.openingLine?.trim();
  if (openingLine) {
    const openingMessage = params.buildOpeningLineMessage(contact.id, openingLine, 'shake');
    params.setMessages((prev: Record<string, any[]>) => ({ ...prev, [contact.id]: [...(prev[contact.id] || []), openingMessage] }));
    params.setContacts((prev: any[]) => prev.map((item) => params.patchContactByLastMessage(item, contact.id, openingMessage.content, openingMessage.timestamp)));
  }
  params.setSelectedContactId(contact.id);
  params.setContacts((prev: any[]) => prev.map(item => item.id === contact.id ? { ...item, unreadCount: 0 } : item));
  params.pushSubView('chat');
  params.showToast(`摇到了 ${contact.name}`);
};

export const runOpenGroupChat = (params: any, groupId: string): void => {
  params.setSelectedContactId(groupId);
  params.setContacts((prev: any[]) => prev.map(contact => contact.id === groupId ? { ...contact, unreadCount: 0 } : contact));
  params.pushSubView('chat');
};

export const runCreateGroupConfirm = (params: any, ids: string[], groupName: string): void => {
  const groupId = `group-${Date.now()}`;
  const meName = params.user.name?.trim() || '';
  const groupContact = params.buildGroupContact({ ids, groupName, userName: meName, groupId });
  const groupSize = ids.length + 1;
  const welcomeMessage = params.buildGroupWelcomeMessage(groupId, groupContact.name, groupSize);
  params.setContacts((prev: any[]) => [groupContact, ...prev]);
  params.setMessages((prev: Record<string, any[]>) => ({ ...prev, [groupId]: [welcomeMessage] }));
  params.setSelectedContactId(groupId);
  params.setContacts((prev: any[]) => prev.map(contact => contact.id === groupId ? { ...contact, unreadCount: 0 } : contact));
  params.pushSubView('chat');
};

export const runResetAddFriendDraft = (params: any): void => {
  params.setAddFriendDraft({});
  params.setAddFriendGreetingDraft(params.DEFAULT_ADD_FRIEND_GREETING);
};

export const runCreateFriendContact = (params: any, contact: any): void => {
  params.setContacts([contact, ...params.contacts]);
  const openingLine = contact.openingLine?.trim();
  if (openingLine) {
    const openingMessage = params.buildOpeningLineMessage(contact.id, openingLine, 'open');
    params.setMessages((prev: Record<string, any[]>) => ({ ...prev, [contact.id]: [...(prev[contact.id] || []), openingMessage] }));
    params.setContacts((prev: any[]) => prev.map((item) => params.patchContactByLastMessage(item, contact.id, openingMessage.content, openingMessage.timestamp)));
  }
  runResetAddFriendDraft(params);
  params.goBackSubView();
};

export const runFriendRequestIncoming = (params: any, form: any, greeting: string, openingLine: string): void => {
  const incomingRequest = params.buildIncomingFriendRequest({
    form,
    greeting,
    openingLine,
    existingContacts: params.contacts
  });
  if (!incomingRequest) return;
  params.setFriendRequests((prev: any[]) => [incomingRequest, ...prev]);
  runResetAddFriendDraft(params);
  params.showToast('收到好友申请');
  params.goBackSubView();
};

export const runAcceptFriendRequest = (params: any, requestId: string): void => {
  const request = params.friendRequests.find((item: any) => item.id === requestId);
  if (!request || request.status !== 'pending') return;
  if (params.shouldInsertAcceptedContact(params.contacts, request)) {
    params.setContacts((prev: any[]) => [request.contact, ...prev]);
  }
  params.setFriendRequests((prev: any[]) => prev.map((item: any) => item.id === requestId ? { ...item, status: 'accepted' } : item));
  const acceptedId = request.contact.id;
  const messagesBundle = params.buildAcceptedFriendMessages(request);
  const nextMessages = messagesBundle.greeting
    ? [messagesBundle.system, messagesBundle.greeting]
    : [messagesBundle.system];
  const previewMessage = messagesBundle.greeting || messagesBundle.system;
  params.setMessages((prev: Record<string, any[]>) => ({
    ...prev,
    [acceptedId]: [...(prev[acceptedId] || []), ...nextMessages]
  }));
  params.setContacts((prev: any[]) => prev.map((item) => params.patchContactByLastMessage(item, acceptedId, previewMessage.content, previewMessage.timestamp)));
  params.showToast(`已添加 ${request.contact.name}`);
};
