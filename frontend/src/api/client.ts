import axios from 'axios';
import type { ApiError } from '../types/project';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

export function toApiError(err: unknown): ApiError {
  const now = () => new Date().toISOString();
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as Partial<ApiError> | undefined;
    if (body && typeof body === 'object' && typeof body.message === 'string') {
      return {
        timestamp: typeof body.timestamp === 'string' ? body.timestamp : now(),
        status: typeof body.status === 'number' ? body.status : (err.response?.status ?? 0),
        error: typeof body.error === 'string' ? body.error : 'UNKNOWN',
        message: body.message,
        fieldErrors:
          body.fieldErrors && typeof body.fieldErrors === 'object' ? body.fieldErrors : undefined,
      };
    }
    return {
      timestamp: now(),
      status: err.response?.status ?? 0,
      error: err.response ? 'UNKNOWN' : 'NETWORK_ERROR',
      message: err.response ? 'Unexpected response from server' : 'Could not reach the server',
    };
  }
  return {
    timestamp: now(),
    status: 0,
    error: 'UNKNOWN',
    message: err instanceof Error ? err.message : 'An unexpected error occurred',
  };
}

export default client;
