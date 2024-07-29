"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidInvocationError = exports.genericCatch = void 0;
var genericCatch = function (error, reject) {
    switch (error.status) {
        case 401:
            reject(error);
            break;
        default:
            reject(error);
            break;
    }
};
exports.genericCatch = genericCatch;
var invalidInvocationError = function (reject) {
    var invalidInvocationErrorInstance = new Error('This method should not be called on the frontend');
    return (0, exports.genericCatch)(invalidInvocationErrorInstance, reject);
};
exports.invalidInvocationError = invalidInvocationError;
