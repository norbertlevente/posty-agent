# Project structure

The `posty` CLI, the Claude skill it ships as, and an unused auth server kept
for reference.

This is a **standalone repository**, not a package inside a monorepo. Earlier
versions of this file described `apps/cli/` inside the Posty product repo. That
layout does not exist here, and neither does the `README.md` those versions
listed.

## Layout

```
.
├── src/
│   ├── index.ts                  yargs command table — the authoritative flag list
│   ├── api.ts                    HTTP client for /public/v1
│   ├── config.ts                 credentials file → env var fallback
│   └── commands/
│       ├── auth.ts               device flow, status, logout
│       ├── posts.ts              create, list, delete, status, missing, connect
│       ├── integrations.ts       list, groups, settings, trigger
│       ├── analytics.ts          platform, post
│       └── upload.ts             media upload
│
├── skills/
│   └── elor/SKILL.md             SYMLINK to ../../SKILL.md — do not edit separately
│
├── server/                       SUPERSEDED. A standalone device-flow service
│                                 that was never deployed; the flow now lives in
│                                 Posty's own backend. See server/SERVER.md.
│
├── examples/                     runnable JSON payloads and shell scripts
│
├── .claude-plugin/               plugin + marketplace manifests
├── package.json                  bin: posty → dist/index.js
├── tsup.config.ts                CJS bundle, shebang, source map
└── dist/                         build output (generated)
```

## Commands

Sixteen, defined in `src/index.ts`. That file is the source of truth for flags;
anything not in it does not exist, and yargs ignores unknown options silently
rather than erroring.

| Command | Handler |
|---|---|
| `auth:login`, `auth:logout`, `auth:status` | `commands/auth.ts` |
| `posts:create` | `commands/posts.ts::createPost` |
| `posts:list` | `commands/posts.ts::listPosts` |
| `posts:delete <id>` | `commands/posts.ts::deletePost` |
| `posts:status <id>` | `commands/posts.ts::changePostStatus` |
| `posts:missing <id>` | `commands/posts.ts::getMissingContent` |
| `posts:connect <id>` | `commands/posts.ts::connectPost` |
| `integrations:list` | `commands/integrations.ts` |
| `integrations:groups` | `commands/integrations.ts` |
| `integrations:settings <id>` | `commands/integrations.ts` |
| `integrations:trigger <id> <method>` | `commands/integrations.ts` |
| `analytics:platform <id>` | `commands/analytics.ts` |
| `analytics:post <id>` | `commands/analytics.ts` |
| `upload <file>` | `commands/upload.ts` |

`posts:create` flags: `-c/--content` (repeatable), `-m/--media` (repeatable,
paired with `-c`), `-i/--integrations`, `-s/--schedule` (**required**),
`-t/--type`, `-d/--delay`, `--settings`, `--shortLink`, `-j/--json`.

There is no `--image`, no `--comments` and no `-p/--provider`. The provider is
inferred from the integration id.

## Request flow

```
argv → src/index.ts (yargs)
     → commands/*.ts
     → config.ts        ~/.posty/credentials.json, else POSTY_API_KEY
     → api.ts           fetch, Authorization header
     → JSON to stdout, or an ❌ message and exit 1
```

## Configuration

| Source | Wins |
|---|---|
| `~/.posty/credentials.json` (from `auth:login`) | first |
| `POSTY_API_KEY` + `POSTY_API_URL` | fallback |

The credentials file stores `accessToken`, `apiUrl` and `organizationId`, mode
`0600` in a `0700` directory. Its `apiUrl` comes from the device-token
response, so the server can move the CLI to a new API base without a release.

Default base when nothing is set: `https://posty.hu/api`. `https://api.posty.hu`
is live and equivalent.

## API surface used

Base `/public/v1`, all authenticated by the `Authorization` header.

| Endpoint | Command | Scope | Rate limit |
|---|---|---|---|
| `POST /posts` | `posts:create` | `posts:draft` | 60/h |
| `GET /posts` | `posts:list` | `posts:read` | default |
| `DELETE /posts/:id` | `posts:delete` | `posts:draft` | 60/h |
| `PUT /posts/:id/status` | `posts:status` | `posts:publish` | 60/h |
| `GET /posts/:id/missing` | `posts:missing` | `posts:read` | default |
| `PUT /posts/:id/release-id` | `posts:connect` | `posts:publish` | default |
| `GET /integrations` | `integrations:list` | `channels:read` | default |
| `GET /groups` | `integrations:groups` | `channels:read` | default |
| `GET /integration-settings/:id` | `integrations:settings` | `channels:read` | default |
| `POST /integration-trigger/:id` | `integrations:trigger` | `channels:read` | 60/h |
| `GET /analytics/:integration` | `analytics:platform` | `analytics:read` | 30/h |
| `GET /analytics/post/:postId` | `analytics:post` | `analytics:read` | 30/h |
| `POST /upload` | `upload` | `media:write` | 30/h |

"Default" is the module-level `API_LIMIT`, 600/h per key in production. Every
route keeps its own bucket, keyed on the hash of the presented key.

Routes the API exposes that the CLI does not wrap: `POST /upload-from-url`,
`GET /find-slot/:id`, `GET /is-connected`, `GET /notifications`,
`DELETE /posts/group/:group`, `GET /social/:integration`. The two AI-video
routes exist and are rate-limited, but **video generation does not work and is
not a feature** — do not wrap them.

## Build

```bash
pnpm run build      # tsup: src/index.ts → dist/index.js (CJS, shebang, sourcemap)
pnpm run dev        # watch
```

`package.json` `files` ships `dist`, `SKILL.md`, `CHANGELOG.md` and `LICENSE`.

## Publishing

**Do not.** The npm name `posty` belongs to somebody else's package, and
publishing is the owner's decision and irreversible. See
[PUBLISHING.md](./PUBLISHING.md).
