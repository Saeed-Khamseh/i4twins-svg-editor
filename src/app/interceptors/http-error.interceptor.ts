import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

import {
  formatHttpErrorMessage,
  HTTP_ERROR_MESSAGE,
} from './http-error.context';

const SNACKBAR_DURATION_MS = 5000;

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const customMessage = req.context.get(HTTP_ERROR_MESSAGE);
        const message = formatHttpErrorMessage(customMessage, error.status);
        const panelClass = resolvePanelClass(error.status);

        snackBar.open(message, undefined, {
          duration: SNACKBAR_DURATION_MS,
          panelClass,
        });
      }

      return throwError(() => error);
    }),
  );
};

function resolvePanelClass(status: number): string[] {
  if (status >= 400 && status < 500) {
    return ['http-error-client'];
  }

  if (status === 0 || status >= 500) {
    return ['http-error-server'];
  }

  return ['http-error-server'];
}
