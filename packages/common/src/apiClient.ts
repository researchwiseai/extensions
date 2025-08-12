import fetchOriginal from 'cross-fetch';
import { PromisePool } from '@supercharge/promise-pool';
import { createBatches, sampleInputs } from './input';
import * as Jobs from './jobs';

// Toggle verbose logging
const DEBUG_LOG = false;
const debugLog = (...args: any[]) => {
    if (DEBUG_LOG) {
        console.log(...args);
    }
};
// Abstracted fetch for cross-platform support (injectable for Apps Script)
export interface FetchOptions {
    method?: 'post' | 'get' | 'put' | 'delete' | 'patch';
    contentType?: string;
    headers?: Record<string, string>;
    body?: string;
    [key: string]: any;
}
type FetchFunction = (
    url: string,
    options?: FetchOptions,
) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<any>;
    text: () => Promise<string>;
}>;
export let fetchFn: FetchFunction = fetchOriginal;
let sleepFn = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
export function configureFetch(fn: FetchFunction): void {
    fetchFn = fn;
}
/**
 * Override the sleep function used by the API client.
 * Useful for environments like Google Apps Script.
 */
export function configureSleep(fn: (ms: number) => Promise<void>): void {
    sleepFn = fn;
}

/** Configuration options for the API client */
export interface ConfigureOptions {
    /** Base URL for the Pulse API (e.g. https://api.example.com/v1) */
    baseUrl: string;
    /** Async function to retrieve an OAuth access token */
    getAccessToken: () => Promise<string>;
}

let baseUrl: string;
let getAccessToken: () => Promise<string>;
/**
 * Delay for the given milliseconds.
 */
function sleep(ms: number): Promise<void> {
    return sleepFn(ms);
}

interface PostWithJobOptions {
    intervalMs?: number;
    onProgress?: (message: string) => void;
    taskName?: string;
    batchNumber?: number;
    batchCount?: number;
}

/**
 * Perform POST request that may return immediate data or a jobId to poll.
 * If response status is 202, polls the job status until completed, then fetches the result URL.
 */
async function postWithJob(
    url: string,
    body: Record<string, unknown>,
    options: PostWithJobOptions = {},
): Promise<any> {
    const intervalMs = options.intervalMs ?? 2000;

    const suffix = options.batchNumber
        ? ` (# ${options.batchNumber} of ${options.batchCount})`
        : '';
    const jobItem = Jobs.createItem({
        title: (options.taskName ?? 'Unknown task') + suffix,
    });

    // mark the job as started so the feed shows activity while waiting
    Jobs.updateItem({ jobId: jobItem.jobId, message: 'Request submitted...' });

    const token = await getAccessToken();
    const response = await fetchFn(url, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        mode: 'cors',
    });

    if (response.status === 200) {
        Jobs.updateItem({
            jobId: jobItem.jobId,
            message: options.taskName
                ? `${options.taskName} completed`
                : 'Request completed',
            status: 'completed',
        });

        options.onProgress?.(
            options.taskName
                ? `${options.taskName} complete successfully`
                : 'Request completed successfully',
        );
        return response.json();
    } else if (response.status === 202) {
        const startTime = Date.now();
        const elapsedTime = () => Date.now() - startTime;
        const elapsedTimeStr = () => {
            const elapsed = elapsedTime();

            const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
            const minutes = Math.floor(
                (elapsed % (1000 * 60 * 60)) / (1000 * 60),
            );
            const hours = Math.floor(elapsed / (1000 * 60 * 60));

            // Only show hours if more than 1 hour
            // Only show minutes if more than 1 minute
            const hoursStr = hours > 0 ? `${hours}h ` : '';
            const minutesStr = minutes > 0 ? `${minutes}m ` : '';
            const secondsStr = `${seconds}s`;
            return `${hoursStr}${minutesStr}${secondsStr}`;
        };

        // Job accepted; poll for completion
        const data = await response.json();
        const jobId = data.job_id;
        if (typeof jobId !== 'string') {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }

        Jobs.updateItem({
            jobId: jobItem.jobId,
            message: 'Polling job status...',
        });

        options.onProgress?.(
            options.taskName
                ? `${options.taskName} job submitted, polling for completion...`
                : 'Job submitted, polling for completion...',
        );

        let loopCount = 0;
        // Poll until done
        while (true) {
            loopCount++;
            debugLog(`Polling job status: ${jobId} (attempt ${loopCount})`);
            if (loopCount % 2 === 0) {
                options.onProgress?.(
                    options.taskName
                        ? `Waiting for ${options.taskName.toLowerCase()} job to complete...`
                        : 'Waiting for job to complete...',
                );
            }

            Jobs.updateItem({
                jobId: jobItem.jobId,
                message: `Polling job status... (${elapsedTimeStr()})`,
            });

            await sleep(intervalMs);
            const status = await pollJobStatus(jobId);
            if (status.status === 'pending') {
                continue;
            } else if (status.status === 'completed') {
                if (!status.result_url) {
                    Jobs.updateItem({
                        jobId: jobItem.jobId,
                        message: 'Results URL missing',
                        status: 'failed',
                    });

                    throw new Error(
                        `Missing resultUrl in job status: ${JSON.stringify(status)}`,
                    );
                }
                try {
                    const resultResp = await fetchFn(status.result_url);
                    if (!resultResp.ok) {
                        const errText = await resultResp.text();

                        Jobs.updateItem({
                            jobId: jobItem.jobId,
                            message: `Error fetching results: ${errText}`,
                            status: 'failed',
                        });

                        throw new Error(`${resultResp.statusText}: ${errText}`);
                    }

                    Jobs.updateItem({
                        jobId: jobItem.jobId,
                        message: `Job completed in ${elapsedTimeStr()}`,
                        status: 'completed',
                    });

                    options.onProgress?.(
                        options.taskName
                            ? `${options.taskName} job completed successfully`
                            : 'Job completed successfully',
                    );
                    return await resultResp.json();
                } catch (err) {
                    console.error(err);
                    Jobs.updateItem({
                        jobId: jobItem.jobId,
                        message: `Error fetching results: ${err}`,
                        status: 'failed',
                    });
                    throw err;
                }
            } else {
                Jobs.updateItem({
                    jobId: jobItem.jobId,
                    message: `Job failed (${status.status})`,
                    status: 'failed',
                });
                throw new Error(`Job failed with status: ${status.status}`);
            }
        }
    } else {
        const errText = await response.text();
        Jobs.updateItem({
            jobId: jobItem.jobId,
            message: `Error: ${errText}`,
            status: 'failed',
        });
        throw new Error(`${response.statusText}: ${errText}`);
    }
}

