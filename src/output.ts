import { ApiError } from './api';

/**
 * Output contract, kept strict because the primary consumers are scripts and
 * AI agents piping into `jq`:
 *
 *   stdout — the JSON result of the command, and NOTHING else.
 *   stderr — human-readable status, warnings and errors.
 *
 * Every failure exits 1.
 */

/** The command's result. The only thing that ever goes to stdout. */
export function result(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Human-readable progress/status — stderr, so stdout stays parseable. */
export function status(message: string): void {
  console.error(message);
}

/** Print a failure (with an auth hint when it is one) and exit 1. */
export function fail(context: string, error: any): never {
  console.error(`❌ ${context}: ${error?.message || error}`);

  if (error instanceof ApiError && error.isAuthError) {
    console.error(
      'Your credentials were rejected. Run "posty auth:login" to re-authenticate, or check POSTY_API_KEY.'
    );
  }
  if (error instanceof ApiError && error.isRateLimit) {
    console.error(
      'Rate limit hit (per key, per route, per hour). Back off — do not retry in a loop.'
    );
  }

  process.exit(1);
}
