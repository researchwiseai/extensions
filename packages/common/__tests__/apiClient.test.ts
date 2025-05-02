import fetch from 'cross-fetch';
import {
  configureClient,
  analyzeSentiment,
  generateThemes,
  allocateThemes,
  pollJobStatus,
  SentimentResult,
  Theme,
  SimilarityResponse,
  JobStatus,
} from '../src/apiClient';

jest.mock('cross-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('apiClient', () => {
  beforeEach(() => {
    configureClient({
      baseUrl: 'https://api.example.com/pulse/v1',
      getAccessToken: async () => 'token123',
    });
    mockedFetch.mockReset();
  });

  it('analyzeSentiment returns results when data.results is present', async () => {
    const sampleResults: SentimentResult[] = [{ sentiment: 0.5 }, { sentiment: -0.2 }];
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: sampleResults }),
    } as any);
    const res = await analyzeSentiment(['a', 'b'], true);
    expect(res.results).toEqual(sampleResults);
    expect(res.jobId).toBeUndefined();
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example.com/pulse/v1/sentiment?fast=true',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ inputs: ['a', 'b'] }),
      }),
    );
  });

  it('analyzeSentiment returns jobId when data.jobId is present', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'job-123' }),
    } as any);
    const res = await analyzeSentiment(['x'], false);
    expect(res.jobId).toBe('job-123');
    expect(res.results).toBeUndefined();
  });

  it('generateThemes returns themes array or jobId', async () => {
    const sampleThemes: Theme[] = [{ label: 'Theme1', representatives: ['a'] }];
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ themes: sampleThemes }),
    } as any);
    const res = await generateThemes(['text1']);
    expect(res.themes).toEqual(sampleThemes);
    expect(res.jobId).toBeUndefined();

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'job-456' }),
    } as any);
    const res2 = await generateThemes(['text2']);
    expect(res2.jobId).toBe('job-456');
    expect(res2.themes).toBeUndefined();
  });

  it('allocateThemes returns matrix, flattened or jobId', async () => {
    const matrix = [[1, 0], [0, 1]];
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ matrix }),
    } as any);
    let res = await allocateThemes(['a', 'b'], ['c', 'd'], true);
    expect(res.matrix).toEqual(matrix);
    expect(res.flattened).toBeUndefined();
    expect(res.jobId).toBeUndefined();

    const flat = [1, 0, 0, 1];
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ flattened: flat }),
    } as any);
    res = await allocateThemes(['a'], ['b'], false);
    expect(res.flattened).toEqual(flat);

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'job-sim' }),
    } as any);
    const res3 = await allocateThemes(['x'], ['y'], false);
    expect(res3.jobId).toBe('job-sim');
  });

  it('pollJobStatus returns job data', async () => {
    const jobData: JobStatus = { status: 'completed', resultUrl: 'http://example.com/result' };
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => jobData,
    } as any);
    const res = await pollJobStatus('job-abc');
    expect(res).toEqual(jobData);
  });
});