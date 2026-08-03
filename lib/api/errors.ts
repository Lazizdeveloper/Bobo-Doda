export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DELETED"
  | "EXPIRED"
  | "CONFLICT"
  | "VALIDATION"
  | "INVALID_TRANSITION"
  | "PAYMENTS_PAUSED"
  | "RATE_LIMITED"
  | "NETWORK"
  | "STORAGE_FULL"
  | "UNKNOWN";

export interface ApiErrorShape {
  code: ApiErrorCode;
  message: string;
  status: number;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
  cause?: unknown;
}

const LEGACY_CODES: Record<string, Pick<ApiErrorShape, "code" | "status" | "retryable">> = {
  NO_SESSION: { code: "UNAUTHENTICATED", status: 401, retryable: false },
  FORBIDDEN: { code: "FORBIDDEN", status: 403, retryable: false },
  NOT_FOUND: { code: "NOT_FOUND", status: 404, retryable: false },
  BAD_STATE: { code: "INVALID_TRANSITION", status: 409, retryable: false },
  DUPLICATE: { code: "CONFLICT", status: 409, retryable: false },
  DUPLICATE_OFFER: { code: "CONFLICT", status: 409, retryable: false },
  ALREADY_REVIEWED: { code: "CONFLICT", status: 409, retryable: false },
  PAYMENTS_PAUSED: { code: "PAYMENTS_PAUSED", status: 503, retryable: true },
  STORAGE_FULL: { code: "STORAGE_FULL", status: 507, retryable: false },
};

export class ApiError extends Error implements ApiErrorShape {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(input: Omit<ApiErrorShape, "message"> & { message?: string }) {
    super(input.message ?? input.code);
    this.name = "ApiError";
    this.code = input.code;
    this.status = input.status;
    this.fieldErrors = input.fieldErrors;
    this.retryable = input.retryable;
    this.cause = input.cause;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const mapped = LEGACY_CODES[message];
  if (mapped) return new ApiError({ ...mapped, message, cause: error });
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return new ApiError({
      code: "NETWORK",
      message: "OFFLINE",
      status: 0,
      retryable: true,
      cause: error,
    });
  }
  return new ApiError({
    code: "UNKNOWN",
    message,
    status: 500,
    retryable: false,
    cause: error,
  });
}

export async function withNormalizedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeApiError(error);
  }
}
