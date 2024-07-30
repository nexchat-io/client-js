import { NexChat } from "./client";
import { ChannelData, ChannelMember, Message, SocketEvent, SendMessageProps } from "./types";
/**
 * Represents a chat channel.
 */
export declare class Channel {
    channelId: string;
    channelName?: string;
    channelImageUrl?: string;
    channelType: string;
    lastMessage?: Message;
    metadata?: Record<string, any>;
    members: ChannelMember[];
    unreadCount: number;
    isBlocked: boolean;
    isOtherUserBlocked: boolean;
    client: NexChat;
    listeners: {
        [K in keyof SocketEvent]?: Array<(data: SocketEvent[K]) => void>;
    };
    /**
     * Constructs a new Channel instance.
     * @param client - The NexChat client.
     * @param channelData - The channel data.
     */
    constructor(client: NexChat, channelData: ChannelData);
    /**
     * Updates the channel data.
     * @param channelData - The updated channel data.
     */
    updateChannelData(channelData: ChannelData): void;
    /**
     * Registers a listener for a specific event type.
     * @param eventType - The event type to listen for.
     * @param callback - The callback function to be called when the event occurs.
     * @throws {Error} - If the callback is not a function.
     * @returns A function that can be called to remove the listener.
     */
    on<K extends keyof SocketEvent>(eventType: K, callback: (data: SocketEvent[K]) => void): () => void;
    /**
     * Triggers all registered listeners for a specific event type.
     * @param eventType - The event type to trigger the listeners for.
     * @param data - The data to pass to the listeners.
     */
    triggerChannelListeners<K extends keyof SocketEvent>(eventType: K, data: SocketEvent[K]): void;
    /**
     * Handles a channel event.
     * @param eventType - The event type to handle.
     * @param data - The data associated with the event.
     */
    handleChannelEvent<K extends keyof SocketEvent>(eventType: K, data: SocketEvent[K]): void;
    /**
     * Creates a new channel.
     * @param members - The members to add to the channel.
     * @returns A promise that resolves to the created channel data.
     */
    createChannelAsync(members: string[]): Promise<unknown>;
    /**
     * Retrieves the channel data.
     * @returns A promise that resolves to the channel data.
     */
    getChannelAsync(): Promise<unknown>;
    /**
     * Sends a message to the channel.
     * @param {Object} param - An object containing the message details.
     * @param {string} param.text - The text of the message.
     * @param {string} param.externalUserId - In case of server side invocation, the externalUserId of the sender.
     * @param {Object} param.urlPreview - A object containing metadata of URL preview to be shown.
     * @param {Array} param.attachments - An array of attachments to send with the message.
     * @returns A promise that resolves to the sent message.
     */
    sendMessageAsync({ text, externalUserId, urlPreview, attachments, }: SendMessageProps): Promise<Message>;
    /**
     * Retrieves the channel messages.
     * @param options - The options for retrieving the messages.
     * @param options.lastCreatedAt - The timestamp of the last created message.
     * @param options.limit - The maximum number of messages to retrieve.
     * @returns A promise that resolves to an object containing the messages and a flag indicating if it's the last page.
     */
    getChannelMessagesAsync({ lastCreatedAt, limit, }: {
        lastCreatedAt?: string;
        limit?: number;
    }): Promise<{
        messages: Message[];
        isLastPage: boolean;
    }>;
    private markChannelReadThrottled;
    /**
     * Marks the channel as read for the current user.
     * @returns A promise that resolves when the channel is marked as read.
     */
    markChannelRead(): void;
    /**
     * Blocks the channel for the current user.
     * @returns A promise that resolves when the channel is blocked.
     */
    blockChannelAsync(): Promise<unknown>;
    /**
     * Unblocks the channel for the current user.
     * @returns A promise that resolves when the channel is unblocked.
     */
    unBlockChannelAsync(): Promise<unknown>;
    /**
     * Retrieves the display details of the channel.
     * @returns An object containing the name and image URL of the channel.
     */
    getDisplayDetails(): {
        name: string;
        imageUrl: string;
    };
}
