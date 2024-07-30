import _ from "lodash";
import { NexChat } from "./client";
import {
  ChannelData,
  ChannelMember,
  ChannelUnreadCount,
  Message,
  SocketEvent,
  SendMessageProps,
} from "./types";

/**
 * Represents a chat channel.
 */
export class Channel {
  channelId: string;
  channelName?: string;
  channelImageUrl?: string;
  channelType: string;
  lastMessage?: Message;
  metadata?: Record<string, any>;
  members: ChannelMember[] = [];
  unreadCount = 0;
  isBlocked = false;
  isOtherUserBlocked = false;

  client: NexChat;
  listeners: {
    [K in keyof SocketEvent]?: Array<(data: SocketEvent[K]) => void>;
  } = {};

  /**
   * Constructs a new Channel instance.
   * @param client - The NexChat client.
   * @param channelData - The channel data.
   */
  constructor(client: NexChat, channelData: ChannelData) {
    this.client = client;

    this.channelId = channelData.channelId;
    this.channelType = channelData.channelType;

    this.updateChannelData(channelData);
  }

  /**
   * Updates the channel data.
   * @param channelData - The updated channel data.
   */
  updateChannelData(channelData: ChannelData) {
    this.members = channelData.members;
    this.channelName = channelData.channelName;
    this.channelImageUrl = channelData.channelImageUrl;
    this.metadata = channelData.metadata;
    this.lastMessage = channelData.messages?.[0];
    this.unreadCount =
      _.find(
        channelData.members,
        (member) => member.user.externalUserId === this.client.externalUserId
      )?.unreadCount ?? 0;
    this.isBlocked = false;
    this.isOtherUserBlocked = false;
    this.members.forEach((member) => {
      if (member.user.externalUserId === this.client.externalUserId) {
        this.isBlocked = member.hasBlockedChannel;
      }
      if (member.user.externalUserId !== this.client.externalUserId) {
        this.isOtherUserBlocked = member.hasBlockedChannel;
      }
    });
  }

  /**
   * Registers a listener for a specific event type.
   * @param eventType - The event type to listen for.
   * @param callback - The callback function to be called when the event occurs.
   * @throws {Error} - If the callback is not a function.
   * @returns A function that can be called to remove the listener.
   */
  on<K extends keyof SocketEvent>(
    eventType: K,
    callback: (data: SocketEvent[K]) => void
  ): () => void {
    if (typeof callback !== "function") {
      throw new Error("Invalid callback. It has to be a function");
    }

    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }

    this.listeners[eventType]!.push(callback);

