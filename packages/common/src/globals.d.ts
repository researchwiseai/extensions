// Minimal shims for Google Apps Script types to satisfy TypeScript in Node environments.
// These align with runtime guards in the code that check for availability.
declare namespace GoogleAppsScript {
    namespace Properties {
        interface Properties {
            getProperty(key: string): string | null;
            setProperty(key: string, value: string): void;
            deleteProperty(key: string): void;
        }
    }
}

declare const PropertiesService: {
    getDocumentProperties?: () => GoogleAppsScript.Properties.Properties;
};

