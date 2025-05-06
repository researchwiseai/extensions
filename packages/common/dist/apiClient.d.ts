export interface FetchOptions {
    method?: 'post' | 'get' | 'put' | 'delete' | 'patch';
    contentType?: string;
    headers?: Record<string, string>;
    body?: string;
    [key: string]: any;
}
type FetchFunction = (url: string, options?: FetchOptions) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<any>;
    text: () => Promise<string>;
}>;
export declare let fetchFn: FetchFunction;
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
export declare function configureFetch(fn: FetchFunction): void;
/**
 * Override the sleep function used by the API client.
 * Useful for environments like Google Apps Script.
 */
export declare function configureSleep(fn: (ms: number) => Promise<void>): void;
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
    sentiment: string;
    [key: string]: any;
}
/** Theme object returned by the themes endpoint */
export interface Theme {
    label: string;
    shortLabel: string;
    description: string;
    representatives: string[];
}
/** Structure for similarity response */
export interface SimilarityResponse {
    matrix: number[][];
}
/** Job status returned when polling asynchronous jobs */
export interface JobStatus {
    status: string;
    resultUrl?: string;
    [key: string]: any;
}
interface AnalyzeSentimentOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
}
/**
 * Call the sentiment analysis endpoint.
 * Returns final results, polling a job if necessary.
 */
export declare function analyzeSentiment(inputs: string[], options?: AnalyzeSentimentOptions): Promise<{
    results: SentimentResult[];
}>;
interface GenerateThemesOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
}
/**
 * Call the theme generation endpoint.
 * Returns final themes, polling a job if necessary.
 */
export declare function generateThemes(inputs: string[], options?: GenerateThemesOptions): Promise<{
    themes: Theme[];
}>;
interface CompareSimilarityOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
}
/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
export declare function compareSimilarity(setA: string[], setB: string[], options?: CompareSimilarityOptions): Promise<SimilarityResponse>;
/**
 * Poll an asynchronous job by jobId.
 */
export declare function pollJobStatus(jobId: string): Promise<JobStatus>;
export {};
