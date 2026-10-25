/**
 * Date input handling.
 *
 * The API stores publish dates as UTC instants, and the backend interprets a
 * datetime WITHOUT a timezone designator in the server's own clock (UTC in
 * production) — which silently shifts a Hungarian "12:00" by one or two hours.
 *
 * The CLI therefore refuses to guess. A date is either explicit or explicitly
 * configured, resolved in this priority order:
 *
 *   (a) an explicit designator in the string itself (`Z`, `+01:00`) — used
 *       as written;
 *   (b) `--timezone <IANA name>` on the command;
 *   (c) the `POSTY_TIMEZONE` environment variable;
 *   (d) the `timezone` saved in `~/.posty/config.json`
 *       (`posty config:set timezone <IANA>`, or confirmed during
 *       `posty auth:login` on a TTY);
 *   (e) none of the above and the date is naive → hard error.
 *
 * Timezones must be IANA names (`Europe/Budapest`). Numeric offsets are
 * REJECTED as timezone values on purpose: an offset hand-picked by a human or
 * an LLM is exactly the DST mistake this design exists to prevent. Offsets
 * belong inside the date string, where they are explicit per-instant.
 *
 * Whenever a timezone is applied (b–d), the resolved UTC instant is echoed on
 * stderr so nothing is silent.
 */

import { getSetting } from './settings';

export type TimezoneSource =
  | '--timezone'
  | 'POSTY_TIMEZONE'
  | 'config (posty config:set timezone)';

export interface ResolvedTimezone {
  name: string;
  source: TimezoneSource;
}

const HAS_DESIGNATOR = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})([T ](\d{2}):(\d{2})(:(\d{2}))?)?$/;

/** Offset-shaped "timezones" we refuse: +02:00, -0500, UTC+2, GMT-5, Etc/GMT+2 … */
const OFFSET_SHAPED = /^(Etc\/)?(UTC|GMT)?\s*[+-]?\d/i;

/**
 * Validate an IANA timezone name. Throws with a corrective message on
 * anything else — including numeric offsets, which are valid concepts but
 * banned as timezone VALUES (see module comment).
 */
export function assertIanaTimezone(name: string, origin: string): string {
  const value = name.trim();

  if (!value || OFFSET_SHAPED.test(value)) {
    throw new Error(
      `Invalid timezone "${name}" (from ${origin}): numeric offsets are not accepted as timezones — DST would be your problem to compute. ` +
        `Use an IANA name like "Europe/Budapest" (or put the offset inside the date string itself, e.g. "2026-12-31T12:00:00+01:00").`
    );
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    throw new Error(
      `Unknown timezone "${name}" (from ${origin}). Use an IANA name like "Europe/Budapest" or "UTC".`
    );
  }

  return value;
}

/**
 * Walk the ladder (b) → (d). Returns null when nothing is configured — the
 * caller then errors only if it actually meets a naive date. An invalid value
 * at any rung is an error, not a fall-through: silently skipping a typoed
 * POSTY_TIMEZONE would reintroduce the guessing this design removes.
 */
export function resolveTimezone(flagValue?: string): ResolvedTimezone | null {
  if (flagValue !== undefined) {
    return {
      name: assertIanaTimezone(flagValue, '--timezone'),
      source: '--timezone',
    };
  }

  const env = process.env.POSTY_TIMEZONE;
  if (env) {
    return {
      name: assertIanaTimezone(env, 'POSTY_TIMEZONE'),
      source: 'POSTY_TIMEZONE',
    };
  }

  const stored = getSetting('timezone');
  if (stored) {
    return {
      name: assertIanaTimezone(stored, '~/.posty/config.json'),
      source: 'config (posty config:set timezone)',
    };
  }

  return null;
}

/** Offset of `timeZone` from UTC at the given instant, in minutes. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );

  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Interpret naive wall-clock components in `timeZone`; return the instant. */
function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string
): Date {
  // First guess: treat the wall clock as UTC, then correct by the zone's
  // offset at that instant. One refinement pass handles DST boundaries.
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let offset = tzOffsetMinutes(new Date(guess), timeZone);
  let instant = guess - offset * 60000;
  const refined = tzOffsetMinutes(new Date(instant), timeZone);
  if (refined !== offset) {
    instant = guess - refined * 60000;
  }
  return new Date(instant);
}

export interface ResolvedDate {
  /** UTC ISO 8601, always with `Z` — what goes on the wire. */
  iso: string;
  /** Set when the input carried no designator and a timezone was applied. */
  appliedTimezone: ResolvedTimezone | null;
}

function naiveDateError(input: string, flagName: string): Error {
  return new Error(
    `Date "${input}" has no timezone, and no timezone is configured. ` +
      `The server would read it as UTC, silently shifting your post. Fix one of:\n` +
      `  1. Explicit offset in the date:  ${flagName} "2026-12-31T12:00:00+01:00"  (or ...T12:00:00Z for UTC)\n` +
      `  2. Timezone flag:                --timezone Europe/Budapest\n` +
      `  3. Environment variable:         export POSTY_TIMEZONE=Europe/Budapest\n` +
      `  4. Save it once:                 posty config:set timezone Europe/Budapest`
  );
}

/**
 * Normalize a user-supplied date to UTC ISO 8601, or throw with a message
 * that says exactly how to fix it. `timezone` comes from `resolveTimezone`.
 */
export function resolveDateInput(
  input: string,
  timezone: ResolvedTimezone | null,
  flagName = '--date'
): ResolvedDate {
  const value = input.trim();

  if (HAS_DESIGNATOR.test(value)) {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid date "${input}". Use ISO 8601, e.g. "2026-12-31T12:00:00Z" or "2026-12-31T12:00:00+01:00".`
      );
    }
    return { iso: parsed.toISOString(), appliedTimezone: null };
  }

  const m = NAIVE_SHAPE.exec(value);
  if (!m) {
    throw new Error(
      `Invalid date "${input}". Use ISO 8601 with an explicit offset ("2026-12-31T12:00:00Z"), or "YYYY-MM-DD HH:mm" together with a timezone (--timezone Europe/Budapest).`
    );
  }

  if (!timezone) {
    throw naiveDateError(input, flagName);
  }

  const instant = zonedToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0),
    Number(m[8] ?? 0),
    timezone.name
  );

  if (isNaN(instant.getTime())) {
    throw new Error(`Invalid date "${input}".`);
  }

  return { iso: instant.toISOString(), appliedTimezone: timezone };
}
