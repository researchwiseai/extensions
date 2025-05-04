import fetchOriginal from 'cross-fetch';
type FetchFunction = typeof fetchOriginal;
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
export declare function configureFetch(fn: FetchFunction): void;
/** Configuration options for the API client */
export interface ConfigureOptions {
    /** Base URL for the Pulse API (e.g. https://api.example.com/pulse/v1) */
    baseUrl: string;
    /** Async function to retrieve an OAuth access token */
    getAccessToken: () => Promise<string>;
}
/**
 * Initialize the API client with base URL and token provider.
 */
export declare function configureClient(opts: ConfigureOptions): void;
/** Result of a sentiment analysis call */
export interface SentimentResult {
    sentiment: number;
    [key: string]: any;
}
/** Theme object returned by the themes endpoint */
export interface Theme {
    label: string;
    representatives: string[];
}
/** Structure for similarity response */
export interface SimilarityResponse {
    matrix?: number[][];
    flattened?: number[];
}
/** Job status returned when polling asynchronous jobs */
export interface JobStatus {
    status: string;
    resultUrl?: string;
    [key: string]: any;
}
/**
 * Call the sentiment analysis endpoint.
 * Returns final results, polling a job if necessary.
 */
export declare function analyzeSentiment(inputs: string[], fast?: boolean): Promise<{
    results?: SentimentResult[];
    jobId?: string;
}>;
interface GenerateThemesOptions {
    fast?: boolean;
}
/**
 * Call the theme generation endpoint.
 * Returns final themes, polling a job if necessary.
 */
export declare function generateThemes(inputs: string[], options?: GenerateThemesOptions): Promise<{
    themes?: Theme[];
    jobId?: string;
}>;
/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
export declare function allocateThemes(setA: string[], setB: string[], fast?: boolean): Promise<SimilarityResponse & {
    jobId?: string;
}>;
/**
 * Poll an asynchronous job by jobId.
 */
export declare function pollJobStatus(jobId: string): Promise<JobStatus>;
export {};
