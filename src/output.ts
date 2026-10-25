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

  if (error instanceof ApiError && error.isWorkspaceChoice) {
    console.error(
      'This key spans several workspaces and none is selected. Run "posty workspaces:list", then "posty workspaces:use <id>" (or pass --workspace <id>).'
    );
  } else if (error instanceof ApiError && error.missingScope) {
    /*
      A VALID credential without the permission. "Run auth:login" was the
      wrong advice here: the key is fine, logging in again changes nothing.
    */
    const { missing, role } = error.missingScope;
    console.error(
      `This key is valid but lacks the permission ${missing.join(', ') || 'this command needs'}${
        role ? ` (the key owner's role: ${role})` : ''
      }. Create a key that includes it in Posty (Settings, Developers), or ask a workspace owner.`
    );
  } else if (error instanceof ApiError && error.isPlanMissing) {
    console.error(
      'The credential is valid, but this workspace has no plan with API access yet. Run "posty billing:plans", then "posty billing:subscribe --tier <slug> --period <monthly|yearly>".'
    );
  } else if (error instanceof ApiError && error.isForbidden) {
    /*
      A 403 the scope guard did not phrase: the credential is valid, this
      action is not open to it (a scoped key on billing:manage, a colleague
      who is not the payer). The server's message above says why; "your
      credentials were rejected" would send the person to log in for nothing.
    */
    console.error(
      'The credential is valid but not allowed to do this. The message above says why.'
    );
  } else if (error instanceof ApiError && error.isAuthError) {
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
