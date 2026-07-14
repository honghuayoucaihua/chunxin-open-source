type ChatRoomActionFlowModule = typeof import('./chatRoomActionFlow');

let chatRoomActionFlowPromise: Promise<ChatRoomActionFlowModule> | null = null;

export const loadChatRoomActionFlow = (): Promise<ChatRoomActionFlowModule> => {
  if (!chatRoomActionFlowPromise) {
    chatRoomActionFlowPromise = import('./chatRoomActionFlow');
  }
  return chatRoomActionFlowPromise;
};
