/* global clearInterval, console, CustomFunctions, setInterval */
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

/**
 * Counts the number of words in the input text or range.
 * @customfunction WORDCOUNT
 * @helpurl https://researchwiseai.com/pulse/extensions/excel/functions/wordcount
 * @param text The input text or range of text to count words for.
 * @returns Word count (number for single text, array of numbers for range).
 */
export function wordCount(text: string | string[][]): number | number[][] {
    const nlp = winkNLP(model);
    function count(str: string): number {
        const doc = nlp.readDoc(str ?? '');
        return doc
            .tokens()
            .out()
            .filter((t: string) => t.trim() !== '').length;
    }
    if (Array.isArray(text)) {
        return text.map((row) => row.map((cell) => count(cell)));
    } else {
        return count(text);
    }
}
