"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexChat = void 0;
var axios_1 = __importDefault(require("axios"));
var AxiosLogger = __importStar(require("axios-logger"));
var lodash_1 = __importDefault(require("lodash"));
var channel_1 = require("./channel");
var constants_1 = require("./constants");
var utils_1 = require("./utils");
AxiosLogger.setGlobalConfig({
    params: true,
    headers: true,
});
/**
 * Represents the NexChat class.
 */
var NexChat = /** @class */ (function () {
    /**
     * Creates an instance of NexChat.
     * @param apiKey - The API key.
     * @param apiSecret - The API secret (required for server auth).
     */
    function NexChat(apiKey, apiSecret) {
        this.logsEnabled = false;
        this.socketConnectionAttempts = 0;
        this.socketConnectionMaxAttempts = 10;
        this.socketConnectionRetryDelay = 1500;
        this.activeChannels = {};
        this.listeners = {};
        this.totalUnreadCount = 0;
        this.isServerIntegration = !!apiSecret;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.api = axios_1.default.create({
            baseURL: this.getBaseUrls().baseUrl,
            headers: {
                api_key: apiKey,
                api_secret: this.apiSecret,
            },
        });
    }
    NexChat.prototype.getBaseUrls = function () {
        if (this.apiKey.startsWith('dev_')) {
            return {
                baseUrl: constants_1.DEV_BASE_URL,
                webSocketUrl: constants_1.DEV_WEB_SOCKET_URL,
            };
        }
        return {
            baseUrl: constants_1.PROD_BASE_URL,
            webSocketUrl: constants_1.PROD_WEB_SOCKET_URL,
        };
    };
    /**
     * Enables debug logs for the client.
     */
    NexChat.prototype.enableDebugLogs = function () {
        this.logsEnabled = true;
        this.api.interceptors.request.use(AxiosLogger.requestLogger);
        this.api.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);
    };
    /**
     * Disables debug logs for the client.
     */
    NexChat.prototype.disableDebugLogs = function () {
        this.logsEnabled = false;
        this.api.interceptors.request.clear();
        this.api.interceptors.response.clear();
    };
    NexChat.prototype.log = function () {
        var message = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            message[_i] = arguments[_i];
        }
        if (this.logsEnabled) {
            console.log(message);
        }
    };
    /**
     * Provides instance of NexChat, should ideally be called only once per session.
     * @param apiKey - The API key.
     * @param apiSecret - The API secret (required for server auth).
     * @returns The NexChat instance.
     * @throws Error if API Key is not provided.
     */
    NexChat.getInstance = function (apiKey, apiSecret) {
        if (!apiKey) {
            throw new Error('API Key is required');
        }
        if (!this.instance) {
            this.instance = new NexChat(apiKey, apiSecret);
        }
        return this.instance;
    };
    /**
     * Creates a user token asynchronously.
     * Only for server to server invocation.
     * @param externalUserId - The external user ID.
     * @returns A promise that resolves to the user token.
     */
    NexChat.prototype.createUserTokenAsync = function (externalUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (!_this.isServerIntegration) {
                            (0, utils_1.invalidInvocationError)(reject);
                        }
                        _this.api
                            .post("/users/".concat(externalUserId, "/token"))
                            .then(function (_a) {
                            var data = _a.data;
                            return resolve(data.token);
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    NexChat.prototype.updateActiveChannel = function (channelData) {
        var oldChannel = this.activeChannels[channelData.channelId];
        if (oldChannel) {
            oldChannel.updateChannelData(channelData);
            return oldChannel;
        }
        var newChannel = new channel_1.Channel(this, channelData);
        this.activeChannels[channelData.channelId] = newChannel;
        return newChannel;
    };
    NexChat.prototype.createChannelAsync = function (members) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.api
                            .post("/channels", { members: members })
                            .then(function (_a) {
                            var data = _a.data;
                            resolve(_this.updateActiveChannel(data.channel));
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    /**
     * Logs in a user asynchronously.
     * @param externalUserId - The external user ID.
     * @param authToken - The authentication token.
     * @returns A promise that resolves to the logged-in user.
     */
    NexChat.prototype.loginUserAsync = function (externalUserId, authToken) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (_this.isServerIntegration) {
                            (0, utils_1.invalidInvocationError)(reject);
                        }
                        _this.api
                            .get("/users/".concat(externalUserId), { headers: { auth_token: authToken } })
                            .then(function (_a) {
                            var data = _a.data;
                            var user = data === null || data === void 0 ? void 0 : data.user;
                            _this.authToken = authToken;
                            _this.api.defaults.headers.common.auth_token = authToken;
                            _this.externalUserId = externalUserId;
                            _this.userName = user.userName;
                            _this.profileImageUrl = user.profileImageUrl;
                            _this.metadata = user.metadata;
                            _this.getTotalUnreadCount();
                            _this.connectAsync();
                            resolve(user);
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    /**
     * Gets a channel by ID asynchronously. If the channel is already fetched previously, it returns the cached channel.
     * @param channelId - The channel ID.
     * @returns A promise that resolves to the channel.
     */
    NexChat.prototype.getChannelByIdAsync = function (channelId_1) {
        return __awaiter(this, arguments, void 0, function (channelId, forceFetch) {
            var _this = this;
            if (forceFetch === void 0) { forceFetch = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var channel = _this.activeChannels[channelId];
                        if (channel && !forceFetch) {
                            resolve(channel);
                            return;
                        }
                        _this.api
                            .get("/channels/".concat(channelId))
                            .then(function (_a) {
                            var data = _a.data;
                            resolve(_this.updateActiveChannel(data.channel));
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    /**
     * Gets user channels asynchronously.
     * @param options - The options for getting user channels.
     * @returns A promise that resolves to an object containing the channels and whether it is the last page.
     */
    NexChat.prototype.getUserChannelsAsync = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var _this = this;
            var _c = _b.limit, limit = _c === void 0 ? 10 : _c, _d = _b.offset, offset = _d === void 0 ? 0 : _d;
            return __generator(this, function (_e) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.api
                            .get("/users/".concat(_this.externalUserId, "/channels"), {
                            params: { limit: limit, offset: offset },
                        })
                            .then(function (_a) {
                            var data = _a.data;
                            var channels = [];
                            data.channels.map(function (channelData) {
                                channels.push(_this.updateActiveChannel(channelData));
                            });
                            resolve({
                                channels: channels,
                                isLastPage: data.isLastPage,
                            });
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    /**
     * Update current logged in user.
     * @param user - The user object.
     * @returns A promise that resolves to the updated user.
     * @throws Error if loginUser is not called before updating user. Use upsertUserAsync for server integration.
     */
    NexChat.prototype.updateUserAsync = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (_this.isServerIntegration) {
                            throw new Error('This method is only available for client integration');
                        }
                        _this.api
                            .put("/users/".concat(_this.externalUserId), user)
                            .then(function (_a) {
                            var data = _a.data;
                            var newUser = data.user;
                            _this.userName = newUser.userName;
                            _this.profileImageUrl = newUser.profileImageUrl;
                            _this.metadata = newUser.metadata;
                            resolve(data);
                        })
                            .catch(function (error) {
                            var _a, _b, _c, _d;
                            return reject((_d = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) !== null && _c !== void 0 ? _c : error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : 'Error updating user');
                        });
                    })];
            });
        });
    };
    /**
     * Upsert a user. Only for server integration.
     * @param user - The user object.
     * @returns A promise that resolves to the updated user.
     * @throws Error if not server integration.
     */
    NexChat.prototype.upsertUserAsync = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.isServerIntegration) {
                    throw new Error('This method is only available for server integration');
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.api
                            .put("/users/".concat(user.externalUserId), lodash_1.default.omit(user, 'externalUserId'))
                            .then(function (_a) {
                            var data = _a.data;
                            resolve(data.user);
                        })
                            .catch(function (error) {
                            var _a, _b, _c, _d;
                            return reject((_d = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) !== null && _c !== void 0 ? _c : error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : 'Error upserting user');
                        });
                    })];
            });
        });
    };
    /**
     * Adds a listener for a specific event type.
     * @param eventType - The event type.
     * @param callback - The callback function to be called when the event occurs.
     * @throws Error if the callback is not a function.
     * @returns A function that can be called to remove the listener.
     */
    NexChat.prototype.on = function (eventType, callback) {
        var _this = this;
        if (typeof callback !== 'function') {
            throw new Error('Invalid callback. It has to be a function');
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
    NexChat.prototype.triggerClientListners = function (eventType, data) {
        var listeners = this.listeners[eventType];
        listeners === null || listeners === void 0 ? void 0 : listeners.forEach(function (listener) {
            listener(data);
        });
    };
    /**
     * Handles a client event.
     * @param eventType - The event type to handle.
     * @param data - The data associated with the event.
     */
    NexChat.prototype.handleClientEvent = function (eventType, data) {
        if (eventType === 'user.totalUnreadCount') {
            this.totalUnreadCount = data;
            this.triggerClientListners(eventType, data);
        }
    };
    NexChat.prototype.handleSocketEvent = function (data) {
        this.log('Received socket data: ', data);
        var jsonData = JSON.parse(data);
        var eventType = jsonData.eventType;
        var eventData = jsonData.data;
        if (lodash_1.default.isEmpty(eventType) || lodash_1.default.isNil(eventData)) {
            this.log('Invalid socket event data');
            return;
        }
        var channelId = eventData.channelId;
        var channel = this.activeChannels[channelId];
        this.handleClientEvent(eventType, eventData);
        // Handle channel events
        if (channel) {
            channel.handleChannelEvent(eventType, eventData);
        }
        // Call client event handler
        this.triggerClientListners(eventType, eventData);
    };
    /**
     * Connects to the server asynchronously.
     * @returns void
     * @throws Error if loginUser is not called before connecting.
     */
    NexChat.prototype.connectAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.isServerIntegration) {
                    throw new Error('Websocket connection is not supported for server to server integration');
                }
                if (!this.externalUserId || !this.authToken) {
                    throw new Error('Call loginUser before connecting');
                }
                if (this.ws) {
                    this.log('Already connected or attempting websocket connection, will not connect again');
                    return [2 /*return*/];
                }
                if (this.socketConnectionAttempts >= this.socketConnectionMaxAttempts) {
                    this.log('Max socket connection attempts reached');
                    return [2 /*return*/];
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
                this.ws.onopen = function () {
                    _this.log('Connected to the websocket');
                    _this.socketConnectionAttempts = 0;
                };
                this.ws.onmessage = function (event) {
                    _this.handleSocketEvent(event === null || event === void 0 ? void 0 : event.data);
                };
                this.ws.onerror = function (e) {
                    // @ts-ignore
                    _this.log('Websocket connection error', e);
                };
                this.ws.onclose = function (e) {
                    var _a, _b;
                    (_b = (_a = _this.ws) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
                    _this.ws = undefined;
                    _this.log('Websocket connection closed', e);
                    _this.connectAsyncWithDelay();
                };
                return [2 /*return*/];
            });
        });
    };
    NexChat.prototype.connectAsyncWithDelay = function () {
        var _this = this;
        setTimeout(function () {
            _this.log('Will try to reconnect to websocket');
            _this.connectAsync();
        }, this.socketConnectionRetryDelay);
    };
    NexChat.prototype.socketConnectionCheck = function () {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.connectAsyncWithDelay();
        }
    };
    NexChat.prototype.sendSocketData = function (data) {
        var _a;
        this.log('Sending socket data: ', data);
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.log('Websocket is not connected yet');
            return;
        }
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(data));
    };
    NexChat.prototype.setPushToken = function (pushToken, provider) {
        var _this = this;
        if (!this.externalUserId) {
            throw new Error('Call loginUser before setting device token');
        }
        this.pushToken = pushToken;
        this.api
            .post("/users/".concat(this.externalUserId, "/push-token"), { pushToken: pushToken, provider: provider })
            .catch(function (error) { return _this.log(error); });
    };
    NexChat.prototype.unSetPushToken = function (pushToken) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.externalUserId) {
                            throw new Error('Call loginUser before setting device token');
                        }
                        return [4 /*yield*/, this.api
                                .post("/users/".concat(this.externalUserId, "/push-token/delete"), { pushToken: pushToken })
                                .catch(function (error) { return _this.log(error); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NexChat.prototype.getUsersAsync = function (_a) {
        var _this = this;
        var _b = _a.limit, limit = _b === void 0 ? 10 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
        return new Promise(function (resolve, reject) {
            _this.api
                .get('/users', { params: { limit: limit, offset: offset } })
                .then(function (_a) {
                var data = _a.data;
                return resolve(data);
            })
                .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
        });
    };
    NexChat.prototype.createUploadUrlsAsync = function (uploadMetaData) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.api
                            .post('/upload-url', uploadMetaData)
                            .then(function (_a) {
                            var data = _a.data;
                            return data.urls;
                        })
                            .then(function (signedUrlList) {
                            var dataWithFileUri = lodash_1.default.map(signedUrlList, function (signedUrl, index) {
                                var originalMetaData = uploadMetaData.metadata[index];
                                if (originalMetaData.mimeType === signedUrl.mimeType) {
                                    return __assign(__assign({}, signedUrl), { uri: originalMetaData.fileUri });
                                }
                                else {
                                    (0, utils_1.genericCatch)('mimeType mismatch', reject);
                                }
                            });
                            resolve(dataWithFileUri);
                        })
                            .catch(function (error) { return (0, utils_1.genericCatch)(error, reject); });
                    })];
            });
        });
    };
    NexChat.prototype.getTotalUnreadCount = function () {
        var _this = this;
        this.api
            .get("/users/".concat(this.externalUserId, "/total-unread-count"))
            .then(function (_a) {
            var data = _a.data;
            _this.handleClientEvent('user.totalUnreadCount', data.totalUnreadCount);
        })
            .catch(function (error) { return _this.log('Error getting total unread count', error); });
    };
    /**
     * Logs out the user and closes the websocket connection.
     */
    NexChat.prototype.logoutUser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.pushToken) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.unSetPushToken(this.pushToken)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        this.externalUserId = undefined;
                        this.activeChannels = {};
                        this.authToken = undefined;
                        this.api.defaults.headers.common.auth_token = undefined;
                        this.api.defaults.headers.common.api_key = undefined;
                        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
                        this.ws = undefined;
                        return [2 /*return*/];
                }
            });
        });
    };
    return NexChat;
}());
exports.NexChat = NexChat;
