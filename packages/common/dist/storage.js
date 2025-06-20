"use strict";
/**
 * Interface for persistent storage of key/value data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
exports.configureStorage = configureStorage;
exports.storageIsConfigured = storageIsConfigured;
function configureStorage(s) {
    exports.storage = s;
}
function storageIsConfigured() {
    return !!exports.storage;
}
