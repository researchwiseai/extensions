"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFn = void 0;
exports.configureFetch = configureFetch;
exports.configureSleep = configureSleep;
exports.configureClient = configureClient;
exports.analyzeSentiment = analyzeSentiment;
exports.generateThemes = generateThemes;
exports.compareSimilarity = compareSimilarity;
exports.pollJobStatus = pollJobStatus;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
exports.fetchFn = cross_fetch_1.default;
let sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
function configureFetch(fn) {
    exports.fetchFn = fn;
}
/**
 * Override the sleep function used by the API client.
 * Useful for environments like Google Apps Script.
 */
function configureSleep(fn) {
    sleepFn = fn;
}
let baseUrl;
let getAccessToken;
/**
 * Delay for the given milliseconds.
 */
function sleep(ms) {
    return sleepFn(ms);
}
/**
 * Perform POST request that may return immediate data or a jobId to poll.
 * If response status is 202, polls the job status until completed, then fetches the result URL.
 */
async function postWithJob(url, body, options = {}) {
    const intervalMs = options.intervalMs ?? 2000;
    const token = await getAccessToken();
    const response = await (0, exports.fetchFn)(url, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (response.status === 200) {
        options.onProgress?.(options.taskName ? `${options.taskName} complete successfully` : 'Request completed successfully');
        return response.json();
    }
    else if (response.status === 202) {
        // Job accepted; poll for completion
        const data = await response.json();
        const jobId = data.jobId;
        if (typeof jobId !== 'string') {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }
        options.onProgress?.(options.taskName ? `${options.taskName} job submitted, polling for completion...` : 'Job submitted, polling for completion...');
        let loopCount = 0;
        // Poll until done
        while (true) {
            loopCount++;
            console.log(`Polling job status: ${jobId} (attempt ${loopCount})`);
            if (loopCount % 2 === 0) {
                options.onProgress?.(options.taskName ? `Waiting for ${options.taskName.toLowerCase()} job to complete...` : 'Waiting for job to complete...');
            }
            await sleep(intervalMs);
            const status = await pollJobStatus(jobId);
            if (status.status === 'pending') {
                continue;
            }
            else if (status.status === 'completed') {
                if (!status.resultUrl) {
                    throw new Error(`Missing resultUrl in job status: ${JSON.stringify(status)}`);
                }
                const resultResp = await (0, exports.fetchFn)(status.resultUrl, { contentType: 'application/json', method: 'get', headers: { 'Content-Type': 'application/json' } });
                if (!resultResp.ok) {
                    const errText = await resultResp.text();
                    throw new Error(`${resultResp.statusText}: ${errText}`);
                }
                options.onProgress?.(options.taskName ? `${options.taskName} job completed successfully` : 'Job completed successfully');
                return await resultResp.json();
            }
            else {
                throw new Error(`Job failed with status: ${status.status}`);
            }
        }
    }
    else {
        const errText = await response.text();
        throw new Error(`${response.statusText}: ${errText}`);
    }
}
/**
 * Initialize the API client with base URL and token provider.
 */
function configureClient(opts) {
    baseUrl = opts.baseUrl;
    getAccessToken = opts.getAccessToken;
}
/**
 * Call the sentiment analysis endpoint.
 * Returns final results, polling a job if necessary.
 */
async function analyzeSentiment(inputs, options) {
    const url = `${baseUrl}/pulse/v1/sentiment`;
    const data = await postWithJob(url, { fast: options?.fast, inputs }, { taskName: 'Sentiment analysis', onProgress: options?.onProgress });
    if (Array.isArray(data.results)) {
        return { results: data.results };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}
/**
 * Call the theme generation endpoint.
 * Returns final themes, polling a job if necessary.
 */
async function generateThemes(inputs, options) {
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
/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
async function compareSimilarity(setA, setB, options) {
    const url = `${baseUrl}/pulse/v1/similarity`;
    const data = await postWithJob(url, {
        set_a: setA,
        set_b: setB,
        fast: options?.fast ?? false,
    }, {
        onProgress: options?.onProgress,
        taskName: 'Similarity comparison',
    });
    const result = { matrix: [] };
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
async function pollJobStatus(jobId) {
    if (!baseUrl || !getAccessToken) {
        throw new Error('API client not configured. Call configureClient first.');
    }
    const token = await getAccessToken();
    const url = `${baseUrl}/pulse/v1/jobs?jobId=${encodeURIComponent(jobId)}`;
    const response = await (0, exports.fetchFn)(url, {
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
