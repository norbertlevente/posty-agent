# Changelog

All notable changes to the Posty CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Explicit timezones, no guessing.** The backend reads a
  `--date`/`--startDate`/`--endDate` value without a timezone designator in
  the server's clock (UTC), silently shifting a Hungarian "12:00" by one or
  two hours. The CLI now refuses that ambiguity instead of assuming a zone
  (an earlier draft defaulted to Europe/Budapest; the owner rejected any
  silent assumption). A date is resolved in priority order: an explicit
  offset in the string (`Z`, `+01:00`) → the new `--timezone <IANA name>`
  flag on `posts:create`/`posts:list` → `POSTY_TIMEZONE` → the `timezone`
  saved in `~/.posty/config.json` → otherwise a naive date is a **hard
  error** whose message names all four remedies. Conversion is DST-aware and
  the resolved UTC instant is echoed on stderr whenever a timezone is
  applied. Numeric offsets (`+02:00`, `UTC+2`, `Etc/GMT+2`) are rejected as
  timezone *values* — LLMs and humans must not hand-compute DST; offsets
  belong inside the date string. An invalid timezone at any rung is an
  error, not a fall-through.
- `posty config:set timezone <IANA>` / `posty config:get [key]` — persistent
  CLI settings in `~/.posty/config.json` (kept separate from
  `credentials.json`; survives `auth:logout`). On a TTY, `posty auth:login`
  now detects the machine's timezone after a successful login and asks the
  user to confirm saving it; off-TTY it never prompts.
- `posts:create --type now` publishes immediately; `--date` becomes optional.
- `posts:find-slot <integration-id>` — the next free publishing slot for a
  channel (`GET /public/v1/find-slot/:id`), usable directly as a
  `posts:create --date`.

### Changed
- **Strict output contract.** Results are JSON on stdout and nothing else;
  status lines ("✅ Post created…", "📋 Posts:") moved to stderr. The
  documented `posty upload … | jq -r '.path'` pattern previously failed
  because the decorative header made stdout invalid JSON.
- Unknown flags and commands are now an error (yargs `.strict()`) instead of
  being silently ignored — a typoed `--comments` used to post with the
  comments missing and no warning.
- Auth failures (401/403) now tell the user to run `posty auth:login` or check
  `POSTY_API_KEY`; 429 answers explain the per-key/per-route/per-hour bucket.
- `analytics:*` look-back flag is `--days` (the old `-d`/`--date` spellings
  still work); the value is validated as a positive whole number.
- Dropped the `node-fetch` dependency in favour of Node's built-in fetch —
  the ESM-only `node-fetch@3` could not be `require`d from the CJS build on
  Node 18/20 — and removed the stray `@types/pg` runtime dependency left over
  from the deleted auth server.
- The stale `--client-id`/`--client-secret` mention in the "no authentication
  found" error is gone; those flags never existed.

### Removed
- `server/` — the standalone device-flow auth server that was never deployed
  and had been superseded by the flow inside Posty's backend.
- The working-note markdown files (`SUMMARY.md`, `SYNTAX_UPGRADE.md`,
  `FEATURES.md`, `QUICK_START.md`, `PROJECT_STRUCTURE.md`,
  `PROVIDER_SETTINGS_SUMMARY.md`, `INTEGRATION_SETTINGS_DISCOVERY.md`,
  `INTEGRATION_TOOLS_WORKFLOW.md`). What they said that mattered lives in
  `SKILL.md`, `HOW_TO_RUN.md`, `PROVIDER_SETTINGS.md` and
  `SUPPORTED_FILE_TYPES.md`.
- The `agent-media` recommendation from `--help` — its removal from the docs
  was already recorded below, but it had survived in the epilogue.

### Fixed
- `SKILL.md`: the multi-platform JSON example used a made-up
  `{"integrations": …, "provider": …}` shape the API rejects; it now shows the
  real request body. A thread example passed `-d 2000` (2000 **minutes** — the
  delay unit is minutes, not milliseconds). The rate-limit table and the
  "what Posty does not do" section still described the deleted AI-video
  routes.

## Earlier unreleased work

### Changed
- **The npm package is now `posty-cli`.** It was `posty`, which on npmjs.com is
  an unrelated UK-postcode library by another author — so `npm install -g posty`
  installed that package, successfully and silently, and publishing under that
  name could never have succeeded. `posty-cli` was confirmed available.
  **The command is still `posty`**: it comes from `bin`, not from `name`, and
  the command name was never the source of the conflict. Nothing a user types
  changes.
- **Documentation now describes Posty, not upstream Postiz.** Every markdown
  file claimed "28+ channels" including Reddit, Mastodon, Discord, Slack,
  Telegram, Kick, Twitch, Lemmy, Farcaster, Nostr, VK, Medium, Dev.to,
  Hashnode, WordPress and ListMonk. The supported set is X, Facebook,
  Instagram (and Instagram standalone), Threads and Bluesky, with YouTube
  coming and LinkedIn, TikTok and Google Business Profile blocked on those
  platforms' own approval. The other providers' code is untouched on the
  server; it is simply no longer documented or offered.
- Provider settings are transcribed from the server's validation DTOs rather
  than invented. Corrections include TikTok's `privacy_level` (documented as
  `privacy`, which is silently ignored), YouTube's 500-character total tag
  budget, and the absence of `playlistId` and `companyId`.
- Rate limits documented for the first time: per key, per route, per hour —
  600 reads, 60 publish/delete, 30 analytics and uploads, 10 for the video
  routes.
- Authentication documented for the first time: named, scoped, hashed,
  show-once keys whose permissions are re-checked against their owner's current
  role on every request, and the device flow behind `posty auth:login`.
- `api.posty.hu` is live. `docs.posty.hu`, `cdn.posty.hu` and `mcp.posty.hu`
  are not, and no longer appear.

### Removed
- Claims of AI video generation. The routes exist and are rate-limited; the
  feature does not work and is not offered.
- A recommendation to generate media with a third-party `agent-media` CLI.
- `examples/reddit-post.json`.
- `npm install -g posty` from every install instruction. That name on npmjs.com
  belongs to an unrelated UK-postcode library by another author, and installing
  it succeeds silently.
- `--image` and `--comments` from every example. Neither is a registered
  option; yargs ignores unknown flags, so commands using them posted with the
  comments and the media missing and no error.

### Fixed
- `server/SERVER.md` is marked superseded. That standalone device-flow service
  was never deployed; the flow lives in Posty's own backend.
- `SUPPORTED_FILE_TYPES.md` had promised PDF, DOC, MP3, SVG, MOV, MKV, WEBM and
  AVI. The server accepts eight MIME types, sniffed from magic bytes.

## [2.0.15]

### Fixed
- `auth:login` pointed at `cli-auth.posty.hu`, a service that was never deployed
  and whose hostname does not resolve, so the device flow could not work at all.
  It now points at Posty's own backend, which serves the same wire contract.

## [1.0.0] - 2026-02-13

### Added
- Initial release of the Posty CLI, forked from Postiz's agent.
- `posts:create`, `posts:list`, `posts:delete`
- `integrations:list`
- `upload`
- Configuration via `POSTY_API_KEY` and `POSTY_API_URL`
- `SKILL.md` for AI-agent usage
