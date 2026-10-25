import { PostyConfig } from './api';
import { loadCredentials } from './commands/auth';
import { getSetting } from './settings';

/**
 * Which workspace requests are about, in order of precedence: `--workspace`
 * on the command (the yargs middleware copies it into POSTY_WORKSPACE), the
 * environment, the choice saved by `posty workspaces:use` (in credentials.json
 * for a device login, in config.json for an env key). Undefined is fine for a
 * one-workspace key; the API refuses to guess for a key that spans several.
 */
export function getWorkspaceId(): string | undefined {
  const fromEnv = process.env.POSTY_WORKSPACE;
  if (fromEnv) return fromEnv;
  const creds = loadCredentials();
  if (creds?.organizationId) return creds.organizationId;
  return getSetting('workspace');
}

export function getConfig(): PostyConfig {
  const workspaceId = getWorkspaceId();

  // Check for stored OAuth credentials first
  const creds = loadCredentials();
  if (creds) {
    return {
      apiKey: creds.accessToken,
      apiUrl: creds.apiUrl,
      workspaceId,
    };
  }

  // Fall back to environment variable
  const apiKey = process.env.POSTY_API_KEY;
  const apiUrl = process.env.POSTY_API_URL;

  if (!apiKey) {
    console.error('❌ Error: No authentication found.');
    console.error('Options:');
    console.error('  1. Device login: posty auth:login');
    console.error('  2. API Key: export POSTY_API_KEY=your_api_key');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl,
    workspaceId,
  };
}