    return () => {
      const index = this.listeners[eventType]?.indexOf(callback);
      if (index !== undefined && index !== -1) {
        this.listeners[eventType]?.splice(index, 1);
      }
    };
  }

  /**
   * Triggers all registered listeners for a specific event type.
   * @param eventType - The event type to trigger the listeners for.
   * @param data - The data to pass to the listeners.
   */
  triggerChannelListeners<K extends keyof SocketEvent>(
    eventType: K,
    data: SocketEvent[K]
  ) {
    const listeners = this.listeners[eventType];
    listeners?.forEach((listener) => {
      listener(data);
    });
  }

  /**
   * Handles a channel event.
   * @param eventType - The event type to handle.
   * @param data - The data associated with the event.
   */
  handleChannelEvent<K extends keyof SocketEvent>(
    eventType: K,
    data: SocketEvent[K]
  ) {
    if (eventType === "message.new") {
      this.lastMessage = data as Message;

      // Do not increment unread count if own message
      if (this.client.externalUserId !== this.lastMessage.user.externalUserId) {
        this.handleChannelEvent("channel.updateUnReadCount", {
          channelId: this.channelId,
          unreadCount: this.unreadCount + 1,
        });
      }
      this.triggerChannelListeners(eventType, data);
    }

    if (eventType === "channel.updateUnReadCount") {
      const unreadCount = (data as ChannelUnreadCount).unreadCount;
      this.unreadCount = unreadCount;

      this.triggerChannelListeners(eventType, data);
    }

    if (eventType === "channel.update") {
      this.client.getChannelByIdAsync(this.channelId, true).then(() => {
        this.triggerChannelListeners(eventType, data);
      });
    }
  }

  /**
   * Creates a new channel.
   * @param members - The members to add to the channel.
   * @returns A promise that resolves to the created channel data.
   */
  async createChannelAsync(members: string[]) {
    return new Promise((resolve, reject) => {
      this.client.api
        .post("/channels", {
          members,
        })
        .then(({ data = {} }) => {
          if (data?.channel?.channelId) {
            this.channelId = data.channel.channelId;
            resolve(data);
          } else {
            throw new Error("Channel not created");
          }
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves the channel data.
   * @returns A promise that resolves to the channel data.
   */
  async getChannelAsync() {
    return new Promise((resolve, reject) => {
      this.client.api
        .get(`/channels/${this.channelId}`)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Sends a message to the channel.
   * @param {Object} param - An object containing the message details.
   * @param {string} param.text - The text of the message.
   * @param {string} param.externalUserId - In case of server side invocation, the externalUserId of the sender.
   * @param {Object} param.urlPreview - A object containing metadata of URL preview to be shown.
   * @param {Array} param.attachments - An array of attachments to send with the message.
   * @returns A promise that resolves to the sent message.
   */
  async sendMessageAsync({
    text,
    externalUserId,
    urlPreview,
    attachments,
  }: SendMessageProps): Promise<Message> {
    return new Promise((resolve, reject) => {
      this.client.api
        .post(
          `/channels/${this.channelId}/members/${
            externalUserId ?? this.client.externalUserId
          }/message`,
          {
            text,
            urlPreview,
            attachments,
          }
        )
        .then(({ data }) => {
          resolve(data.message);
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves the channel messages.
   * @param options - The options for retrieving the messages.
   * @param options.lastCreatedAt - The timestamp of the last created message.
   * @param options.limit - The maximum number of messages to retrieve.
   * @returns A promise that resolves to an object containing the messages and a flag indicating if it's the last page.
   */
  async getChannelMessagesAsync({
    lastCreatedAt,
    limit = 20,
  }: {
    lastCreatedAt?: string;
    limit?: number;
  }): Promise<{ messages: Message[]; isLastPage: boolean }> {
    return new Promise((resolve, reject) => {
      this.client.api
        .get(`/channels/${this.channelId}/messages`, {
          params: {
            lastCreatedAt,
            limit,
          },
        })
        .then(({ data }) => resolve(data))
        .catch(reject);
    });
  }

  private markChannelReadThrottled = _.throttle(() => {
    this.client.api
      .post(
        `/channels/${this.channelId}/members/${this.client.externalUserId}/read`
      )
      .then(() => {})
      .catch(() => {});
  }, 5000);

  /**
   * Marks the channel as read for the current user.
   * @returns A promise that resolves when the channel is marked as read.
   */
  markChannelRead() {
    this.handleChannelEvent("channel.updateUnReadCount", {
      channelId: this.channelId,
      unreadCount: 0,
    });
    this.markChannelReadThrottled();
  }

  /**
   * Blocks the channel for the current user.
   * @returns A promise that resolves when the channel is blocked.
   */
  blockChannelAsync() {
    return new Promise((resolve, reject) => {
      this.client.api
        .post(
          `/channels/${this.channelId}/members/${this.client.externalUserId}/block`
        )
        .then(() => {
          resolve(undefined);
        })
        .catch(reject);
    });
  }

  /**
   * Unblocks the channel for the current user.
   * @returns A promise that resolves when the channel is unblocked.
   */
  unBlockChannelAsync() {
    return new Promise((resolve, reject) => {
      this.client.api
        .post(
          `/channels/${this.channelId}/members/${this.client.externalUserId}/un-block`
        )
        .then(() => {
          resolve(undefined);
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves the display details of the channel.
   * @returns An object containing the name and image URL of the channel.
   */
  getDisplayDetails() {
    let name = "";
    let imageUrl = "";

    if (this.members.length === 2) {
      const messagingUser = this.members.find(
        (member) => member.user.externalUserId !== this.client.externalUserId
      )?.user;

      name =
        messagingUser?.userName ??
        this.channelName ??
        messagingUser?.externalUserId ??
        this.channelId;
      imageUrl = messagingUser?.profileImageUrl ?? this.channelImageUrl ?? "";
    } else {
      name = this.channelName ?? this.channelId;
      imageUrl = this.channelImageUrl ?? "";
    }

    return {
      name,
      imageUrl,
    };
  }
}
