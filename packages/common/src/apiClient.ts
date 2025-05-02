import fetch from 'cross-fetch';

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
 * Returns either immediate results or a jobId for polling.
 */
export async function analyzeSentiment(
  inputs: string[],
  fast = false
): Promise<{ results?: SentimentResult[]; jobId?: string }> {
  if (!baseUrl || !getAccessToken) {
    throw new Error('API client not configured. Call configureClient first.');
  }
  const token = await getAccessToken();
  const url = `${baseUrl}/pulse/v1/sentiment`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fast, inputs }),
  });

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data.results)) {
      return { results: data.results };
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } else if (response.status === 202) {
    const data = await response.json();
    if (typeof data.jobId === 'string') {
      return { jobId: data.jobId };
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } else {
    const errorText = await response.text();
    throw new Error(`${response.statusText}: ${errorText}`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Endpoint not found: ' + url);
    }

    throw new Error(`${response.statusText}: ${await response.text()}`);
  }
  const data = await response.json();
  if (Array.isArray(data.results)) {
    return { results: data.results };
  } else if (typeof data.jobId === 'string') {
    return { jobId: data.jobId };
  }
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}

interface GenerateThemesOptions {
  fast?: boolean; 
}

/**
 * Call the theme generation endpoint.
 * Returns either immediate themes or a jobId for polling.
 */
export async function generateThemes(
  inputs: string[], options?: GenerateThemesOptions): Promise<{ themes?: Theme[]; jobId?: string }> {
  if (!baseUrl || !getAccessToken) {
    throw new Error('API client not configured. Call configureClient first.');
  }
  const token = await getAccessToken();
  const url = `${baseUrl}/pulse/v1/themes`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inputs, fast: options?.fast ?? false }),
  });

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data.themes)) {
      return { themes: data.themes };
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } else if (response.status === 202) {
    const data = await response.json();
    if (typeof data.jobId === 'string') {
      return { jobId: data.jobId };
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } else {
    const errorText = await response.text();
    throw new Error(`${response.statusText}: ${errorText}`);
  }
}

/**
 * Call the similarity/allocation endpoint.
 * Returns immediate matrix/flattened or a jobId for polling.
 */
export async function allocateThemes(
  setA: string[],
  setB: string[],
  fast = false
): Promise<SimilarityResponse & { jobId?: string }> {
  if (!baseUrl || !getAccessToken) {
    throw new Error('API client not configured. Call configureClient first.');
  }
  const token = await getAccessToken();
  const url = `${baseUrl}/pulse/v1/similarity`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ set_a: setA, set_b: setB, fast }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: any = await response.json();
  const result: SimilarityResponse & { jobId?: string } = {};
  if (data.matrix) {
    result.matrix = data.matrix;
  }
  if (data.flattened) {
    result.flattened = data.flattened;
  }
  if (data.jobId) {
    result.jobId = data.jobId;
  }
  if (result.matrix || result.flattened || result.jobId) {
    return result;
  }
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
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
  const response = await fetch(url, {
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