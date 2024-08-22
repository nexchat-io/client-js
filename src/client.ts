import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
import _ from 'lodash';
import { Channel } from './channel';
import {
  DEV_BASE_URL,
  DEV_WEB_SOCKET_URL,
  PROD_BASE_URL,
  PROD_WEB_SOCKET_URL,
} from './constants';
import { ChannelData, SocketEvent, UploadUrlResponse, User } from './types';
import { genericCatch, invalidInvocationError } from './utils';
import { backOff } from 'exponential-backoff';

AxiosLogger.setGlobalConfig({
  params: true,
  headers: true,
});

/**
 * Represents the NexChat class.
 */
export class NexChat {
  private static instance: undefined | NexChat;

  api: AxiosInstance;
  private apiKey: string;
  private apiSecret?: string;

  private isServerIntegration: boolean;
  private authToken?: string;
  externalUserId?: string;
  private ws?: WebSocket;
  private pushToken?: string;
  private logsEnabled = false;

  private socketConnectionAttempts = 0;
  private socketConnectionMaxAttempts = 10;
  private socketConnectionRetryDelay = 1500;

  userName?: string;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
  activeChannels: Record<string, Channel> = {};
  listeners: {
    [K in keyof SocketEvent]?: Array<(data: SocketEvent[K]) => void>;
  } = {};
  totalUnreadCount = 0;

  /**
   * Creates an instance of NexChat.
   * @param apiKey - The API key.
   * @param apiSecret - The API secret (required for server auth).
   */
  constructor(apiKey: string, apiSecret?: string) {
    this.isServerIntegration = !!apiSecret;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.api = axios.create({
      baseURL: this.getBaseUrls().baseUrl,
      headers: {
        api_key: apiKey,
        api_secret: this.apiSecret,
      },
    });
  }

  private getBaseUrls() {
    if (this.apiKey.startsWith('dev_')) {
      return {
        baseUrl: DEV_BASE_URL,
        webSocketUrl: DEV_WEB_SOCKET_URL,
      };
    }
    return {
      baseUrl: PROD_BASE_URL,
      webSocketUrl: PROD_WEB_SOCKET_URL,
    };
  }

  /**
   * Enables debug logs for the client.
   */
  enableDebugLogs() {
    this.logsEnabled = true;
    this.api.interceptors.request.use(AxiosLogger.requestLogger);
    this.api.interceptors.response.use(
      AxiosLogger.responseLogger,
      AxiosLogger.errorLogger
    );
  }

  /**
   * Disables debug logs for the client.
   */
  disableDebugLogs() {
    this.logsEnabled = false;
    this.api.interceptors.request.clear();
    this.api.interceptors.response.clear();
  }

  private log(...message: any) {
    if (this.logsEnabled) {
      console.log(message);
    }
  }

  /**
   * Provides instance of NexChat, should ideally be called only once per session.
   * @param apiKey - The API key.
   * @param apiSecret - The API secret (required for server auth).
   * @returns The NexChat instance.
   * @throws Error if API Key is not provided.
   */
  static getInstance(apiKey: string, apiSecret?: string): NexChat {
    if (!apiKey) {
      throw new Error('API Key is required');
    }

    if (!this.instance) {
      this.instance = new NexChat(apiKey, apiSecret);
    }
    return this.instance;
  }

  /**
   * Creates a user token asynchronously.
   * Only for server to server invocation.
   * @param externalUserId - The external user ID.
   * @returns A promise that resolves to the user token.
   */
  async createUserTokenAsync(externalUserId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isServerIntegration) {
        invalidInvocationError(reject);
      }

