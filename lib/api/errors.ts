/**
 * @deprecated The error contract lives in `@/lib/errors`. This module is a
 * thin compatibility shim kept so existing imports keep working.
 */
export {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  errorResponse,
  type ErrorResponseBody,
} from '@/lib/errors';

export interface ErrorBody {
  error: string;
  code?: string;
}

/** Legacy generic builder kept for existing callers. */
export function jsonError(_status: number, message: string, code?: string) {
  // Delegates to the new contract; status is preserved for API compatibility.
  const response = Response.json({ error: message, ...(code ? { code } : {}) }, { status: _status });
  return response;
}
