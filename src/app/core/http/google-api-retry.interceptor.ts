import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

import {
  computeGoogleApiBackoffMs,
  GOOGLE_API_RETRY_MAX,
  isGoogleApisUrl,
  shouldRetryGoogleApiRequest,
} from './google-api-retry.policy';

export {
  computeGoogleApiBackoffMs,
  GOOGLE_API_BACKOFF_CAP_MS,
  GOOGLE_API_RETRY_MAX,
  isGoogleApisUrl,
  shouldRetryGoogleApiRequest,
} from './google-api-retry.policy';

export const googleApiRetryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isGoogleApisUrl(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: GOOGLE_API_RETRY_MAX,
      delay: (error: unknown, retryCount: number) => {
        const status = error instanceof HttpErrorResponse ? error.status : NaN;
        if (!shouldRetryGoogleApiRequest(req.method, status)) {
          return throwError(() => error);
        }

        const retryAfter =
          error instanceof HttpErrorResponse ? error.headers?.get('Retry-After') : null;
        const delayMs = computeGoogleApiBackoffMs(retryCount - 1, retryAfter);
        return timer(delayMs);
      }
    })
  )
};
