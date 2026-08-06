/**
 * Date input handling.
 *
 * The API stores publish dates as UTC instants, and the backend interprets a
 * datetime WITHOUT a timezone designator in the server's own clock (UTC in
 * production). Posty's users are Hungarian: when they write "12:00" they mean
 * noon in Budapest, and silently shifting their post by one or two hours is
 * exactly the naive-UTC bug that has bitten this project before.
 *
 * So the CLI resolves timezones before the request leaves the machine:
 *   - An input with an explicit designator (`Z`, `+02:00`, `-0500`) is
 *     respected as written and converted to UTC.
 *   - An input without one (`2026-12-31T12:00`, `2026-12-31 12:00`,
 *     `2026-12-31`) is interpreted in POSTY_TIMEZONE, default Europe/Budapest,
 *     DST included.
 * Either way the API receives an unambiguous UTC ISO 8601 string, and the
 * resolved instant is echoed on stderr so nothing is silent.
 */

const DEFAULT_TIMEZONE = 'Europe/Budapest';

export function cliTimezone(): string {
  return process.env.POSTY_TIMEZONE || DEFAULT_TIMEZONE;
}

const HAS_DESIGNATOR = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})([T ](\d{2}):(\d{2})(:(\d{2}))?)?$/;

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
  /** True when the input carried no timezone and POSTY_TIMEZONE was applied. */
  assumedTimezone: string | null;
}

/**
 * Normalize a user-supplied date to UTC ISO 8601, or throw with a message
 * that says what shapes are accepted.
 */
export function resolveDateInput(input: string): ResolvedDate {
  const value = input.trim();

  if (HAS_DESIGNATOR.test(value)) {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid date "${input}". Use ISO 8601, e.g. "2026-12-31T12:00:00Z" or "2026-12-31T12:00:00+02:00".`
      );
    }
    return { iso: parsed.toISOString(), assumedTimezone: null };
  }

  const m = NAIVE_SHAPE.exec(value);
  if (!m) {
    throw new Error(
      `Invalid date "${input}". Use "YYYY-MM-DD HH:mm" (interpreted in ${cliTimezone()}) or full ISO 8601 with a timezone, e.g. "2026-12-31T12:00:00Z".`
    );
  }

  const timeZone = cliTimezone();
  let instant: Date;
  try {
    instant = zonedToUtc(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
      Number(m[8] ?? 0),
      timeZone
    );
  } catch {
    throw new Error(
      `Unknown timezone "${timeZone}" (from POSTY_TIMEZONE). Use an IANA name like "Europe/Budapest".`
    );
  }

  if (isNaN(instant.getTime())) {
    throw new Error(`Invalid date "${input}".`);
  }

  return { iso: instant.toISOString(), assumedTimezone: timeZone };
}
