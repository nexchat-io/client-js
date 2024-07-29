import axios, { AxiosInstance } from "axios";
import * as AxiosLogger from "axios-logger";
import _ from "lodash";
import { Channel } from "./channel";
import { BASE_URL, WEB_SOCKET_URL } from "./constants";
import { ChannelData, SocketEvent, UploadUrlResponse, User } from "./types";
import { genericCatch, invalidInvocationError } from "./utils";

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

  private isS2SInvocation: boolean;
  private authToken?: string;
  public externalUserId?: string;
  private ws?: WebSocket;
  private socketRetryCount = 0;
  private pushToken?: string;
  private logsEnabled = false;

  userName?: string;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
  activeChannels: Record<string, Channel> = {};
  listeners: {
    [K in keyof SocketEvent]?: Array<(data: SocketEvent[K]) => void>;
  } = {};

  /**
   * Creates an instance of NexChat.
   * @param apiKey - The API key.
   * @param apiSecret - The API secret (required for server auth).
   */
  constructor(apiKey: string, apiSecret?: string) {
    this.isS2SInvocation = !!apiSecret;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.api = axios.create({
      baseURL: BASE_URL,
      headers: {
        api_key: apiKey,
        api_secret: this.apiSecret,
      },
    });
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
  public static getInstance(apiKey: string, apiSecret?: string): NexChat {
    if (!apiKey) {
      throw new Error("API Key is required");
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
      if (!this.isS2SInvocation) {
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
      if (this.isS2SInvocation) {
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
   * Update user.
   * @param user - The user object.
   * @returns A promise that resolves to the updated user.
   * @throws Error if loginUser is not called before updating user.
   */
  async updateUserAsync(
    user: Partial<Omit<User, "externalUserId">>
  ): Promise<User> {
    if (!this.externalUserId) {
      throw new Error("Call loginUser before updating user");
    }
    return new Promise((resolve, reject) => {
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
              "Error updating user"
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
  // handleClientEvent<K extends keyof SocketEvent>(
  //   eventType: K,
  //   data: SocketEvent[K],
  // ) {}

  private handleSocketEvent(data: any) {
    this.log("Received socket data: ", data);

    const jsonData = JSON.parse(data);
    const eventType = jsonData.eventType as keyof SocketEvent;
    const eventData = jsonData.data as any;

    const channelId = eventData.channelId;
    const channel = this.activeChannels[channelId];

    // this.handleClientEvent(eventType, eventData);

    // Handle channel events
    if (channel) {
      channel.handleChannelEvent(eventType, eventData);
    }

    // Call client event handler
    this.triggerClientListners(eventType, eventData);
  }

  /**
   * Connects to the server asynchronously.
   * @returns A promise that resolves when the connection is established.
   * @throws Error if loginUser is not called before connecting.
   */
  async connectAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isS2SInvocation) {
        throw new Error(
          "Websocket connection is not supported for server to server integration"
        );
      }

      if (!this.externalUserId || !this.authToken) {
        throw new Error("Call loginUser before connecting");
      }

      if (this.ws) {
        this.log(
          "Already connected. You should only call this if connection is closed"
        );
        return;
      }

      // @ts-ignore
      this.ws = new WebSocket(WEB_SOCKET_URL, undefined, {
        headers: {
          api_key: this.apiKey,
          auth_token: this.authToken,
        },
      });

      this.ws.onopen = () => {
        this.socketRetryCount = 0;
        this.log("Connected to the server");
        resolve();
      };

      this.ws.onmessage = (e) => {
        this.handleSocketEvent(e.data);
      };

      this.ws.onerror = (e) => {
        // @ts-ignore
        this.log(e.message);

        this.socketRetryCount += 1;
        if (this.socketRetryCount > 3) {
          reject();
        }

        setTimeout(() => {
          this.connectAsync();
        }, 5000);
      };

      this.ws.onclose = (e) => {
        this.ws = undefined;
        this.log(e.code, e.reason);
      };
    });
  }

  setPushToken(pushToken: string, provider: "FCM" | "APNS") {
    if (!this.externalUserId) {
      throw new Error("Call loginUser before setting device token");
    }
    this.pushToken = pushToken;
    this.api
      .post(`/users/${this.externalUserId}/push-token`, { pushToken, provider })
      .catch((error) => this.log(error));
  }

  async unSetPushToken(pushToken: string) {
    if (!this.externalUserId) {
      throw new Error("Call loginUser before setting device token");
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
        .get("/users", { params: { limit, offset } })
        .then(({ data }) => resolve(data))
        .catch((error) => genericCatch(error, reject));
    });
  }

  public async createUploadUrlsAsync(uploadMetaData: {
    metadata: Array<{
      mimeType: string;
      fileUri: string;
    }>;
  }): Promise<Array<UploadUrlResponse & { uri: string }>> {
    return new Promise((resolve, reject) => {
      this.api
        .post("/upload-url", uploadMetaData)
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
                genericCatch("mimeType mismatch", reject);
              }
            }
          );
          resolve(dataWithFileUri);
        })
        .catch((error) => genericCatch(error, reject));
    });
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
