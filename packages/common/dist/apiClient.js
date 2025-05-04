"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureFetch = configureFetch;
exports.configureClient = configureClient;
exports.analyzeSentiment = analyzeSentiment;
exports.generateThemes = generateThemes;
exports.allocateThemes = allocateThemes;
exports.pollJobStatus = pollJobStatus;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
let fetchFn = cross_fetch_1.default;
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
function configureFetch(fn) {
    fetchFn = fn;
}
let baseUrl;
let getAccessToken;
/**
 * Delay for the given milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Perform POST request that may return immediate data or a jobId to poll.
 * If response status is 202, polls the job status until completed, then fetches the result URL.
 */
async function postWithJob(url, body, intervalMs = 2000) {
    const token = await getAccessToken();
    const response = await fetchFn(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    if (response.ok) {
        return response.json();
    }
    else if (response.status === 202) {
        // Job accepted; poll for completion
        const data = await response.json();
        const jobId = data.jobId;
        if (typeof jobId !== 'string') {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }
        // Poll until done
        while (true) {
            await sleep(intervalMs);
            const status = await pollJobStatus(jobId);
            if (status.status === 'pending') {
                continue;
            }
            else if (status.status === 'completed') {
                if (!status.resultUrl) {
                    throw new Error(`Missing resultUrl in job status: ${JSON.stringify(status)}`);
                }
                const resultResp = await fetchFn(status.resultUrl, {
                    headers: { Authorization: `Bearer ${await getAccessToken()}` },
                });
                if (!resultResp.ok) {
                    const errText = await resultResp.text();
                    throw new Error(`${resultResp.statusText}: ${errText}`);
                }
                return resultResp.json();
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
async function analyzeSentiment(inputs, fast = false) {
    const url = `${baseUrl}/pulse/v1/sentiment`;
    const data = await postWithJob(url, { fast, inputs });
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
    const url = `${baseUrl}/pulse/v1/themes`;
    const data = await postWithJob(url, { inputs, fast: options?.fast ?? false });
    if (Array.isArray(data.themes)) {
        return { themes: data.themes };
    }
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}
/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
async function allocateThemes(setA, setB, fast = false) {
    const url = `${baseUrl}/pulse/v1/similarity`;
    const data = await postWithJob(url, { set_a: setA, set_b: setB, fast });
    const result = {};
    if (data.matrix) {
        result.matrix = data.matrix;
    }
    if (data.flattened) {
        result.flattened = data.flattened;
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
    const response = await fetchFn(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
