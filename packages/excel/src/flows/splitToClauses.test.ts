import {
    normalize,
    splitIntoSentences,
    splitSentenceIntoClauses,
    splitTextIntoClauses,
} from './splitToClauses';

it('normalizes punctuation bursts', () => {
    expect(normalize('Wow!!! Really??  Ok---fine...')).toBe(
        'Wow! Really? Ok — fine…',
    );
});

it('sentence splitting respects abbreviations and quotes', () => {
    const s = splitIntoSentences(
        'I saw Dr. Smith today. He said, "Come back tomorrow." OK?',
    );
    expect(s).toEqual([
        'I saw Dr. Smith today.',
        'He said, "Come back tomorrow."',
        'OK?',
    ]);
});

it('avoids splitting list commas', () => {
    const c = splitSentenceIntoClauses(
        'We bought apples, bananas, and pears, but forgot oranges.',
    );
    expect(c).toEqual([
        'We bought apples, bananas, and pears',
        'but forgot oranges.',
    ]);
});

it('splits clause commas with conjunctions', () => {
    const c = splitSentenceIntoClauses(
        'I came, and I saw, but I did not conquer.',
    );
    expect(c).toEqual(['I came', 'and I saw', 'but I did not conquer.']);
});

it('handles em dashes and semicolons', () => {
    const c = splitSentenceIntoClauses(
        'He paused — just briefly — then continued; it was fine.',
    );
    expect(c).toEqual([
        'He paused — just briefly — then continued',
        'it was fine.',
    ]);
});

it('is tolerant of noisy punctuation & ellipses', () => {
    const c = splitTextIntoClauses(
        'This is messy!!! I mean, really messy, because — well — it is...',
    );
    expect(c).toEqual([
        'This is messy!',
        'I mean',
        'really messy',
        'because — well — it is…',
    ]);
});
