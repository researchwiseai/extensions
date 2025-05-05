import fetchOriginal from 'cross-fetch';
// Abstracted fetch for cross-platform support (injectable for Apps Script)
export interface FetchOptions {
    method?:
        | 'post'
        | 'get'
        | 'put'
        | 'delete'
        | 'patch';
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
export let fetchFn: FetchFunction = fetchOriginal;
let sleepFn = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
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
    /** Base URL for the Pulse API (e.g. https://api.example.com/pulse/v1) */
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

    const token = await getAccessToken();
    const response = await fetchFn(url, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (response.status === 200) {
        options.onProgress?.( options.taskName ? `${options.taskName} complete successfully` : 'Request completed successfully');
        return response.json();
    } else if (response.status === 202) {
        // Job accepted; poll for completion
        const data = await response.json();
        const jobId = data.jobId;
        if (typeof jobId !== 'string') {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }

        options.onProgress?.( options.taskName ? `${options.taskName} job submitted, polling for completion...` : 'Job submitted, polling for completion...');

        let loopCount = 0;
        // Poll until done
        while (true) {
            loopCount++;
            console.log(`Polling job status: ${jobId} (attempt ${loopCount})`);
            if (loopCount % 2 === 0) {
                options.onProgress?.( options.taskName ? `Waiting for ${options.taskName.toLowerCase()} job to complete...` : 'Waiting for job to complete...');
            }
            await sleep(intervalMs);
            const status = await pollJobStatus(jobId);
            if (status.status === 'pending') {
                continue;
            } else if (status.status === 'completed') {
                if (!status.resultUrl) {
                    throw new Error(
                        `Missing resultUrl in job status: ${JSON.stringify(status)}`,
                    );
                }
                const resultResp = await fetchFn(status.resultUrl, { contentType: 'application/json', method: 'get', headers: { 'Content-Type': 'application/json'} });
                if (!resultResp.ok) {
                    const errText = await resultResp.text();
                    throw new Error(`${resultResp.statusText}: ${errText}`);
                }

                options.onProgress?.( options.taskName ? `${options.taskName} job completed successfully` : 'Job completed successfully');
                return await resultResp.json();
            } else {
                throw new Error(`Job failed with status: ${status.status}`);
            }
        }
    } else {
        const errText = await response.text();
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
    const url = `${baseUrl}/pulse/v1/sentiment`;
    const data = await postWithJob(url, { fast: options?.fast, inputs }, { taskName: 'Sentiment analysis', onProgress: options?.onProgress });
    if (Array.isArray(data.results)) {
        return { results: data.results };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

interface GenerateThemesOptions {
    fast?: boolean;
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
    console.log('Generating themes for inputs:', inputs);

    const url = `${baseUrl}/pulse/v1/themes`;
    const data = await postWithJob(url, {
        inputs,
        fast: options?.fast ?? false,
    }, {
        onProgress: options?.onProgress,
        taskName: 'Theme generation',
    });
    console.log('Generated themes:', data);
    if (Array.isArray(data.themes)) {
        return { themes: data.themes };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

interface CompareSimilarityOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
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
    const url = `${baseUrl}/pulse/v1/similarity`;
    const data: any = await postWithJob(url, {
        set_a: setA,
        set_b: setB,
        fast: options?.fast ?? false,
    }, {
        onProgress: options?.onProgress,
        taskName: 'Similarity comparison',
    });
    const result: SimilarityResponse = { matrix: [] };
    if (data.matrix) {
        result.matrix = data.matrix;
    }
    if (data.flattened) {
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
    const url = `${baseUrl}/pulse/v1/jobs?jobId=${encodeURIComponent(jobId)}`;
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
