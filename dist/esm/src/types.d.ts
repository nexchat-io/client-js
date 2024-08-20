export type User = {
    externalUserId: string;
    userName?: string;
    profileImageUrl?: string;
    metadata?: Record<string, any>;
};
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type ChannelMember = {
    hasBlockedChannel: boolean;
    unreadCount: number;
    createdAt: string;
    status: string;
    user: User;
};
export type Message = {
    messageId: string;
    channelId: string;
    attachments: any[];
    createdAt: string;
    text: string;
    user: User;
    urlPreview: FulfilledLinkPreview[] | [];
};
export type ChannelData = {
    channelId: string;
    channelName?: string;
    channelImageUrl?: string;
    channelType: string;
    metadata?: Record<string, any>;
    members: ChannelMember[];
    messages: Message[];
    lastActivityAt: string;
};
export type ChannelUpdateData = {
    channelId: string;
    channelName?: string;
    channelImageUrl?: string;
    metadata?: Record<string, any>;
    unreadCount?: number;
    isBlocked?: boolean;
};
export type ChannelUnreadCount = {
    channelId: string;
    unreadCount: number;
};
export type SocketEvent = {
    'message.new': Message;
    'channel.updateUnReadCount': ChannelUnreadCount;
    'channel.created': ChannelData;
    'channel.update': {
        channelId: string;
    };
};
export type UploadUrlResponse = {
    fileId: string;
    mimeType: string;
    url: string;
};
export type SendMessageProps = {
    text?: string;
    externalUserId?: string;
    urlPreview?: FulfilledLinkPreview[];
    attachments?: Array<{
        fileId: string;
        mimeType: string;
    }>;
};
export interface FulfilledLinkPreview {
    url: string;
    title: string;
    siteName: string;
    description: string;
    mediaType: string;
    contentType: string;
    images: string[];
    videos: string[];
    favicons: string[];
    charset: string;
    originalUrl: string;
    source: 'store' | 'api';
}
export interface RejectedLinkPreviewReason {
    message: string;
    type: 'system' | 'other';
}
export interface LinkPreviewResponse {
    status: 'fulfilled' | 'rejected';
    value?: FulfilledLinkPreview;
    reason?: RejectedLinkPreviewReason;
}
