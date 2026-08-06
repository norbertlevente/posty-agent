# Changelog

All notable changes to the Posty CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
