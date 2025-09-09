/*
  Clause Splitter — tolerant clause segmentation for messy user text.

  Goals
  - Split text → sentences → clauses
  - Split on commas that begin a new clause (e.g., before coordinating/subordinating conjunctions),
    but avoid commas that are part of simple lists.
  - Be robust to noisy punctuation like "!!!", "??", "--", and extra spaces.
  - Avoid splitting inside quotes, parentheses/brackets, or URLs/emails.

  Trade‑offs
  - This is heuristic, not a full parser. It aims for practical quality on UGC.
  - Includes a light list detector and a conjunction-led clause rule.

  Public API
  - normalize(text): string
  - splitIntoSentences(text): string[]
  - splitSentenceIntoClauses(sentence): string[]
  - splitTextIntoClauses(text): string[]
*/

import { getSheetInputsAndPositions } from 'src/services/getSheetInputsAndPositions';
import { maybeActivateSheet } from 'src/services/maybeActivateSheet';
import { applyTextColumnFormatting } from 'src/services/applyTextColumnFormatting';

// --- Utility regexes -------------------------------------------------------

// Basic URL / email tokens to avoid accidental splits within them
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi; // global for matchAll()
const EMAIL_RE = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi;

// Common abbreviations that end with a period but shouldn't end a sentence
// (US/UK-ish blend; extend as needed)
const ABBREV = [
    'mr',
    'mrs',
    'ms',
    'dr',
    'prof',
    'sr',
    'jr',
    'vs',
    'etc',
    'e.g',
    'i.e',
    'cf',
    'no',
    'dept',
    'inc',
    'ltd',
    'co',
    'corp',
    'mt',
    'st',
    'rd',
    'ave',
    'jan',
    'feb',
    'mar',
    'apr',
    'jun',
    'jul',
    'aug',
    'sep',
    'sept',
    'oct',
    'nov',
    'dec',
    // time & academic
    'a.m',
    'p.m',
    'ph.d',
    'u.s',
    'u.k',
];
const ABBREV_RE = new RegExp(`\\b(?:${ABBREV.join('|')})\\.$`, 'i');

// Coordinating conjunctions (FANBOYS) and some common subordinators
const COORD_CONJ_RE = /^(?:and|but|or|nor|for|so|yet)$/i;
const SUBORD_CONJ_RE =
    /^(?:because|although|though|while|whereas|since|if|unless|until|when|whenever|after|before|once|as)$/i;

// Tokens that often start independent clauses pragmatically
const CLAUSE_STARTERS_RE =
    /^(?:however|nevertheless|therefore|consequently|meanwhile|still|then|instead|also|plus|besides)$/i;

// Quote/Bracket characters
const OPENERS = ['(', '[', '{', '“', '‘', '"', "'"]; // keep both straight and curly
const CLOSERS_MAP: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '“': '”',
    '‘': '’',
    '"': '"',
    "'": "'",
};
const CLOSERS = new Set(Object.values(CLOSERS_MAP));
const CLOSER_TO_OPENER: Record<string, string> = Object.fromEntries(
    Object.entries(CLOSERS_MAP).map(([k, v]) => [v, k]),
);

// --- Helpers for spans/masks ----------------------------------------------

type Span = { start: number; end: number }; // [start, end)

function spansFromRegex(text: string, re: RegExp): Span[] {
    const spans: Span[] = [];
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
        if (m.index != null)
            spans.push({ start: m.index, end: m.index + m[0].length });
    }
    return spans;
}

function buildMask(len: number, spans: Span[]): Uint8Array {
    const mask = new Uint8Array(len);
    for (const { start, end } of spans) {
        for (let i = start; i < end && i < len; i++) mask[i] = 1;
    }
    return mask;
}

function mergeSpans(a: Span[], b: Span[]): Span[] {
    const all = [...a, ...b].sort((x, y) => x.start - y.start);
    if (!all.length) return all;
    const out: Span[] = [all[0]];
    for (let i = 1; i < all.length; i++) {
        const last = out[out.length - 1];
        const cur = all[i];
        if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
        else out.push({ ...cur });
    }
    return out;
}

