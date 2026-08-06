# Posty CLI — quick start

Five minutes from clone to a scheduled draft.

For the full picture read [SKILL.md](./SKILL.md); for installation detail,
[HOW_TO_RUN.md](./HOW_TO_RUN.md).

## 1. Install

The package is **`posty-cli`**; the command it installs is `posty`.
**Never `npm install -g posty`** — that name on npmjs.com is an unrelated
UK-postcode library by another author, and it installs cleanly, which is what
makes the mistake hard to notice.

`posty-cli` is not published yet, so build from source:

```bash
git clone <this repository>
cd posty-agent
pnpm install
pnpm run build
npm link
posty --help
```

## 2. Authenticate

```bash
posty auth:login
```

Opens a browser. You approve the code while signed in to Posty, and choose
which workspace and which channels the key may reach. Credentials land in
`~/.posty/credentials.json`.

Or use a key minted in the web app under **Settings → Developers** — it is
shown once:

```bash
export POSTY_API_KEY=your_api_key_here
```

Check it worked:

```bash
posty auth:status
```

## 3. See what you can post to

```bash
posty integrations:list
```

```json
[
  { "id": "…", "name": "@myhandle", "identifier": "x" },
  { "id": "…", "name": "My Page",   "identifier": "facebook" }
]
```

**This output is the truth about your channels.** Posty publishes to X,
Facebook, Instagram, Threads and Bluesky today, with YouTube coming; LinkedIn,
TikTok and Google Business Profile are waiting on those platforms' own approval
and may not be connectable yet. Nothing else is offered — see the channel table
in [SKILL.md](./SKILL.md).

Grab an id:

```bash
X_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="x") | .id')
```

## 4. Post

`-s` is required on every post. Start with `-t draft`: it runs the same
validation without publishing.

```bash
posty posts:create \
  -c "Hello from the CLI" \
  -s "2026-12-31T12:00:00Z" \
  -t draft \
  --settings '{"who_can_reply_post":"everyone"}' \
  -i "$X_ID"
```

Happy with it? Promote the draft:

```bash
posty posts:status <post-id> --status schedule
```

## 5. Media

**Every file must go through `posty upload` first.** `-m` takes the URL it
returns, never a local filename — a filename produces a post with a broken
media reference, not an upload.

```bash
IMG=$(posty upload ./photo.jpg | jq -r '.path')

posty posts:create \
  -c "Look at this" \
  -m "$IMG" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

Eight file types are accepted: JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF (10 MB)
and MP4 (1 GB). Nothing else — see
[SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md).

## 6. Comments and threads

Repeat `-c`. The first is the post; the rest are its comments, in order. Pair
each with its own `-m` if it needs media.

```bash
A=$(posty upload one.jpg | jq -r '.path')
B=$(posty upload two.jpg | jq -r '.path')

posty posts:create \
  -c "Main post"    -m "$A" \
  -c "First reply"  -m "$B" \
  -c "Second reply" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

There is no `--comments` flag and no `--image` flag. Older documentation used
both; unknown options are ignored rather than rejected, so a command that uses
them posts with the comments and media silently missing.

## Every command

```bash
posty auth:login | auth:logout | auth:status

posty integrations:list [--group <id>]
posty integrations:groups
posty integrations:settings <id>
posty integrations:trigger <id> <method> [-d '<json>']

posty posts:create  -c … [-m …] -s <iso8601> [-t draft] [-d <n>] [--settings '<json>'] [--shortLink] -i <ids>
posty posts:create  --json <file>
posty posts:list    [--startDate <iso>] [--endDate <iso>] [--customer <id>]
posty posts:delete  <id>
posty posts:status  <id> --status draft|schedule
posty posts:missing <id>
posty posts:connect <id> --release-id <id>

posty analytics:platform <integration-id> [-d <days>]
posty analytics:post     <post-id>        [-d <days>]

posty upload <file>
```

## Errors you will actually hit

| Message | What to do |
|---|---|
| `No authentication found` | `posty auth:login` |
| `401 Invalid API key` | Key is wrong, revoked or expired |
| `403 … missing the required permission: <scope>` | The key lacks that scope, or its owner's role no longer permits it — roles are re-checked on every request |
| `400 Unsupported file type.` | Not one of the eight types; the server sniffs bytes, so renaming does not help |
| `429` | Rate limit. Back off. |
| You asked to schedule and got a draft | The key lacks `posts:publish`; the server coerces rather than refusing |
| `404 Tool not found` | That method does not exist. Only Instagram has a tool (`audioSearch`) |

## Where next

- [SKILL.md](./SKILL.md) — the complete guide, and what an AI agent should read
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) — every field of every channel
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) — the eight types
- [examples/](./examples/) — runnable JSON and shell templates
