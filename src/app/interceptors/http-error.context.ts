import { HttpContext, HttpContextToken } from '@angular/common/http';

export const HTTP_ERROR_MESSAGE = new HttpContextToken<string | null>(() => null);

export function httpErrorContext(message: string): HttpContext {
  return new HttpContext().set(HTTP_ERROR_MESSAGE, message);
}

export const DEFAULT_HTTP_ERROR_MESSAGE = 'Something went wrong';

export function formatHttpErrorMessage(
  customMessage: string | null,
  status: number,
): string {
  const message = customMessage?.trim() || DEFAULT_HTTP_ERROR_MESSAGE;
  return `${message} (${status})`;
}