/** Build masks for: inside URL/email, and inside brackets/quotes. */
function preparseProtections(text: string) {
    // 1) URLs & emails via regex once
    const urlSpans = spansFromRegex(text, URL_RE);
    const emailSpans = spansFromRegex(text, EMAIL_RE);
    const linkSpans = mergeSpans(urlSpans, emailSpans);
    const inLinkMask = buildMask(text.length, linkSpans);

    // 2) Brackets/quotes with a stack; treat apostrophes (') and quotes (") as *quotes* only
    //    when not sandwiched between word chars (to avoid contractions like don't, it's)
    const inBracketMask = new Uint8Array(text.length);
    const stack: string[] = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const prev = text[i - 1] || '';
        const next = text[i + 1] || '';

        const isApostropheLike =
            (ch === '"' || ch === "'") && /\w/.test(prev) && /\w/.test(next);
        if (!isApostropheLike && OPENERS.includes(ch)) stack.push(ch);
        else if (CLOSERS.has(ch)) {
            const opener = CLOSER_TO_OPENER[ch];
            for (let j = stack.length - 1; j >= 0; j--) {
                if (stack[j] === opener) {
                    stack.splice(j, 1);
                    break;
                }
            }
        }

        if (stack.length > 0) inBracketMask[i] = 1;
    }

    return { inLinkMask, inBracketMask };
}

// --- Normalization ---------------------------------------------------------

/**
 * Normalize messy punctuation without being destructive.
 * - Collapse runs of ! or ? to a single char (preserve first)
 * - Collapse runs of dashes to an em dash
 * - Normalize spaces around punctuation
 * - Preserve ellipses ("..."), keep as a single ellipsis char during splitting
 */
export function normalize(text: string): string {
    return (
        text
            // keep ellipses as a sentinel to avoid false boundaries during splitting
            .replace(/\.{3,}/g, '…')
            // collapse !!! or ??? to single
            .replace(/([!?])\1{1,}/g, '$1')
            // collapse multiple dashes to an em dash
            .replace(/\s*[-–—]{2,}\s*/g, ' — ')
            // space around em dash
            .replace(/\s*—\s*/g, ' — ')
            // normalize commas and semicolons spacing
            .replace(/\s*,\s*/g, ', ')
            .replace(/\s*;\s*/g, '; ')
            // collapse excessive whitespace
            .replace(/\s{2,}/g, ' ')
            .trim()
    );
}

// --- Sentence splitting ----------------------------------------------------

/**
 * Split text into sentences with lightweight heuristics:
 * - Avoid breaking after abbreviations (e.g., "Dr.")
 * - Don’t break inside URLs/emails (pre-parsed)
 * - Handle quotes/brackets nesting (pre-parsed)
 */
export function splitIntoSentences(text: string): string[] {
    const s: string[] = [];
    if (!text) return s;

    // Work on normalized view to simplify punctuation (esp. ellipsis)
    const norm = normalize(text);
    const { inLinkMask, inBracketMask } = preparseProtections(norm);

    let start = 0;
    for (let i = 0; i < norm.length; i++) {
        const ch = norm[i];

        // Skip boundaries while inside brackets/quotes or links, except allow splitting on a period before a closing quote/bracket
        if (
            (inBracketMask[i] &&
                !(norm[i] === '.' && CLOSERS.has(norm[i + 1] || ''))) ||
            inLinkMask[i]
        ) {
            continue;
        }

        // Ellipsis should not trigger sentence end
        if (ch === '…') continue;

        // Potential sentence boundary
        if (ch === '.' || ch === '!' || ch === '?') {
            // Avoid decimals/versions: only for '.' and when adjacent to digits or dot
            if (ch === '.') {
                const prev = norm[i - 1] || '';
                const next = norm[i + 1] || '';
                const looksLikeNumber =
                    (/\d/.test(prev) && /\d/.test(next)) || next === '.';
                if (looksLikeNumber) continue;
            }

            // Avoid abbreviations at end of token
            const prevToken =
                norm
                    .slice(start, i + 1)
                    .trim()
                    .split(/\s+/)
                    .pop() || '';
            if (ABBREV_RE.test(prevToken)) continue;

            // extend to include trailing quotes/brackets and spaces
            let j = i + 1;
            while (j < norm.length && /[\")\]\}'”’\s]/.test(norm[j])) j++;
            const raw = norm.slice(start, j).trim();
            if (raw) s.push(raw.replace(/…/g, '...'));
            start = j;
            i = j - 1; // continue after the consumed tail
        }
    }

    // tail
    const tail = norm.slice(start).trim();
    if (tail) s.push(tail.replace(/…/g, '...'));
    return s;
}

// --- Clause splitting (per sentence) --------------------------------------

/**
 * Decide if a comma at index should be treated as a clause boundary.
 * Heuristics:
 *  1) Must be outside quotes/brackets.
 *  2) Comma followed by space and a clause-starter word (coord/subord conj, adverbial like "however").
 *  3) Avoid when the comma is inside a simple list pattern: a, b, c(, and d)
 */
function isClauseComma(
    sentence: string,
    commaIndex: number,
    inBracketMask?: Uint8Array,
): boolean {
    // 1) Not within quotes/brackets
    if (inBracketMask && inBracketMask[commaIndex]) return false;

    const after = sentence.slice(commaIndex + 1).trimStart();
    const nextWordMatch = after.match(/^(\w+)[^\w]?/);
    const nextWord = nextWordMatch ? nextWordMatch[1] : '';

    // 1) Avoid simple list commas before an 'and/or' noun phrase, e.g. "apples, and pears"
    if (COORD_CONJ_RE.test(nextWord)) {
        const nextComma = sentence.indexOf(',', commaIndex + 1);
        if (nextComma !== -1) {
            const segment = sentence.slice(commaIndex + 1, nextComma).trim();
            const words = segment.split(/\s+/);
            const verbishCount = words.filter((x) =>
                /(\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|\w+ed)\b)/i.test(
                    x,
                ),
            ).length;
            if (words.length <= 2 && verbishCount === 0) {
                return false;
            }
        }
    }

    // 2) Comma precedes a clear clause-starter (coord/subord conjunction or adverbial)
    if (
        COORD_CONJ_RE.test(nextWord) ||
        SUBORD_CONJ_RE.test(nextWord) ||
        CLAUSE_STARTERS_RE.test(nextWord)
    ) {
        return true;
    }

    // 3) Treat short leading pronoun-verb phrase as its own clause, e.g. "I mean,"
    const lead = sentence.slice(0, commaIndex).trim();
    const leadWords = lead.split(/\s+/);
    if (
        leadWords.length === 2 &&
        /^(?:I|you|he|she|it|we|they)$/i.test(leadWords[0])
    ) {
        return true;
    }

    // 4) Avoid list commas by heuristic clustering
    if (isLikelyListComma(sentence, commaIndex)) return false;

    // 5) Back-off rule: verb-like before + clause-like start after → clause
    const before = sentence.slice(0, commaIndex);
    const hasVerbish =
        /(\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|\w+ed|\w+s)\b)/i.test(
            before,
        );
    const startsLikeClause =
        /^(?:\s*(?:I|you|he|she|it|we|they|this|that|these|those|there|here|the|a|an|my|your|his|her|its|our|their)\b)/i.test(
            after,
        );
    if (hasVerbish && startsLikeClause) return true;

    return false;
}

