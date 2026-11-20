/**
 * The application error contract. See AppError.ts, errorCodes.ts,
 * errorResponse.ts. Import from `@/lib/errors` for the full set.
 */
export { ErrorCodes, type ErrorCode } from './errorCodes';
export {
  AppError,
  isAppError,
  normalizeError,
  toSafeMessage,
  type AppErrorOptions,
} from './AppError';
export {
  errorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  type ErrorResponseBody,
} from './errorResponse';
