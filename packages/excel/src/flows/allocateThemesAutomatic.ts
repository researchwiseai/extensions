import { allocateThemes as allocateThemesApi } from 'pulse-common/themes';
import { themeGenerationFlow } from './themeGenerationFlow';

export async function allocateThemesAutomaticFlow(
    context: Excel.RequestContext,
    range: string,
) {
    const { inputs, positions, sheet, themes } = await themeGenerationFlow(
        context,
        range,
    );

    const allocations = await allocateThemesApi(inputs, themes, {
        fast: false,
        onProgress: (message) => {
            console.log(message);
        },
    });

    positions.forEach((pos, i) => {
        const cell = sheet.getCell(pos.row - 1, pos.col);
        cell.values = [[allocations[i].theme.label]];
    });

    await context.sync();
}
