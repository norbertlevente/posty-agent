import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { getSetting, saveSetting } from '../settings';
import { assertIanaTimezone } from '../dates';

const CREDENTIALS_DIR = join(homedir(), '.posty');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

/**
 * Where the device flow lives.
 *
 * It used to be `https://cli-auth.posty.hu`, a SEPARATE service (its own
 * Postgres, its own OAuth app) that was never deployed — the hostname is
 * NXDOMAIN, so `posty auth:login` could not work at all. The flow is now
 * implemented inside Posty's own backend, which is what this points at:
 * `POST /device/code`, `POST /device/token`, and an approval page on the web
 * app where the human picks which workspace and channels the key may reach.
 *
 * Same wire contract as before, so nothing else in this file changed.
 *
 * `api.posty.hu` is live now (it answers 401 on `/public/v1/*`, which is the
 * route existing and being guarded). The same API is also served under `/api`
 * on the main host, which is what this default uses because it is the base the
 * device flow itself is reached on. Override with `POSTY_AUTH_SERVER` if that
 * ever moves — and note the server tells the CLI its own API base in the token
 * response (`api_url`), so a migration needs no CLI release.
 */
const DEFAULT_AUTH_SERVER = 'https://posty.hu/api';

/** Fallback only. The token response carries the real one. */
const DEFAULT_API_URL = 'https://posty.hu/api';

interface StoredCredentials {
  accessToken: string;
  apiUrl: string;
  organizationId?: string;
}

export function loadCredentials(): StoredCredentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return null;
    const data = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
    if (!data.accessToken) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCredentials(credentials: StoredCredentials): void {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { encoding: 'utf-8', mode: 0o600 });
  // Ensure permissions even if file already existed
  chmodSync(CREDENTIALS_FILE, 0o600);
}

function deleteCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

function openBrowser(url: string): void {
  const { exec } = require('child_process');
  const platform = process.platform;

  if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

/**
 * One-time scheduling-timezone setup, run after a successful login.
 *
 * Dates written without an explicit offset are refused unless a timezone is
 * configured (see dates.ts), so a fresh login on a TTY is the moment to set
 * one: detect the machine's zone, ask the human to confirm it, save it to
 * `~/.posty/config.json`. Skipped when a timezone is already saved, and
 * skipped entirely off-TTY — scripts and agents must use `--timezone`,
 * `POSTY_TIMEZONE` or `posty config:set timezone`.
 */
async function maybeConfigureTimezone(): Promise<void> {
  if (getSetting('timezone')) return;
  if (!process.stdin.isTTY || !process.stderr.isTTY) return;

  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const answer = (await ask(`\nScheduling timezone: ${detected} — OK? [Y/n] `))
    .trim()
    .toLowerCase();

  let timezone = detected;
  if (answer === 'n' || answer === 'no') {
    const typed = (
      await ask('Enter an IANA timezone name (e.g. Europe/Budapest), or leave empty to skip: ')
    ).trim();
    if (!typed) {
      console.error(
        'Skipped. Dates without an explicit offset will be refused until you run: posty config:set timezone <IANA name>'
      );
      return;
    }
    try {
      timezone = assertIanaTimezone(typed, 'auth:login');
    } catch (error: any) {
      console.error(`${error.message}`);
      console.error(
        'Skipped. Set it later with: posty config:set timezone <IANA name>'
      );
      return;
    }
  } else if (answer && answer !== 'y' && answer !== 'yes') {
    console.error(
      'Skipped. Set it later with: posty config:set timezone <IANA name>'
    );
    return;
  }

  saveSetting('timezone', timezone);
  console.error(
    `✅ Scheduling timezone saved: ${timezone} (change it with "posty config:set timezone <IANA name>")`
  );
}

export async function authLogin(argv: any) {
  const authServer = argv.authServer || process.env.POSTY_AUTH_SERVER || DEFAULT_AUTH_SERVER;

  console.log('🔐 Starting device authorization flow...\n');

  // Step 1: Request a device code from the auth server
  let deviceCode: string;
  let userCode: string;
  let verificationUri: string;
  let expiresIn: number;
  let interval: number;

  try {
    const response = await fetch(`${authServer}/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Shown on the approval page, so somebody can tell the login they just
      // started from one they did not.
      body: JSON.stringify({
        client_name: process.env.POSTY_CLIENT_NAME || 'Posty CLI',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to start authorization (${response.status}): ${error}`);
      process.exit(1);
    }

    const data = (await response.json()) as any;
    deviceCode = data.device_code;
    userCode = data.user_code;
    verificationUri = data.verification_uri;
    expiresIn = data.expires_in;
    interval = data.interval || 5;
  } catch (error: any) {
    console.error(`❌ Could not reach auth server at ${authServer}: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Show the user code and open browser
  console.log('  Your authorization code:\n');
  console.log(`    ┌─────────────────┐`);
  console.log(`    │    ${userCode}    │`);
  console.log(`    └─────────────────┘\n`);
  console.log(`  Open this URL and enter the code above:`);
  console.log(`  ${verificationUri}\n`);

  openBrowser(`${verificationUri}?code=${encodeURIComponent(userCode)}`);

  console.log('  Waiting for authorization...\n');

  // Step 3: Poll for the token
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    await sleep(interval * 1000);

    try {
      const response = await fetch(`${authServer}/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCode }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.access_token) {
        saveCredentials({
          accessToken: data.access_token,
          apiUrl: data.api_url || DEFAULT_API_URL,
          organizationId: data.organization_id,
        });

        console.log('✅ Successfully authenticated!');
        console.log(`📁 Credentials saved to ${CREDENTIALS_FILE}`);
        if (data.organization_id) {
          console.log(`🏢 Organization ID: ${data.organization_id}`);
        }
        await maybeConfigureTimezone();
        return;
      }

      if (data.error === 'authorization_pending') {
        continue;
      }

      if (data.error === 'expired_token') {
        console.error('❌ Authorization expired. Please try again.');
        process.exit(1);
      }

      // Unknown error
      console.error(`❌ Authorization failed: ${data.error}`);
      process.exit(1);
    } catch {
      // Network error during poll — keep trying
      continue;
    }
  }

  console.error('❌ Authorization timed out. Please try again.');
  process.exit(1);
}

