import { AxiosInstance } from 'axios';
import { Channel } from './channel';
import { SocketEvent, UploadUrlResponse, User } from './types';
/**
 * Represents the NexChat class.
 */
export declare class NexChat {
    private static instance;
    api: AxiosInstance;
    private apiKey;
    private apiSecret?;
    private isServerIntegration;
    private authToken?;
    externalUserId?: string;
    private ws?;
    private pushToken?;
    private logsEnabled;
    private socketConnectionAttempts;
    private socketConnectionMaxAttempts;
    private socketConnectionRetryDelay;
    userName?: string;
    profileImageUrl?: string;
    metadata?: Record<string, any>;
    activeChannels: Record<string, Channel>;
    listeners: {
        [K in keyof SocketEvent]?: Array<(data: SocketEvent[K]) => void>;
    };
    totalUnreadCount: number;
    /**
     * Creates an instance of NexChat.
     * @param apiKey - The API key.
     * @param apiSecret - The API secret (required for server auth).
     */
    constructor(apiKey: string, apiSecret?: string);
    private getBaseUrls;
    /**
     * Enables debug logs for the client.
     */
    enableDebugLogs(): void;
    /**
     * Disables debug logs for the client.
     */
    disableDebugLogs(): void;
    private log;
    /**
     * Provides instance of NexChat, should ideally be called only once per session.
     * @param apiKey - The API key.
     * @param apiSecret - The API secret (required for server auth).
     * @returns The NexChat instance.
     * @throws Error if API Key is not provided.
     */
    static getInstance(apiKey: string, apiSecret?: string): NexChat;
    /**
     * Creates a user token asynchronously.
     * Only for server to server invocation.
     * @param externalUserId - The external user ID.
     * @returns A promise that resolves to the user token.
     */
    createUserTokenAsync(externalUserId: string): Promise<string>;
    private updateActiveChannel;
    createChannelAsync(members: string[]): Promise<Channel>;
    /**
     * Logs in a user asynchronously.
     * @param externalUserId - The external user ID.
     * @param authToken - The authentication token.
     * @returns A promise that resolves to the logged-in user.
     */
    loginUserAsync(externalUserId: string, authToken: string): Promise<User>;
    /**
     * Gets a channel by ID asynchronously. If the channel is already fetched previously, it returns the cached channel.
     * @param channelId - The channel ID.
     * @returns A promise that resolves to the channel.
     */
    getChannelByIdAsync(channelId: string, forceFetch?: boolean): Promise<Channel>;
    /**
     * Gets user channels asynchronously.
     * @param options - The options for getting user channels.
     * @returns A promise that resolves to an object containing the channels and whether it is the last page.
     */
    getUserChannelsAsync({ limit, offset, }: {
        limit?: number;
        offset: number;
    }): Promise<{
        channels: Channel[];
        isLastPage: boolean;
    }>;
    /**
     * Update current logged in user.
     * @param user - The user object.
     * @returns A promise that resolves to the updated user.
     * @throws Error if loginUser is not called before updating user. Use upsertUserAsync for server integration.
     */
    updateUserAsync(user: Partial<Omit<User, 'externalUserId'>>): Promise<User>;
    /**
     * Upsert a user. Only for server integration.
     * @param user - The user object.
     * @returns A promise that resolves to the updated user.
     * @throws Error if not server integration.
     */
    upsertUserAsync(user: User): Promise<User>;
    /**
     * Adds a listener for a specific event type.
     * @param eventType - The event type.
     * @param callback - The callback function to be called when the event occurs.
     * @throws Error if the callback is not a function.
     * @returns A function that can be called to remove the listener.
     */
    on<K extends keyof SocketEvent>(eventType: K, callback: (data: SocketEvent[K]) => void): () => void;
    private triggerClientListners;
    /**
     * Handles a client event.
     * @param eventType - The event type to handle.
     * @param data - The data associated with the event.
     */
    handleClientEvent<K extends keyof SocketEvent>(eventType: K, data: SocketEvent[K]): void;
    private handleSocketEvent;
    /**
     * Connects to the server asynchronously.
     * @returns void
     * @throws Error if loginUser is not called before connecting.
     */
    connectAsync(): Promise<void>;
    private connectAsyncWithDelay;
    socketConnectionCheck(): void;
    sendSocketData(data: Record<string, any>): void;
    setPushToken(pushToken: string, provider: 'FCM' | 'APNS'): void;
    unSetPushToken(pushToken: string): Promise<void>;
    getUsersAsync({ limit, offset, }: {
        limit?: number;
        offset: number;
    }): Promise<{
        users: User[];
        isLastPage: boolean;
    }>;
    createUploadUrlsAsync(uploadMetaData: {
        metadata: Array<{
            mimeType: string;
            fileUri: string;
        }>;
    }): Promise<Array<UploadUrlResponse & {
        uri: string;
    }>>;
    getTotalUnreadCount(): void;
    /**
     * Logs out the user and closes the websocket connection.
     */
    logoutUser(): Promise<void>;
}