/**
 * Initialize the API client with base URL and token provider.
 */
export function configureClient(opts: ConfigureOptions): void {
    baseUrl = opts.baseUrl;
    getAccessToken = opts.getAccessToken;
}

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
    ignoreCache?: boolean;
    onProgress?: (message: string) => void;
}

/**
 * Call the sentiment analysis endpoint.
 * Returns final results, polling a job if necessary.
 */
export async function analyzeSentiment(
    inputs: string[],
    options?: AnalyzeSentimentOptions,
): Promise<{ results: SentimentResult[] }> {
    const url = `${baseUrl}/v1/sentiment`;
    const data = await postWithJob(
        url,
        { fast: options?.fast, ignoreCache: options?.ignoreCache, inputs },
        { taskName: 'Sentiment analysis', onProgress: options?.onProgress },
    );
    if (Array.isArray(data.results)) {
        return { results: data.results };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

interface GenerateThemesOptions {
    fast?: boolean;
    /** Optional context description for the theme generation request */
    context?: string;
    onProgress?: (message: string) => void;
}

/**
 * Call the theme generation endpoint.
 * Returns final themes, polling a job if necessary.
 */
export async function generateThemes(
    inputs: string[],
    options?: GenerateThemesOptions,
): Promise<{ themes: Theme[] }> {
    debugLog('Generating themes for inputs:', inputs);

    const sampledInputs = sampleInputs(inputs, options?.fast ? 200 : 500);

    const url = `${baseUrl}/v1/themes`;
    // Include optional context field when provided
    const body: Record<string, unknown> = {
        inputs: sampledInputs,
        fast: options?.fast ?? false,
    };
    if (options?.context) {
        body.context = options.context;
    }
    const data = await postWithJob(url, body, {
        onProgress: options?.onProgress,
        taskName: 'Theme generation',
    });
    debugLog('Generated themes:', data);
    if (Array.isArray(data.themes)) {
        return { themes: data.themes };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

/**
 * Expose allocateThemes from themes module through API client.
 */
export { allocateThemes } from './themes';

type Unit = 'sentence' | 'newline' | 'word';
type Agg = 'mean' | 'max' | 'top2' | 'top3';

interface SetSplitOptions {
    unit: Unit;
    agg: Agg;
    window_size?: number;
    stride_size?: number;
}

type Split = {
    set_a?: SetSplitOptions;
    set_b?: SetSplitOptions;
};

interface CompareSimilarityOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
    split?: Split;
}

function shouldBatchSimilarityRequest({
    setA,
    setB,
    options,
}: {
    setA: string[];
    setB: string[];
    options?: CompareSimilarityOptions;
}): boolean {
    const { fast } = options ?? {};
    const oversized = setA.length * setB.length > 10_000;

    return oversized && !fast;
}

export async function batchSimilarity(
    setA: string[],
    setB: string[],
    options?: CompareSimilarityOptions,
): Promise<SimilarityResponse> {
    const url = `${baseUrl}/v1/similarity`;
    const result: SimilarityResponse = { matrix: [] };

    const shorter: 'setA' | 'setB' =
        setA.length < setB.length ? 'setA' : 'setB';

    const batches: {
        set_a: string[];
        set_b: string[];
        options: {
            fast?: boolean;
            split?: Split;
            flattened?: boolean;
        };
    }[] = [];

    if (shorter === 'setA') {
        // Split setB into batches
        const maxBatchSize = Math.floor(50_000 / setA.length);
        const batchesNeeded = Math.ceil(setB.length / maxBatchSize);
        const batchSize = Math.ceil(setB.length / batchesNeeded);
        const setBBatches = createBatches(setB, batchSize);

        setBBatches.forEach((batch) => {
            batches.push({
                set_a: setA,
                set_b: batch,
                options: {
                    fast: false,
                    split: options?.split,
                    flattened: false,
                },
            });
        });
    } else {
        // Split setA into batches
        const maxBatchSize = Math.floor(50_000 / setB.length);
        const batchesNeeded = Math.ceil(setA.length / maxBatchSize);
        const batchSize = Math.ceil(setA.length / batchesNeeded);
        const setABatches = createBatches(setA, batchSize);

        setABatches.forEach((batch) => {
            batches.push({
                set_a: batch,
                set_b: setB,
                options: {
                    fast: false,
                    split: options?.split,
                    flattened: false,
                },
            });
        });
    }

    const { results, errors } = await PromisePool.for(batches)
        .withConcurrency(4)
        .onTaskFinished((_, pool) => {
            options?.onProgress?.(
                `Processed ${pool.processedPercentage()}% of similarity batches`,
            );
        })
        .useCorrespondingResults()
        .process(async (batch, index) => {
            const data: any = await postWithJob(url, batch, {
                onProgress: (msg) => {
                    options?.onProgress?.(
                        `Batch ${index + 1} of ${batches.length}: ${msg}`,
                    );
                },
                taskName: 'Similarity comparison',
                batchNumber: index + 1,
                batchCount: batches.length,
            });

            return data as SimilarityResponse;
        });

    let throwError = false;
    errors.forEach((error) => {
        console.error(error);
        throwError = true;
    });

    if (throwError) {
        console.error(
            `Batch similarity request failed with ${errors.length} errors.`,
        );
        throw new Error(
            `Batch similarity request failed with ${errors.length} errors.`,
        );
    }

    for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (typeof res !== 'symbol') {
            result.matrix.push(...res.matrix);
        } else {
            console.error(`Batch ${i} failed with error: ${res.description}`);
            throwError = true;
        }
    }

    if (throwError) {
        throw new Error(
            `Batch similarity request failed with ${errors.length} errors.`,
        );
    }

    return result;
}

/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
export async function compareSimilarity(
    setA: string[],
    setB: string[],
    options?: CompareSimilarityOptions,
): Promise<SimilarityResponse> {
    if (shouldBatchSimilarityRequest({ setA, setB, options })) {
        return batchSimilarity(setA, setB, options);
    } else {
        const url = `${baseUrl}/v1/similarity`;
        const result: SimilarityResponse = { matrix: [] };
        const data: any = await postWithJob(
            url,
            {
                set_a: setA,
                set_b: setB,
                fast: options?.fast ?? false,
                split: options?.split ?? false,
            },
            {
                onProgress: options?.onProgress,
                taskName: 'Similarity comparison',
            },
        );

        if (data.matrix) {
            result.matrix = data.matrix;
        } else if (data.flattened) {
            // Reconstruct matrix from flattened array
            const n = setA.length;
            const m = setB.length;
            result.matrix = [];
            for (let i = 0; i < n; i++) {
                result.matrix[i] = data.flattened.slice(i * m, (i + 1) * m);
            }
        }
        return result;
    }
}

/**
 * Poll an asynchronous job by jobId.
 */
export async function pollJobStatus(jobId: string): Promise<JobStatus> {
    if (!baseUrl || !getAccessToken) {
        throw new Error(
            'API client not configured. Call configureClient first.',
        );
    }
    const token = await getAccessToken();
    const url = `${baseUrl}/v1/jobs?jobId=${encodeURIComponent(jobId)}`;
    const response = await fetchFn(url, {
        method: 'get',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
