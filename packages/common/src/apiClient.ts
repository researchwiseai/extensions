import fetchOriginal from 'cross-fetch';
// Abstracted fetch for cross-platform support (injectable for Apps Script)
type FetchFunction = typeof fetchOriginal;
let fetchFn: FetchFunction = fetchOriginal;
/**
 * Override the fetch implementation used by the API client.
 * Useful for environments like Google Apps Script.
 */
export function configureFetch(fn: FetchFunction): void {
  fetchFn = fn;
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform POST request that may return immediate data or a jobId to poll.
 * If response status is 202, polls the job status until completed, then fetches the result URL.
 */
async function postWithJob(
  url: string,
  body: object,
  intervalMs = 2000
): Promise<any> {
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
  } else if (response.status === 202) {
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
      } else if (status.status === 'completed') {
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
export async function analyzeSentiment(
  inputs: string[],
  fast = false
): Promise<{ results?: SentimentResult[]; jobId?: string }> {
  const url = `${baseUrl}/pulse/v1/sentiment`;
  const data = await postWithJob(url, { fast, inputs });
  if (Array.isArray(data.results)) {
    return { results: data.results };
  }
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

interface GenerateThemesOptions {
  fast?: boolean; 
}

/**
 * Call the theme generation endpoint.
 * Returns final themes, polling a job if necessary.
 */
export async function generateThemes(
  inputs: string[],
  options?: GenerateThemesOptions
): Promise<{ themes?: Theme[]; jobId?: string }> {
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
export async function allocateThemes(
  setA: string[],
  setB: string[],
  fast = false
): Promise<SimilarityResponse & { jobId?: string }> {
  const url = `${baseUrl}/pulse/v1/similarity`;
  const data: any = await postWithJob(url, { set_a: setA, set_b: setB, fast });
  const result: SimilarityResponse = {};
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
export async function pollJobStatus(
  jobId: string
): Promise<JobStatus> {
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