function isInsideBracketsOrQuotes(text: string, idx: number): boolean {
    // Fallback single-pass checker (kept for API compatibility); prefer masks
    const stack: string[] = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const prev = text[i - 1] || '';
        const next = text[i + 1] || '';
        const isApostropheLike =
            (ch === '"' || ch === "'") && /\w/.test(prev) && /\w/.test(next);

        if (!isApostropheLike && OPENERS.includes(ch)) stack.push(ch);
        else if (CLOSERS.has(ch)) {
            const opener = CLOSER_TO_OPENER[ch];
            for (let j = stack.length - 1; j >= 0; j--) {
                if (stack[j] === opener) {
                    stack.splice(j, 1);
                    break;
                }
            }
        }

        if (i === idx) return stack.length > 0;
    }
    return false;
}

/**
 * Detects if a comma is inside a simple list pattern like "apples, bananas, and pears".
 * Strategy: take the nearest comma-delimited group and test for 3+ short, verb-less items.
 */
function isLikelyListComma(sentence: string, commaIndex: number): boolean {
    // find the bounds of the current comma-separated segment cluster
    const leftBound = findPrevBoundary(sentence, commaIndex);
    const rightBound = findNextBoundary(sentence, commaIndex);
    const cluster = sentence.slice(leftBound, rightBound);

    // split cluster on commas, keep small spans
    const items = cluster.split(/\s*,\s*/).map((s) => s.trim());

    // If we only have two items, could still be a coordination, but prefer not to treat as list unless clear
    if (items.length < 3) {
        // Two short noun-phrasey items followed by no conjunction → likely a list of two; avoid clause split
        const shortish = items.every((x) => x.split(/\s+/).length <= 4);
        const anyVerb = items.some((x) =>
            /(\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|\w+ed|\w+s)\b)/i.test(
                x,
            ),
        );
        if (shortish && !anyVerb) return true;
        return false;
    }

    // 3 or more: Likely a list if most items are short and verb-less
    const shortCount = items.filter((x) => x.split(/\s+/).length <= 5).length;
    const verbishCount = items.filter((x) =>
        /(\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must|\w+ed|\w+s)\b)/i.test(
            x,
        ),
    ).length;

    const likelyList =
        shortCount >= Math.max(2, Math.floor(items.length * 0.7)) &&
        verbishCount <= 1;

    // Oxford comma: allow trailing ", and X" within cluster without counting as clause
    const hasOxford =
        /,\s*and\s+\S+$/i.test(cluster) || /,\s*or\s+\S+$/i.test(cluster);

    return likelyList || hasOxford;
}

