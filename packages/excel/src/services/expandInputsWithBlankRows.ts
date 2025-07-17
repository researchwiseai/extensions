import { Pos } from 'pulse-common';

export function expandInputsWithBlankRows(inputs: string[], positions: Pos[]): string[] {
    if (inputs.length === 0) {
        return [];
    }

    const map = new Map<number, string>();
    positions.forEach((pos, i) => {
        map.set(pos.row, inputs[i]);
    });

    const rows = positions.map((p) => p.row);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    const result: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
        result.push(map.get(r) ?? '');
    }
    return result;
}
