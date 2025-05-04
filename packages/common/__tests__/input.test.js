"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const input_1 = require("../src/input");
describe('extractInputs', () => {
    it('extracts non-empty strings and records positions', () => {
        const data = [
            ['a', '', null, 'b'],
            [0, '0', 'c'],
        ];
        const { inputs, positions } = (0, input_1.extractInputs)(data);
        expect(inputs).toEqual(['a', 'b', '0', '0', 'c']);
        expect(positions).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 3 },
            { row: 1, col: 0 },
            { row: 1, col: 1 },
            { row: 1, col: 2 },
        ]);
    });
    it('returns empty arrays when all values are empty or null', () => {
        const data = [['', null], [undefined, '']];
        const { inputs, positions } = (0, input_1.extractInputs)(data);
        expect(inputs).toEqual([]);
        expect(positions).toEqual([]);
    });
});
describe('sampleInputs', () => {
    const originalRandom = Math.random;
    afterEach(() => {
        Math.random = originalRandom;
    });
    it('returns a copy when array length <= max', () => {
        const arr = [1, 2, 3];
        const sampled = (0, input_1.sampleInputs)(arr, 5);
        expect(sampled).toEqual(arr);
        expect(sampled).not.toBe(arr); // different reference
    });
    it('samples up to max elements using Fisher-Yates shuffle', () => {
        // Stub Math.random to always return 0
        Math.random = () => 0;
        const arr = [1, 2, 3, 4];
        const max = 2;
        // With random=0, shuffle produces [2,3,...] and picks first two
        const sampled = (0, input_1.sampleInputs)(arr, max);
        expect(sampled).toHaveLength(max);
        expect(sampled).toEqual([2, 3]);
    });
});
