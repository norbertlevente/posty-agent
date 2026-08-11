# Posty CLI

Schedule and publish social media posts from the command line — or let an AI
agent do it for you.

Posty is a Hungarian social-media scheduler. This is its command-line
interface: it talks to the same public API the web app does, so anything you
schedule here shows up in your Posty calendar, and anything you schedule there
is visible here.

```bash
npm install -g posty-cli
posty auth:login
posty integrations:list
```

> **The package is `posty-cli`. The command is `posty`.**
> These differ on purpose. The bare name `posty` on npm belongs to an
> unrelated project, so `npm install -g posty` installs somebody else's
> package — successfully and silently, which is exactly why it is worth
> saying out loud.

## What it is for

Posty deliberately has **no built-in AI copywriter**. You already pay for a
good model; the CLI exists so that model can drive the calendar directly
instead of you copying text between two windows.

That makes this useful in two situations:

- **Scripting.** Schedule a fortnight of posts from a CSV, wire publishing
  into CI, or generate a thread from a changelog.
- **AI agents.** [`SKILL.md`](./SKILL.md) is written to be read by an agent.
  Point Claude, ChatGPT, Codex, Muse, OpenClaw or Hermes at it and they can
  use the whole CLI without further instruction.

## Quick start

```bash
# 1. Authenticate — opens a browser (device flow)
posty auth:login

# 2. See which channels are connected, and get their IDs
posty integrations:list

# 3. Schedule a post
posty posts:create \
  -i "INTEGRATION_ID" \
  -c "Hello from the command line" \
  --date "2026-12-31T12:00:00Z"
```

Prefer an API key to a browser login — on a server, or for an agent:

```bash
export POSTY_API_KEY=your_api_key   # Settings → Developers, in the web app
```

## Commands

| Command | What it does |
|---|---|
| `posts:create` | Create a post — schedule it, save a draft, or publish now |
| `posts:list` | List posts in a date range |
| `posts:delete <id>` | Delete a post |
| `posts:status <id>` | Move a post between draft and scheduled |
| `posts:find-slot <id>` | Find the next free publishing slot |
| `posts:missing <id>` | List provider content for a post with a missing release ID |
| `posts:connect <id>` | Attach a post to already-published content |
| `integrations:list` | List connected channels and their IDs |
| `integrations:groups` | List groups (customers) |
| `integrations:settings <id>` | Settings schema, rules and max length for a channel |
| `integrations:trigger <id> <method>` | Run a channel lookup (subreddits, boards, …) |
| `analytics:platform <id>` | Analytics for a channel |
| `analytics:post <id>` | Analytics for a post |
| `upload <file>` | Upload media; returns the URL for `posts:create -m` |
| `config:set` / `config:get` | Read and write `~/.posty/config.json` |
| `auth:login` / `auth:logout` / `auth:status` | Manage credentials |

Run `posty <command> --help` for the flags on any of them.

## Two things that bite people

**Dates need a timezone.** A bare `"2026-12-31 12:00"` is ambiguous, and the
CLI refuses to guess rather than silently publishing an hour off. Give an
explicit offset (`2026-12-31T12:00:00Z`, or `+01:00`), or pass
`--timezone Europe/Budapest`, or set one once with
`posty config:set timezone Europe/Budapest`.

**`-d` is in minutes, not seconds.** It is the delay between the parts of a
thread. `-d 2` is two minutes.

## Threads and media

Repeat `-c` to build a thread — the first is the post, the rest are comments.
Each `-m` attaches to the `-c` it follows:

```bash
posty posts:create \
  -i "INTEGRATION_ID" \
  -c "First tweet"  -m "https://.../one.jpg" \
  -c "Second tweet" \
  -c "Third tweet"  -m "https://.../three.jpg" \
  -d 2 \
  --date "2026-12-31T12:00:00Z"
```

Media URLs must come from `posty upload` — the API does not accept arbitrary
external links.

For anything more involved, write the post as JSON and pass `--json`. See
[`examples/`](./examples) for working payloads.

## Output contract

Results are **JSON on stdout**. Status messages and errors go to **stderr**.
Every failure exits non-zero. So this is safe:

```bash
posty integrations:list | jq -r '.[].id'
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `POSTY_API_KEY` | — | API key, instead of `auth:login` |
| `POSTY_API_URL` | `https://posty.hu/api` | Override the API endpoint |
| `POSTY_TIMEZONE` | — | IANA timezone for dates without an offset |

Credentials are stored in `~/.posty/credentials.json` with `0600`
permissions, in a `0700` directory, separate from your settings — so
`posty auth:logout` removes the secrets and leaves your configuration alone.

## Documentation

- [SKILL.md](./SKILL.md) — the complete command reference, written for AI agents
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) — installing and running from source
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) — per-channel settings schemas
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) — accepted media types

## Building from source

```bash
git clone https://github.com/norbertlevente/posty-agent.git
cd posty-agent
pnpm install
pnpm run build
node dist/index.js --help
```

## Licence

AGPL-3.0. See [LICENSE](./LICENSE).

Posty is a derivative work of [Postiz](https://github.com/gitroomhq/postiz-app),
which is likewise AGPL-3.0; copyright in the upstream portions remains with
that project and its contributors.
