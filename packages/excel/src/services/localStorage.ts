import { configureStorage } from 'pulse-common/storage';

export function initializeLocalStorage() {
    configureStorage({
        async get(key) {
            const data = sessionStorage.getItem(`pulse-${key}`);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        },
        async set(key, value) {
            sessionStorage.setItem(`pulse-${key}`, JSON.stringify(value));
        },
        async delete(key) {
            sessionStorage.removeItem(`pulse-${key}`);
        },
    });
}
