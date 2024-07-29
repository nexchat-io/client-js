var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import _ from "lodash";
/**
 * Represents a chat channel.
 */
var Channel = /** @class */ (function () {
    /**
     * Constructs a new Channel instance.
     * @param client - The NexChat client.
     * @param channelData - The channel data.
     */
    function Channel(client, channelData) {
        var _this = this;
        this.members = [];
        this.unreadCount = 0;
        this.isBlocked = false;
        this.isOtherUserBlocked = false;
        this.listeners = {};
        this.markChannelReadThrottled = _.throttle(function () {
            _this.client.api
                .post("/channels/".concat(_this.channelId, "/members/").concat(_this.client.externalUserId, "/read"))
                .then(function () { })
                .catch(function () { });
        }, 5000);
        this.client = client;
        this.channelId = channelData.channelId;
        this.channelType = channelData.channelType;
        this.updateChannelData(channelData);
    }
    /**
     * Updates the channel data.
     * @param channelData - The updated channel data.
     */
    Channel.prototype.updateChannelData = function (channelData) {
        var _this = this;
        var _a, _b, _c;
        this.members = channelData.members;
        this.channelName = channelData.channelName;
        this.channelImageUrl = channelData.channelImageUrl;
        this.metadata = channelData.metadata;
        this.lastMessage = (_a = channelData.messages) === null || _a === void 0 ? void 0 : _a[0];
        this.unreadCount =
            (_c = (_b = _.find(channelData.members, function (member) { return member.user.externalUserId === _this.client.externalUserId; })) === null || _b === void 0 ? void 0 : _b.unreadCount) !== null && _c !== void 0 ? _c : 0;
        this.isBlocked = false;
        this.isOtherUserBlocked = false;
        this.members.forEach(function (member) {
            if (member.user.externalUserId === _this.client.externalUserId) {
                _this.isBlocked = member.hasBlockedChannel;
            }
            if (member.user.externalUserId !== _this.client.externalUserId) {
                _this.isOtherUserBlocked = member.hasBlockedChannel;
            }
        });
    };
    /**
     * Registers a listener for a specific event type.
     * @param eventType - The event type to listen for.
     * @param callback - The callback function to be called when the event occurs.
     * @throws {Error} - If the callback is not a function.
     * @returns A function that can be called to remove the listener.
     */
    Channel.prototype.on = function (eventType, callback) {
        var _this = this;
        if (typeof callback !== "function") {
            throw new Error("Invalid callback. It has to be a function");
        }
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
        return function () {
            var _a, _b;
            var index = (_a = _this.listeners[eventType]) === null || _a === void 0 ? void 0 : _a.indexOf(callback);
            if (index !== undefined && index !== -1) {
                (_b = _this.listeners[eventType]) === null || _b === void 0 ? void 0 : _b.splice(index, 1);
            }
        };
    };
    /**
     * Triggers all registered listeners for a specific event type.
     * @param eventType - The event type to trigger the listeners for.
     * @param data - The data to pass to the listeners.
     */
    Channel.prototype.triggerChannelListeners = function (eventType, data) {
        var listeners = this.listeners[eventType];
        listeners === null || listeners === void 0 ? void 0 : listeners.forEach(function (listener) {
            listener(data);
        });
    };
    /**
     * Handles a channel event.
     * @param eventType - The event type to handle.
     * @param data - The data associated with the event.
     */
    Channel.prototype.handleChannelEvent = function (eventType, data) {
        var _this = this;
        if (eventType === "message.new") {
            this.lastMessage = data;
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
            var unreadCount = data.unreadCount;
            this.unreadCount = unreadCount;
            this.triggerChannelListeners(eventType, data);
        }
        if (eventType === "channel.update") {
            this.client.getChannelByIdAsync(this.channelId, true).then(function () {
                _this.triggerChannelListeners(eventType, data);
            });
        }
    };
    /**
     * Creates a new channel.
     * @param members - The members to add to the channel.
     * @returns A promise that resolves to the created channel data.
     */
    Channel.prototype.createChannelAsync = function (members) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.client.api
                            .post("/channels", {
                            members: members,
                        })
                            .then(function (_a) {
                            var _b;
                            var _c = _a.data, data = _c === void 0 ? {} : _c;
                            if ((_b = data === null || data === void 0 ? void 0 : data.channel) === null || _b === void 0 ? void 0 : _b.channelId) {
                                _this.channelId = data.channel.channelId;
                                resolve(data);
                            }
                            else {
                                throw new Error("Channel not created");
                            }
                        })
                            .catch(reject);
                    })];
            });
        });
    };
    /**
     * Retrieves the channel data.
     * @returns A promise that resolves to the channel data.
     */
    Channel.prototype.getChannelAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.client.api
                            .get("/channels/".concat(_this.channelId))
                            .then(resolve)
                            .catch(reject);
                    })];
            });
        });
    };
    /**
     * Sends a message to the channel.
     * @param text - The text of the message.
     * @param externalUserId - In case of server side invocation, the externalUserId of the sender.
     * @returns A promise that resolves to the sent message.
     */
    Channel.prototype.sendMessageAsync = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var _this = this;
            var text = _b.text, externalUserId = _b.externalUserId, urlPreview = _b.urlPreview, attachments = _b.attachments;
            return __generator(this, function (_c) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.client.api
                            .post("/channels/".concat(_this.channelId, "/members/").concat(externalUserId !== null && externalUserId !== void 0 ? externalUserId : _this.client.externalUserId, "/message"), {
                            text: text,
                            urlPreview: urlPreview,
                            attachments: attachments,
                        })
                            .then(function (_a) {
                            var data = _a.data;
                            resolve(data.message);
                        })
                            .catch(reject);
                    })];
            });
        });
    };
    /**
     * Retrieves the channel messages.
     * @param options - The options for retrieving the messages.
     * @param options.lastCreatedAt - The timestamp of the last created message.
     * @param options.limit - The maximum number of messages to retrieve.
     * @returns A promise that resolves to an object containing the messages and a flag indicating if it's the last page.
     */
    Channel.prototype.getChannelMessagesAsync = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var _this = this;
            var lastCreatedAt = _b.lastCreatedAt, _c = _b.limit, limit = _c === void 0 ? 20 : _c;
            return __generator(this, function (_d) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.client.api
                            .get("/channels/".concat(_this.channelId, "/messages"), {
                            params: {
                                lastCreatedAt: lastCreatedAt,
                                limit: limit,
                            },
                        })
                            .then(function (_a) {
                            var data = _a.data;
                            return resolve(data);
                        })
                            .catch(reject);
                    })];
            });
        });
    };
    /**
     * Marks the channel as read for the current user.
     * @returns A promise that resolves when the channel is marked as read.
     */
    Channel.prototype.markChannelRead = function () {
        this.handleChannelEvent("channel.updateUnReadCount", {
            channelId: this.channelId,
            unreadCount: 0,
        });
        this.markChannelReadThrottled();
    };
    /**
     * Blocks the channel for the current user.
     * @returns A promise that resolves when the channel is blocked.
     */
    Channel.prototype.blockChannelAsync = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.client.api
                .post("/channels/".concat(_this.channelId, "/members/").concat(_this.client.externalUserId, "/block"))
                .then(function () {
                resolve(undefined);
            })
                .catch(reject);
        });
    };
    /**
     * Unblocks the channel for the current user.
     * @returns A promise that resolves when the channel is unblocked.
     */
    Channel.prototype.unBlockChannelAsync = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.client.api
                .post("/channels/".concat(_this.channelId, "/members/").concat(_this.client.externalUserId, "/un-block"))
                .then(function () {
                resolve(undefined);
            })
                .catch(reject);
        });
    };
    /**
     * Retrieves the display details of the channel.
     * @returns An object containing the name and image URL of the channel.
     */
    Channel.prototype.getDisplayDetails = function () {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var name = "";
        var imageUrl = "";
        if (this.members.length === 2) {
            var messagingUser = (_a = this.members.find(function (member) { return member.user.externalUserId !== _this.client.externalUserId; })) === null || _a === void 0 ? void 0 : _a.user;
            name =
                (_d = (_c = (_b = messagingUser === null || messagingUser === void 0 ? void 0 : messagingUser.userName) !== null && _b !== void 0 ? _b : this.channelName) !== null && _c !== void 0 ? _c : messagingUser === null || messagingUser === void 0 ? void 0 : messagingUser.externalUserId) !== null && _d !== void 0 ? _d : this.channelId;
            imageUrl = (_f = (_e = messagingUser === null || messagingUser === void 0 ? void 0 : messagingUser.profileImageUrl) !== null && _e !== void 0 ? _e : this.channelImageUrl) !== null && _f !== void 0 ? _f : "";
        }
        else {
            name = (_g = this.channelName) !== null && _g !== void 0 ? _g : this.channelId;
            imageUrl = (_h = this.channelImageUrl) !== null && _h !== void 0 ? _h : "";
        }
        return {
            name: name,
            imageUrl: imageUrl,
        };
    };
    return Channel;
}());
export { Channel };
