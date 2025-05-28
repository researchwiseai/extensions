import {
    add,
    logMessage,
    currentTime,
    wordCount,
    clock,
    increment,
} from './functions';

describe('functions.ts', () => {
    describe('wordCount()', () => {
        it('counts words in a string', () => {
            expect(wordCount(' one  two three ')).toBe(3);
            expect(wordCount('')).toBe(0);
        });

        it('maps over a 2D array', () => {
            const input = [
                ['a b', '  '],
                ['foo bar baz', 'x'],
            ];
            expect(wordCount(input)).toEqual([
                [2, 0],
                [3, 1],
            ]);
        });
    });
});
