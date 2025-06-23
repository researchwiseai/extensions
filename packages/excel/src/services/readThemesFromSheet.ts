import { ShortTheme, Theme } from 'pulse-common';

/**
 * Reads theme data from the "Themes" worksheet.
 *
 * This function is the inverse of `saveThemesToSheet`. It reads data from the
 * "Themes" sheet, expecting a specific format with the following columns:
 * - A: Label
 * - B: Short Label
 * - C: Description
 * - D: Representative 1
 * - E: Representative 2
 *
 * It skips the header row and constructs an array of partial Theme objects.
 * If the sheet does not exist or is empty, it throws an error.
 * If the data does not conform to the theme structure, short themes are
 * generated using the first column values as strings.
 *
 * @returns A promise that resolves to an array of partial `Theme` objects.
 */
export async function readThemesFromSheet(
    sheetName: string = 'Themes',
): Promise<Theme[] | ShortTheme[]> {
    try {
        return await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItem(sheetName);
            const range = sheet.getUsedRange();
            range.load('values');
            await context.sync();

            const values = range.values;

            // Return empty array if sheet is empty or has only a header row.
            if (!values || values.length <= 1) {
                throw new Error(
                    `Sheet "${sheetName}" is empty or has no data rows.`,
                );
            }

            const dataRows = values.slice(1); // Skip header row

            const rowCount = dataRows.length;
            if (rowCount === 0) {
                throw new Error(`Sheet "${sheetName}" has no data rows.`);
            }

            // Check all rows and all five columns for strings
            const allRowsValid = dataRows.every(
                (row) =>
                    typeof row[0] === 'string' &&
                    typeof row[1] === 'string' &&
                    typeof row[2] === 'string' &&
                    typeof row[3] === 'string' &&
                    (typeof row[4] === 'string' || row[4] == null),
            );

            if (!allRowsValid) {
                console.warn(
                    `Sheet "${sheetName}" contains invalid data. Returning basic themes as strings.`,
                );
                // Return basic themes as strings if data is not valid
                return dataRows.map(
                    (row) =>
                        ({
                            label: String(row[0]),
                            representatives: [String(row[0])],
                        }) satisfies ShortTheme,
                );
            }

            const themes: Theme[] = dataRows
                .map((row) => {
                    // Representatives are in columns D and E (indices 3 and 4)
                    const representatives = [row[3], row[4]]
                        .filter((rep) => rep && String(rep).trim())
                        .map((rep) => String(rep).trim());

                    return {
                        label: String(row[0] || ''),
                        shortLabel: String(row[1] || ''),
                        description: String(row[2] || ''),
                        representatives,
                    } satisfies Theme;
                })
                .filter((theme) => theme.label); // Filter out rows without a label.

            return themes;
        });
    } catch (error) {
        // If the sheet doesn't exist, it's not an error, just return an empty array.
        if (
            error instanceof OfficeExtension.Error &&
            error.code === 'ItemNotFound'
        ) {
            throw new Error(
                `Sheet "${sheetName}" not found. Please create it and add themes.`,
            );
        }
        // For other errors, log and re-throw.
        console.error('Error reading themes from sheet:', error);
        throw error;
    }
}