export async function authLogout() {
  const creds = loadCredentials();
  if (!creds) {
    console.log('ℹ️  No stored credentials found.');
    return;
  }

  deleteCredentials();
  console.log('✅ Credentials removed.');
}

export async function authStatus() {
  const envKey = process.env.POSTY_API_KEY;
  const creds = loadCredentials();

  let apiKey: string | undefined;
  let apiUrl: string;

  if (creds) {
    console.log('🔐 Authentication method: OAuth2');
    console.log(`📡 API URL: ${creds.apiUrl}`);
    console.log(`🔑 Token: ${creds.accessToken.substring(0, 8)}...`);
    if (creds.organizationId) {
      console.log(`🏢 Organization: ${creds.organizationId}`);
    }
    console.log(`📁 Credentials file: ${CREDENTIALS_FILE}`);
    apiKey = creds.accessToken;
    apiUrl = creds.apiUrl;
  } else if (envKey) {
    console.log('🔑 Authentication method: API Key (environment variable)');
    console.log(`🔑 Key: ${envKey.substring(0, 8)}...`);
    apiKey = envKey;
    apiUrl = process.env.POSTY_API_URL || DEFAULT_API_URL;
  } else {
    console.log('❌ Not authenticated.');
    console.log('\nOptions:');
    console.log('  1. OAuth2: posty auth:login');
    console.log('  2. API Key: export POSTY_API_KEY=your_api_key');
    return;
  }

  // Verify credentials by calling the integrations endpoint
  console.log('\n🔄 Verifying credentials...');
  try {
    const response = await fetch(`${apiUrl}/public/v1/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
    });

    if (response.ok) {
      const integrations = (await response.json()) as any[];
      console.log(`✅ Credentials are valid. ${integrations.length} integration(s) connected.`);
    } else if (response.status === 401 || response.status === 403) {
      console.log('❌ Credentials are expired or invalid. Please re-authenticate.');
      if (creds) {
        console.log('   Run: posty auth:login');
      } else {
        console.log('   Update your POSTY_API_KEY environment variable.');
      }
    } else {
      const error = await response.text();
      console.log(`⚠️  Could not verify credentials (HTTP ${response.status}): ${error}`);
    }
  } catch (error: any) {
    console.log(`⚠️  Could not reach API to verify credentials: ${error.message}`);
  }
}
