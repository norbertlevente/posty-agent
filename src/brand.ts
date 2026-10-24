/**
 * Posty and Postemi: one CLI source, two builds.
 *
 * Posty (posty.hu, npm `posty-cli`, command `posty`) is Hungary; Postemi
 * (postemi.com, npm `postemi`, command `postemi`) is everywhere else. Both
 * talk to the same backend and the same accounts. What differs is the name a
 * person reads, the command they type, the environment variables, the config
 * folder, the default API host and the links.
 *
 * The brand is fixed at BUILD time: tsup replaces `__CLI_BRAND__` with a
 * string literal (`CLI_BRAND=postemi pnpm build:postemi`, see tsup.config.ts).
 * A plain `pnpm build` is Posty, and every Posty value below is character for
 * character what the code said before this file existed, so `posty-cli`
 * cannot change by accident.
 */

declare const __CLI_BRAND__: string;

export type BrandId = 'posty' | 'postemi';

export const BRAND_ID: BrandId =
  typeof __CLI_BRAND__ !== 'undefined' && __CLI_BRAND__ === 'postemi' ? 'postemi' : 'posty';

export const IS_POSTEMI = BRAND_ID === 'postemi';

interface Brand {
  /** The product name in a sentence. */
  name: string;
  /** The command a person types. */
  cli: string;
  /** Prefix of the environment variables (`POSTY_API_KEY`). */
  envPrefix: string;
  /** Folder under the home directory for credentials.json and config.json. */
  configDirName: string;
  /** API base when nothing else says otherwise. */
  defaultApiUrl: string;
  /** Where `auth:login` starts the device flow. */
  defaultAuthServer: string;
  /** Shown on the approval page. */
  clientName: string;
  homepage: string;
  termsUrl: string;
  privacyUrl: string;
  /** Where a person creates an account in the browser. */
  signupUrl: string;
  /** The IANA zone used in examples. */
  exampleTimezone: string;
  /** "in Budapest time" in the config:set example. */
  exampleTimezoneCity: string;
  /** The plan slugs as the help text names them. */
  tierList: string;
  /** The plan without API access, by name. */
  basicPlanName: string;
}

const POSTY: Brand = {
  name: 'Posty',
  cli: 'posty',
  envPrefix: 'POSTY',
  configDirName: '.posty',
  defaultApiUrl: 'https://posty.hu/api',
  defaultAuthServer: 'https://posty.hu/api',
  clientName: 'Posty CLI',
  homepage: 'https://posty.hu',
  termsUrl: 'https://posty.hu/aszf',
  privacyUrl: 'https://posty.hu/adatvedelem',
  signupUrl: 'https://posty.hu/regisztracio',
  exampleTimezone: 'Europe/Budapest',
  exampleTimezoneCity: 'Budapest',
  tierList: 'alap, pro, kreator or csapat',
  basicPlanName: 'Alap',
};

const POSTEMI: Brand = {
  name: 'Postemi',
  cli: 'postemi',
  envPrefix: 'POSTEMI',
  configDirName: '.postemi',
  // api.postemi.com serves the API at the root (its proxy adds /api), the
  // same way api.posty.hu does.
  defaultApiUrl: 'https://api.postemi.com',
  defaultAuthServer: 'https://api.postemi.com',
  clientName: 'Postemi CLI',
  homepage: 'https://postemi.com',
  termsUrl: 'https://postemi.com/terms',
  privacyUrl: 'https://postemi.com/privacy',
  signupUrl: 'https://postemi.com/app/signup',
  exampleTimezone: 'Europe/London',
  exampleTimezoneCity: 'London',
  tierList: 'basic, pro, creator or team',
  basicPlanName: 'Basic',
};

export const BRAND: Brand = IS_POSTEMI ? POSTEMI : POSTY;

/** `API_KEY` -> `POSTY_API_KEY` or `POSTEMI_API_KEY`. */
export const envName = (name: string): string => `${BRAND.envPrefix}_${name}`;

/**
 * Read a setting from the environment. Posty reads `POSTY_<name>` only.
 * Postemi reads `POSTEMI_<name>` and falls back to `POSTY_<name>`, so a
 * machine set up for either CLI keeps working.
 */
export function readEnv(name: string): string | undefined {
  const own = process.env[envName(name)];
  if (own || !IS_POSTEMI) return own;
  return process.env[`POSTY_${name}`];
}

/** The name of the variable `readEnv(name)` took its value from (for messages). */
export function envSourceName(name: string): string {
  if (IS_POSTEMI && !process.env[envName(name)] && process.env[`POSTY_${name}`]) {
    return `POSTY_${name}`;
  }
  return envName(name);
}

/** Write the brand's own variable (the `--workspace` middleware uses it). */
export function writeEnv(name: string, value: string): void {
  process.env[envName(name)] = value;
}

/*
  PLAN NAMES. The backend publishes Posty's slugs (alap, pro, kreator,
  csapat) and accepts `creator` too. Postemi shows the English names (Basic,
  Pro, Creator, Team), so the Postemi build turns the two names the backend
  does not know into its slugs. The enum names are crossed (TEAM is "Pro"),
  which is why only display names are mapped, never enum names.
*/
const POSTEMI_TIER_ALIASES: Record<string, string> = {
  basic: 'alap',
  team: 'csapat',
};

export function tierForApi(tier: string): string {
  if (!IS_POSTEMI) return tier;
  return POSTEMI_TIER_ALIASES[tier.trim().toLowerCase()] ?? tier;
}

/*
  A failed fetch() says only "fetch failed"; the reason is in `error.cause`.
  The Postemi build names it (a host that does not resolve, a refused
  connection, a timeout). Posty keeps its message exactly as it was.
*/
const NETWORK_REASONS: Record<string, string> = {
  ENOTFOUND: 'the host name does not resolve',
  EAI_AGAIN: 'the host name could not be looked up',
  ECONNREFUSED: 'the connection was refused',
  ECONNRESET: 'the connection was reset',
  ETIMEDOUT: 'the connection timed out',
  UND_ERR_CONNECT_TIMEOUT: 'the connection timed out',
  CERT_HAS_EXPIRED: 'the TLS certificate has expired',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'the TLS certificate is self-signed',
};

export function networkError(prefix: string, error: any, variable = 'API_URL'): string {
  const plain = `${prefix}: ${error?.message}`;
  if (!IS_POSTEMI) return plain;
  const code: string | undefined = error?.cause?.code ?? error?.code;
  const reason = code ? NETWORK_REASONS[code] ?? code : null;
  return reason
    ? `${prefix}: ${reason} (${code}). Check the connection, or point ${envName(variable)} at another server.`
    : plain;
}
