import type { ApiErrorBody, ApiErrorCode } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export const isConflictError = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.status === 409;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body ?? { code: 'UNKNOWN', message: `Ошибка запроса (${response.status})` },
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
