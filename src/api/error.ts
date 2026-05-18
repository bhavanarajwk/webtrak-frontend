export interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function asReadableObject(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function parseApiErrorMessage(
  payload: unknown,
  fallback: string
): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as ApiErrorPayload;

  if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
  if (typeof body.message === "string" && body.message.trim()) return body.message;

  const objectDetail = asReadableObject(body.detail);
  if (objectDetail) return objectDetail;

  const objectErrors = asReadableObject(body.errors);
  if (objectErrors) return objectErrors;

  return fallback;
}
