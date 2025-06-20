"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.batchSimilarity = batchSimilarity;
exports.compareSimilarity = compareSimilarity;
exports.pollJobStatus = pollJobStatus;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const promise_pool_1 = require("@supercharge/promise-pool");
const input_1 = require("./input");
const Jobs = __importStar(require("./jobs"));
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
    const suffix = options.batchNumber
        ? ` (# ${options.batchNumber} of ${options.batchCount})`
        : '';
    const jobItem = Jobs.createItem({
        title: (options.taskName ?? 'Unknown task') + suffix,
    });
    const token = await getAccessToken();
    const response = await (0, exports.fetchFn)(url, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body,
            fast: false,
            // Add any additional headers or data here
        }),
        mode: 'cors',
    });
    if (response.status === 200) {
        options.onProgress?.(options.taskName
            ? `${options.taskName} complete successfully`
            : 'Request completed successfully');
        return response.json();
    }
    else if (response.status === 202) {
        const startTime = Date.now();
        const elapsedTime = () => Date.now() - startTime;
        const elapsedTimeStr = () => {
            const elapsed = elapsedTime();
            const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
            const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
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
        const jobId = data.jobId;
        if (typeof jobId !== 'string') {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }
        Jobs.updateItem({
            jobId: jobItem.jobId,
            message: 'Polling job status...',
        });
        options.onProgress?.(options.taskName
            ? `${options.taskName} job submitted, polling for completion...`
            : 'Job submitted, polling for completion...');
        let loopCount = 0;
        // Poll until done
        while (true) {
            loopCount++;
            console.log(`Polling job status: ${jobId} (attempt ${loopCount})`);
            if (loopCount % 2 === 0) {
                options.onProgress?.(options.taskName
                    ? `Waiting for ${options.taskName.toLowerCase()} job to complete...`
                    : 'Waiting for job to complete...');
            }
            Jobs.updateItem({
                jobId: jobItem.jobId,
                message: `Polling job status... (${elapsedTimeStr()})`,
            });
            await sleep(intervalMs);
            const status = await pollJobStatus(jobId);
            if (status.status === 'pending') {
                continue;
            }
            else if (status.status === 'completed') {
                if (!status.resultUrl) {
                    Jobs.updateItem({
                        jobId: jobItem.jobId,
                        message: 'Results URL missing',
                        status: 'failed',
                    });
                    throw new Error(`Missing resultUrl in job status: ${JSON.stringify(status)}`);
                }
                const resultResp = await (0, exports.fetchFn)(status.resultUrl, {
                    contentType: 'application/json',
                    method: 'get',
                    headers: { 'Content-Type': 'application/json' },
                });
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
                options.onProgress?.(options.taskName
                    ? `${options.taskName} job completed successfully`
                    : 'Job completed successfully');
                return await resultResp.json();
            }
            else {
                Jobs.updateItem({
                    jobId: jobItem.jobId,
                    message: `Job failed (${status.status})`,
                    status: 'failed',
                });
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
    const data = await postWithJob(url, { fast: options?.fast, ignoreCache: options?.ignoreCache, inputs }, { taskName: 'Sentiment analysis', onProgress: options?.onProgress });
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
    const sampledInputs = (0, input_1.sampleInputs)(inputs, options?.fast ? 200 : 500);
    const url = `${baseUrl}/pulse/v1/themes`;
    const data = await postWithJob(url, {
        inputs: sampledInputs,
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
function shouldBatchSimilarityRequest({ setA, setB, options, }) {
    const { fast } = options ?? {};
    const oversized = setA.length * setB.length > 10000;
    return oversized && !fast;
}
async function batchSimilarity(setA, setB, options) {
    const url = `${baseUrl}/pulse/v1/similarity`;
    const result = { matrix: [] };
    const shorter = setA.length < setB.length ? 'setA' : 'setB';
    const batches = [];
    if (shorter === 'setA') {
        // Split setB into batches
        const maxBatchSize = Math.floor(50000 / setA.length);
        const batchesNeeded = Math.ceil(setB.length / maxBatchSize);
        const batchSize = Math.ceil(setB.length / batchesNeeded);
        const setBBatches = (0, input_1.createBatches)(setB, batchSize);
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
    }
    else {
        // Split setA into batches
        const maxBatchSize = Math.floor(50000 / setB.length);
        const batchesNeeded = Math.ceil(setA.length / maxBatchSize);
        const batchSize = Math.ceil(setA.length / batchesNeeded);
        const setABatches = (0, input_1.createBatches)(setA, batchSize);
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
    const { results, errors } = await promise_pool_1.PromisePool.for(batches)
        .withConcurrency(4)
        .onTaskFinished((_, pool) => {
        options?.onProgress?.(`Processed ${pool.processedPercentage()}% of similarity batches`);
    })
        .useCorrespondingResults()
        .process(async (batch, index) => {
        const data = await postWithJob(url, batch, {
            onProgress: (msg) => {
                options?.onProgress?.(`Batch ${index + 1} of ${batches.length}: ${msg}`);
            },
            taskName: 'Similarity comparison',
            batchNumber: index + 1,
            batchCount: batches.length,
        });
        return data;
    });
    let throwError = false;
    errors.forEach((error) => {
        console.error(error);
        throwError = true;
    });
    if (throwError) {
        console.error(`Batch similarity request failed with ${errors.length} errors.`);
        throw new Error(`Batch similarity request failed with ${errors.length} errors.`);
    }
    debugger;
    for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (typeof res !== 'symbol') {
            result.matrix.push(...res.matrix);
        }
        else {
            console.error(`Batch ${i} failed with error: ${res.description}`);
            throwError = true;
        }
    }
    if (throwError) {
        throw new Error(`Batch similarity request failed with ${errors.length} errors.`);
    }
    return result;
}
/**
 * Call the similarity/allocation endpoint.
 * Returns final similarity results, polling a job if necessary.
 */
async function compareSimilarity(setA, setB, options) {
    if (shouldBatchSimilarityRequest({ setA, setB, options })) {
        return batchSimilarity(setA, setB, options);
    }
    else {
        const url = `${baseUrl}/pulse/v1/similarity`;
        const result = { matrix: [] };
        const data = await postWithJob(url, {
            set_a: setA,
            set_b: setB,
            fast: options?.fast ?? false,
            split: options?.split ?? false,
        }, {
            onProgress: options?.onProgress,
            taskName: 'Similarity comparison',
        });
        if (data.matrix) {
            result.matrix = data.matrix;
        }
        else if (data.flattened) {
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