      this.api
        .post(`/users/${externalUserId}/token`)
        .then(({ data }) => resolve(data.token))
        .catch((error) => genericCatch(error, reject));
    });
  }

  private updateActiveChannel(channelData: ChannelData) {
    const oldChannel = this.activeChannels[channelData.channelId];
    if (oldChannel) {
      oldChannel.updateChannelData(channelData);
      return oldChannel;
    }
    const newChannel = new Channel(this, channelData);
    this.activeChannels[channelData.channelId] = newChannel;

    return newChannel;
  }

  async createChannelAsync(members: string[]): Promise<Channel> {
    return new Promise((resolve, reject) => {
      this.api
        .post(`/channels`, { members })
        .then(({ data }) => {
          resolve(this.updateActiveChannel(data.channel));
        })
        .catch((error) => genericCatch(error, reject));
    });
  }

  /**
   * Logs in a user asynchronously.
   * @param externalUserId - The external user ID.
   * @param authToken - The authentication token.
   * @returns A promise that resolves to the logged-in user.
   */
  async loginUserAsync(
    externalUserId: string,
    authToken: string
  ): Promise<User> {
    return new Promise((resolve, reject) => {
      if (this.isServerIntegration) {
        invalidInvocationError(reject);
      }

      this.api
        .get(`/users/${externalUserId}`, { headers: { auth_token: authToken } })
        .then(({ data }) => {
          const user = data?.user;

          this.authToken = authToken;
          this.api.defaults.headers.common.auth_token = authToken;
          this.externalUserId = externalUserId;

          this.userName = user.userName;
          this.profileImageUrl = user.profileImageUrl;
          this.metadata = user.metadata;

          this.getTotalUnreadCount();
          this.connectAsync();
          resolve(user);
        })
        .catch((error) => genericCatch(error, reject));
    });
  }

  /**
   * Gets a channel by ID asynchronously. If the channel is already fetched previously, it returns the cached channel.
   * @param channelId - The channel ID.
   * @returns A promise that resolves to the channel.
   */
  async getChannelByIdAsync(
    channelId: string,
    forceFetch = false
  ): Promise<Channel> {
    return new Promise((resolve, reject) => {
      const channel = this.activeChannels[channelId];
      if (channel && !forceFetch) {
        resolve(channel);
        return;
      }
      this.api
        .get(`/channels/${channelId}`)
        .then(({ data }) => {
          resolve(this.updateActiveChannel(data.channel));
        })
        .catch((error) => genericCatch(error, reject));
    });
  }

  /**
   * Gets user channels asynchronously.
   * @param options - The options for getting user channels.
   * @returns A promise that resolves to an object containing the channels and whether it is the last page.
   */
  async getUserChannelsAsync({
    limit = 10,
    offset = 0,
  }: {
    limit?: number;
    offset: number;
  }): Promise<{ channels: Channel[]; isLastPage: boolean }> {
    return new Promise((resolve, reject) => {
      this.api
        .get(`/users/${this.externalUserId}/channels`, {
          params: { limit, offset },
        })
        .then(
          ({
            data,
          }: {
            data: { channels: ChannelData[]; isLastPage: boolean };
          }) => {
            const channels: Channel[] = [];
            data.channels.map((channelData) => {
              channels.push(this.updateActiveChannel(channelData));
            });
            resolve({
              channels,
              isLastPage: data.isLastPage,
            });
          }
        )
        .catch((error) => genericCatch(error, reject));
    });
  }

  /**
   * Update current logged in user.
   * @param user - The user object.
   * @returns A promise that resolves to the updated user.
   * @throws Error if loginUser is not called before updating user. Use upsertUserAsync for server integration.
   */
  async updateUserAsync(
    user: Partial<Omit<User, 'externalUserId'>>
  ): Promise<User> {
    return new Promise((resolve, reject) => {
      if (this.isServerIntegration) {
        throw new Error('This method is only available for client integration');
      }
      this.api
        .put(`/users/${this.externalUserId}`, user)
        .then(({ data }) => {
          const newUser = data.user;
          this.userName = newUser.userName;
          this.profileImageUrl = newUser.profileImageUrl;
          this.metadata = newUser.metadata;

          resolve(data);
        })
        .catch((error) =>
          reject(
            error?.response?.data?.error ??
              error?.message ??
              'Error updating user'
          )
        );
    });
  }

  /**
   * Upsert a user. Only for server integration.
   * @param user - The user object.
   * @returns A promise that resolves to the updated user.
   * @throws Error if not server integration.
   */
  async upsertUserAsync(user: User): Promise<User> {
    if (!this.isServerIntegration) {
      throw new Error('This method is only available for server integration');
    }
    return new Promise((resolve, reject) => {
      this.api
        .put(`/users/${user.externalUserId}`, _.omit(user, 'externalUserId'))
        .then(({ data }) => {
          resolve(data.user);
        })
        .catch((error) =>
          reject(
            error?.response?.data?.error ??
              error?.message ??
              'Error upserting user'
          )
        );
    });
  }

  /**
   * Adds a listener for a specific event type.
   * @param eventType - The event type.
   * @param callback - The callback function to be called when the event occurs.
   * @throws Error if the callback is not a function.
   * @returns A function that can be called to remove the listener.
   */
  on<K extends keyof SocketEvent>(
    eventType: K,
    callback: (data: SocketEvent[K]) => void
  ): () => void {
    if (typeof callback !== 'function') {
      throw new Error('Invalid callback. It has to be a function');
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

  private triggerClientListners<K extends keyof SocketEvent>(
    eventType: K,
    data: SocketEvent[K]
  ) {
    const listeners = this.listeners[eventType];
    listeners?.forEach((listener) => {
      listener(data);
    });
  }

  /**
   * Handles a client event.
   * @param eventType - The event type to handle.
   * @param data - The data associated with the event.
   */
  handleClientEvent<K extends keyof SocketEvent>(
    eventType: K,
    data: SocketEvent[K]
  ) {
    if (eventType === 'user.totalUnreadCount') {
      this.totalUnreadCount = data as number;
      this.triggerClientListners(eventType, data);
    }
  }

  private handleSocketEvent(data: any) {
    this.log('Received socket data: ', data);

    const jsonData = JSON.parse(data);
    const eventType = jsonData.eventType as keyof SocketEvent;
    const eventData = jsonData.data as any;

    if (_.isEmpty(eventType) || _.isNil(eventData)) {
      this.log('Invalid socket event data');
      return;
    }

    const channelId = eventData.channelId;
    const channel = this.activeChannels[channelId];

    this.handleClientEvent(eventType, eventData);

    // Handle channel events
    if (channel) {
      channel.handleChannelEvent(eventType, eventData);
    }

    // Call client event handler
    this.triggerClientListners(eventType, eventData);
  }

  /**
   * Connects to the server asynchronously.
   * @returns void
   * @throws Error if loginUser is not called before connecting.
   */
  async connectAsync() {
    if (this.isServerIntegration) {
      throw new Error(
        'Websocket connection is not supported for server to server integration'
      );
    }

    if (!this.externalUserId || !this.authToken) {
      throw new Error('Call loginUser before connecting');
    }

    if (this.ws) {
      this.log(
        'Already connected or attempting websocket connection, will not connect again'
      );
      return;
    }

    if (this.socketConnectionAttempts >= this.socketConnectionMaxAttempts) {
      this.log('Max socket connection attempts reached');
      return;
    }

    this.socketConnectionAttempts++;
    this.log('Attempting connection to websocket');
    // @ts-ignore
    this.ws = new WebSocket(this.getBaseUrls().webSocketUrl, undefined, {
      headers: {
        api_key: this.apiKey,
        auth_token: this.authToken,
      },
    });

    this.ws.onopen = () => {
      this.log('Connected to the websocket');
      this.socketConnectionAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handleSocketEvent(event?.data);
    };

    this.ws.onerror = (e) => {
      // @ts-ignore
      this.log('Websocket connection error', e);
    };

    this.ws.onclose = (e) => {
      this.ws?.close?.();
      this.ws = undefined;
      this.log('Websocket connection closed', e);

      this.connectAsyncWithDelay();
    };
  }

  private connectAsyncWithDelay() {
    setTimeout(() => {
      this.log('Will try to reconnect to websocket');
      this.connectAsync();
    }, this.socketConnectionRetryDelay);
  }

  socketConnectionCheck() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connectAsyncWithDelay();
    }
  }

  sendSocketData(data: Record<string, any>) {
    this.log('Sending socket data: ', data);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Websocket is not connected yet');
      return;
    }
    this.ws?.send(JSON.stringify(data));
  }

  setPushToken(pushToken: string, provider: 'FCM' | 'APNS') {
    if (!this.externalUserId) {
      throw new Error('Call loginUser before setting device token');
    }
    this.pushToken = pushToken;
    this.api
      .post(`/users/${this.externalUserId}/push-token`, { pushToken, provider })
      .catch((error) => this.log(error));
  }

  async unSetPushToken(pushToken: string) {
    if (!this.externalUserId) {
      throw new Error('Call loginUser before setting device token');
    }
    await this.api
      .post(`/users/${this.externalUserId}/push-token/delete`, { pushToken })
      .catch((error) => this.log(error));
  }

  getUsersAsync({
    limit = 10,
    offset = 0,
  }: {
    limit?: number;
    offset: number;
  }): Promise<{ users: User[]; isLastPage: boolean }> {
    return new Promise((resolve, reject) => {
      this.api
        .get('/users', { params: { limit, offset } })
        .then(({ data }) => resolve(data))
        .catch((error) => genericCatch(error, reject));
    });
  }

  async createUploadUrlsAsync(uploadMetaData: {
    metadata: Array<{
      mimeType: string;
      fileUri: string;
    }>;
  }): Promise<Array<UploadUrlResponse & { uri: string }>> {
    return new Promise((resolve, reject) => {
      this.api
        .post('/upload-url', uploadMetaData)
        .then(({ data }) => data.urls)
        .then((signedUrlList) => {
          const dataWithFileUri = _.map(
            signedUrlList,
            (signedUrl, index: number) => {
              const originalMetaData = uploadMetaData.metadata[index];
              if (originalMetaData.mimeType === signedUrl.mimeType) {
                return {
                  ...signedUrl,
                  uri: originalMetaData.fileUri,
                };
              } else {
                genericCatch('mimeType mismatch', reject);
              }
            }
          );
          resolve(dataWithFileUri);
        })
        .catch((error) => genericCatch(error, reject));
    });
  }

  getTotalUnreadCount() {
    this.api
      .get(`/users/${this.externalUserId}/total-unread-count`)
      .then(({ data }) => {
        this.handleClientEvent('user.totalUnreadCount', data.totalUnreadCount);
      })
      .catch((error) => this.log('Error getting total unread count', error));
  }

  /**
   * Logs out the user and closes the websocket connection.
   */
  async logoutUser() {
    if (this.pushToken) {
      await this.unSetPushToken(this.pushToken);
    }
    this.externalUserId = undefined;
    this.activeChannels = {};
    this.authToken = undefined;
    this.api.defaults.headers.common.auth_token = undefined;
    this.api.defaults.headers.common.api_key = undefined;
    this.ws?.close();
    this.ws = undefined;
  }
}
