/**
 * Interface for persistent storage of key/value data.
 */
export interface Storage {
    /** Retrieve a value by key, or undefined if not present. */
    get<T>(key: string): Promise<T | undefined>;
    /** Store a value by key. */
    set<T>(key: string, value: T): Promise<void>;
    /** Delete a value by key. */
    delete(key: string): Promise<void>;
}
export declare let storage: Storage;
export declare function configureStorage(s: Storage): void;
export declare function storageIsConfigured(): boolean;
