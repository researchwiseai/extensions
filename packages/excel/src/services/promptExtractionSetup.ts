import { getRelativeUrl } from './relativeUrl';

export type ExtractionSetup = {
    sheetName: string | null;
    hasHeader: boolean;
    autoGroupRareEntities?: boolean;
};

export function promptExtractionSetup(
    sheetNames: string[],
    currentSheet: string | null,
): Promise<ExtractionSetup | null> {
    return new Promise((resolve, reject) => {
        const url = `${getRelativeUrl('ExtractionSetupDialog.html')}?sheets=${encodeURIComponent(
            JSON.stringify(sheetNames),
        )}&current=${encodeURIComponent(currentSheet || '')}`;
        Office.context.ui.displayDialogAsync(
            url,
            { height: 35, width: 30, displayInIframe: true },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(result.error);
                } else {
                    const dialog = result.value;

                    async function computeOverwriteRisk(
                        sheetName: string | null,
                        hasHeader: boolean,
                    ): Promise<{ any: boolean; count: number }> {
                        return await Excel.run(async (context) => {
                            const sheet = sheetName
                                ? context.workbook.worksheets.getItem(sheetName)
                                : context.workbook.worksheets.getActiveWorksheet();
                            const used = sheet.getUsedRange();
                            used.load(['values', 'rowCount', 'columnCount']);
                            await context.sync();
                            const values: any[][] = used.values as any[][];
                            const rowCount = used.rowCount;
                            const colCount = used.columnCount;
                            const startRow = hasHeader ? 1 : 0;
                            let count = 0;
                            for (let r = startRow; r < rowCount; r++) {
                                const a = (values[r]?.[0] ?? '')
                                    .toString()
                                    .trim();
                                if (!a) continue;
                                for (let c = 1; c < colCount; c++) {
                                    const v = values[r]?.[c];
                                    const t = (
                                        v == null ? '' : String(v)
                                    ).trim();
                                    if (t) count += 1;
                                }
                            }
                            return { any: count > 0, count };
                        });
                    }

                    const onMessage = async (arg: any) => {
                        if ('error' in arg) {
                            try {
                                dialog.close();
                            } catch {}
                            reject(arg.error);
                            return;
                        }
                        let msg: any = {};
                        try {
                            msg = JSON.parse(arg.message);
                        } catch {}
                        // selection changed → compute risk and notify child
                        if (msg && msg.type === 'selection-changed') {
                            try {
                                const res = await computeOverwriteRisk(
                                    msg.sheetName ?? currentSheet,
                                    !!msg.hasHeader,
                                );
                                try {
                                    dialog.messageChild(
                                        JSON.stringify({
                                            type: 'overwrite-risk',
                                            anyExisting: res.any,
                                            count: res.count,
                                        }),
                                    );
                                } catch {}
                            } catch (e) {
                                // ignore risk computation failures
                            }
                            return; // keep dialog open
                        }
                        // final submit/cancel
                        if (msg && (msg.cancelled || 'sheetName' in msg)) {
                            try {
                                dialog.close();
                            } catch {}
                            if (msg.cancelled) return resolve(null);
                            return resolve({
                                sheetName: msg.sheetName ?? null,
                                hasHeader: !!msg.hasHeader,
                                autoGroupRareEntities:
                                    !!msg.autoGroupRareEntities,
                            });
                        }
                    };
                    dialog.addEventHandler(
                        Office.EventType.DialogMessageReceived,
                        onMessage,
                    );
                }
            },
        );
    });
}
