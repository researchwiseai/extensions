/**
 * Wrapper for storing and retrieving arbitrary XML data in custom XML parts,
 * with the customXmlPart ID stored in workbook settings using a provided key.
 */
export class FileStorage {
    /**
     * Adds or updates a custom XML part storing the provided XML string,
     * and saves its part ID in workbook settings under the given key.
     * @param key The settings key under which to store the XML part ID.
     * @param xmlString The XML content to persist in the workbook.
     */
    static async setXml(key: string, xmlString: string): Promise<void> {
        await Excel.run(async (context) => {
            const workbook = context.workbook;
            const settings = workbook.settings;

            // Check if a part already exists for this key
            const existingId = settings.getItemOrNullObject(key);
            await context.sync();

            if (!existingId.isNullObject) {
                // Load and remove the previous part
                const oldPartId = existingId.value as string;
                const parts = workbook.customXmlParts;
                const toRemove = parts.getItemOrNullObject(oldPartId);
                toRemove.load();
                await context.sync();
                if (!toRemove.isNullObject) {
                    toRemove.delete();
                }
            }

            // Add new custom XML part
            const part = workbook.customXmlParts.add(xmlString);
            part.load('id');
            await context.sync();

            // Store the new part ID in settings
            settings.add(key, part.id);
            await context.sync();
        });
    }

    /**
     * Retrieves the XML string stored under the given key, or null if not found.
     * @param key The settings key where the XML part ID is stored.
     * @returns The XML content as a string, or null if missing.
     */
    static async getXml(key: string): Promise<string | null> {
        return Excel.run(async (context) => {
            const workbook = context.workbook;
            const settings = workbook.settings;
            const settingItem = settings.getItemOrNullObject(key);
            settingItem.load('value');
            await context.sync();

            if (settingItem.isNullObject) {
                return null;
            }

            const partId = settingItem.value as string;
            const part = workbook.customXmlParts.getItemOrNullObject(partId);
            part.load({
                namespaceUri: true,
            });
            await context.sync();

            if (part.isNullObject) {
                return null;
            }

            // "xml" property contains the raw XML string
            return part.getXml().value;
        });
    }

    /**
     * Deletes the custom XML part and removes its ID from settings.
     * @param key The settings key where the XML part ID is stored.
     */
    static async deleteXml(key: string): Promise<void> {
        await Excel.run(async (context) => {
            const workbook = context.workbook;
            const settings = workbook.settings;
            const settingItem = settings.getItemOrNullObject(key);
            settingItem.load('value');
            await context.sync();

            if (!settingItem.isNullObject) {
                const partId = settingItem.value as string;
                const part =
                    workbook.customXmlParts.getItemOrNullObject(partId);
                part.load();
                await context.sync();

                if (!part.isNullObject) {
                    part.delete();
                }

                // Remove the setting
                settings.add(key, null);
                await context.sync();
            }
        });
    }
}
