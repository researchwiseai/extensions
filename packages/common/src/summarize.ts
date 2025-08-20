/**
 * Summarization presets for consistent UX across clients.
 *
 * NOTE: Avoid TypeScript `enum` here because some consumers (e.g. babel-loader
 * without ts-loader) do not emit runtime code for enums, resulting in an empty
 * object and blank preset lists in the UI. Using a const array + union type
 * keeps runtime values simple while preserving strong typing.
 */
export const SummarizePresets = [
    'five-point',
    'ten-point',
    'one-tweet',
    'three-tweets',
    'one-para',
    'exec',
    'two-pager',
    'one-pager',
] as const;

export type SummarizePreset = (typeof SummarizePresets)[number];

/**
 * Human-friendly labels for presets (stable for UI usage).
 */
export const SummarizePresetLabels: Record<SummarizePreset, string> = {
    'five-point': 'Five-Point Summary',
    'ten-point': 'Ten-Point Summary',
    'one-tweet': 'One Tweet',
    'three-tweets': 'Three Tweets',
    'one-para': 'One Paragraph',
    exec: 'Executive Summary',
    'two-pager': 'Two-Pager',
    'one-pager': 'One-Pager',
};

/**
 * Radio-friendly options list for UI components.
 */
export const SummarizePresetOptions = SummarizePresets.map((value) => ({
    value,
    label: SummarizePresetLabels[value],
})) as ReadonlyArray<{
    readonly value: SummarizePreset;
    readonly label: string;
}>;
