export var genericCatch = function (error, reject) {
    switch (error.status) {
        case 401:
            reject(error);
            break;
        default:
            reject(error);
            break;
    }
};
export var invalidInvocationError = function (reject) {
    var invalidInvocationErrorInstance = new Error('This method should not be called on the frontend');
    return genericCatch(invalidInvocationErrorInstance, reject);
};