function findPrevBoundary(s: string, from: number): number {
    for (let i = from; i >= 0; i--) {
        if (/[.;!?]/.test(s[i])) return i + 1;
    }
    return 0;
}

function findNextBoundary(s: string, from: number): number {
    for (let i = from; i < s.length; i++) {
        if (/[.;!?]/.test(s[i])) return i;
    }
    return s.length;
}

/**
 * Split one sentence into clauses.
 * Breakers:
 *  - Commas that satisfy isClauseComma
 *  - Semicolons (outside quotes/brackets)
 *  - Em dashes (—) and single hyphen dashes surrounded by spaces ( - )
 */
export function splitSentenceIntoClauses(sentence: string): string[] {
    const clauses: string[] = [];

    // Pre-parse bracket/quote spans for this sentence once
    const { inBracketMask } = preparseProtections(sentence);

    let start = 0;
    for (let i = 0; i < sentence.length; i++) {
        const ch = sentence[i];

        if (ch === ';' && !inBracketMask[i]) {
            const chunk = sentence.slice(start, i).trim();
            if (chunk) clauses.push(chunk);
            start = i + 1;
        } else if (ch === ',' && isClauseComma(sentence, i, inBracketMask)) {
            const chunk = sentence.slice(start, i).trim();
            if (chunk) clauses.push(chunk);
            start = i + 1;
        }
    }

    // tail & restore ellipses
    const tail = sentence.slice(start).trim();
    if (tail) clauses.push(tail);
    // convert placeholder ellipses back to single-char
    return clauses.map((cl) => cl.replace(/\.\.\./g, '…'));
}

// --- Top-level convenience -------------------------------------------------

export function splitTextIntoClauses(text: string): string[] {
    // Note: splitIntoSentences() already normalizes & protects; keep this simple
    return splitIntoSentences(text).flatMap(splitSentenceIntoClauses);
}

// Example usage (remove or adapt in app code):
// const text = "I ran, and I jumped, but I didn’t fall. We bought apples, bananas, and pears.";
// console.log(splitTextIntoClauses(text));

/**
 * Split a range of text in Excel into clauses.
 */
export async function splitToClausesFlow(
    context: Excel.RequestContext,
    range: string,
): Promise<void> {
    const startTime = Date.now();
    const { inputs, positions, sheet, rangeInfo } =
        await getSheetInputsAndPositions(context, range);

    const clauses = inputs.map((input) => splitTextIntoClauses(input ?? ''));

    const maxClauses = Math.max(...clauses.map((c) => c.length));

    const result = Array.from({ length: maxClauses }, () =>
        Array.from({ length: positions.length }, () => ''),
    );

    console.log('clauses', clauses);
    console.log('result', result);

    const originalRange = sheet.getRangeByIndexes(
        rangeInfo.rowIndex,
        rangeInfo.columnIndex,
        rangeInfo.rowCount,
        rangeInfo.columnCount,
    );
    originalRange.load('values');
    await context.sync();

    const outputSheet = context.workbook.worksheets.add(
        `Clauses_${Date.now()}`,
    );
    const header = ['Text'];
    for (let i = 0; i < maxClauses; i++) {
        header.push(`Clause ${i + 1}`);
    }
    outputSheet.getRangeByIndexes(0, 0, 1, header.length).values = [header];
    // Bold header row
    try {
        outputSheet.getRangeByIndexes(0, 0, 1, header.length).format.font.bold = true;
    } catch {}
    const target = outputSheet
        .getRange('A2')
        .getResizedRange(rangeInfo.rowCount - 1, 0);
    target.values = originalRange.values;

    const batchSize = 1000;
    let batch: { cell: Excel.Range; value: string }[] = [];

    positions.forEach((pos, i) => {
        const cls = clauses[i];
        cls.forEach((c, j) => {
            const rowIndex = pos.row - rangeInfo.rowIndex;
            const cell = outputSheet.getCell(rowIndex, j + 1);
            batch.push({ cell, value: c });

            if (batch.length >= batchSize) {
                batch.forEach(({ cell, value }) => {
                    cell.values = [[value]];
                });
                batch = [];
                context.sync();
            }
        });
    });

    if (batch.length > 0) {
        batch.forEach(({ cell, value }) => {
            cell.values = [[value]];
        });
        await context.sync();
    }

    // Improve readability of the first column containing long text
    await applyTextColumnFormatting(outputSheet, context, 'A');

    await maybeActivateSheet(context, outputSheet, startTime);
}
