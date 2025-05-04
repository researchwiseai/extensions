"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const output_1 = require("../src/output");
describe('mapResults', () => {
    it('calls writer for each result-position pair', () => {
        const positions = [
            { row: 0, col: 1 },
            { row: 2, col: 3 },
            { row: 5, col: 6 },
        ];
        const results = ['a', 'b', 'c'];
        const calls = [];
        const writer = (pos, value) => {
            calls.push({ pos, value });
        };
        (0, output_1.mapResults)(results, positions, writer);
        expect(calls).toEqual([
            { pos: positions[0], value: 'a' },
            { pos: positions[1], value: 'b' },
            { pos: positions[2], value: 'c' },
        ]);
    });
    it('throws error when lengths differ', () => {
        const pos = [{ row: 0, col: 0 }];
        const res = ['only', 'two'];
        // Using a no-op writer function as writer should not be called
        const writer = (_pos, _value) => { };
        expect(() => (0, output_1.mapResults)(res, pos, writer)).toThrow('Results length (2) does not match positions length (1)');
    });
});
