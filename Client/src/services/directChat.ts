import {

  BaseChannel,
  ChannelType,
  DirectChannel,
  MessageType,
  SendTextMessageParams
} from "@nexconn/chat";

export type DirectTextMessage = {
  messageId: string;
  senderUserId: string;
  sentTime: number;
  text: string;
};

function normalizeMessage(message: any): DirectTextMessage | null {
  if (
    message.messageType !== MessageType.TEXT ||
    typeof message.content?.text !== "string"
  ) {
    return null;
  }

  return {
    messageId: message.messageId,
    senderUserId: message.senderUserId,
    sentTime: message.sentTime,
    text: message.content.text
  };
}

export async function getDirectMessageHistory(
  targetUserId: string,
  pageSize = 50
): Promise<DirectTextMessage[]> {
  const channel = new DirectChannel(targetUserId);

  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: channel.identifier,
    startTime: 0,
    pageSize,
    isAscending: true
  });

  const result = await query.loadNextPage();

  if (result.code !== 0 || !result.data) {
  throw new Error(
    `Could not load messages. Nexconn code: ${result.code}`
  );
}

  return result.data.data
    .map(normalizeMessage)
    .filter((message): message is DirectTextMessage => message !== null);
}

export async function sendDirectMessage(
  targetUserId: string,
  text: string
): Promise<DirectTextMessage> {
  const message = text.trim();

  if (!targetUserId) {
    throw new Error("Recipient ID is missing.");
  }

  if (!message) {
    throw new Error("Message cannot be empty.");
  }

  const channel = new DirectChannel(targetUserId);

  const params = new SendTextMessageParams({
    text: message
  });

  const result = await channel.sendMessage(params);

  if (result.code !== 0 || !result.data) {
  throw new Error(
    `Message failed. Nexconn code: ${result.code}`
  );
}

  const normalized = normalizeMessage(result.data);

  if (!normalized) {
    throw new Error("Nexconn returned an unexpected message.");
  }

  return normalized;
}

export type DirectConversation = {
  userId: string;
  latestMessage: DirectTextMessage | null;
  unreadCount: number;
  updatedAt: number;
};

export async function getDirectConversations(
  pageSize = 100
): Promise<DirectConversation[]> {
  const query = BaseChannel.createChannelsQuery({ pageSize });
  const result = await query.loadNextPage();

  if (result.code !== 0 || !result.data) {
    throw new Error("Failed to load direct conversations.");
  }

  return result.data.data
    .filter((channel) => channel.channelType === ChannelType.DIRECT)
    .map((channel) => ({
      userId: channel.channelId,
      latestMessage: channel.latestMessage
        ? normalizeMessage(channel.latestMessage)
        : null,
      unreadCount: channel.unreadCount,
      updatedAt: channel.operationTime,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function clearDirectConversationUnread(
  targetUserId: string
): Promise<void> {
  if (!targetUserId) {
    throw new Error("Recipient ID is missing.");
  }

  const channel = new DirectChannel(targetUserId);
  const result = await channel.clearUnreadCount();

  if (result.code !== 0) {
    throw new Error(
      `Could not clear unread messages. Nexconn code: ${result.code}`
    );
  }
}