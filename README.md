## Using it with an AI agent

The package includes the full command reference written for agents,
[`SKILL.md`](./SKILL.md). After install, show it to the agent and it can use
the whole CLI with no further explanation.

The repo ships two Claude Code plugins, kept separate on purpose:

- **`posty`**, the MCP connector for conversation (Claude app, Cowork, Claude
  Code). Sign-in through the browser, no key; it uses Posty's MCP tools and
  installs nothing on your machine.
- **`posty-cli`**, the command-line tool and its full reference for coding
  agents (Claude Code, Codex, OpenClaw, Hermes), where the terminal is the
  working surface.

```bash
claude plugin marketplace add norbertlevente/posty-agent
claude plugin install posty@posty-agent        # MCP, for conversation
claude plugin install posty-cli@posty-agent    # CLI, for the terminal and scripts
```

In ChatGPT the same MCP server is the official plugin: https://posty.hu/ai/chatgpt

---

# Posty CLI

**Social media scheduling from the command line, or from your AI agent.**

Posty is a social media scheduler, and this is its command-line surface. It
uses the same public API as the web app: what you schedule here shows up in
your Posty calendar, and what you schedule there you can see here too.

Posty **deliberately has no built-in AI writer**. You already pay for a good
model; with the CLI that model can work straight into your calendar, so you
do not have to copy between two windows. [`SKILL.md`](./SKILL.md) is written
for AI agents. Show it to Claude, ChatGPT, Codex, Muse, OpenClaw or Hermes
and they can use the whole CLI with no further explanation.

> Commands, flags and output are English on purpose: the command line is for
> developers and agents. The product itself is still Hungarian in the app.

## Install

```bash
npm install -g posty-cli
# or
pnpm install -g posty-cli
```

> **The package is `posty-cli`, the command is `posty`.**
> The two names differ on purpose. On npm the bare name `posty` belongs to an
> unrelated project, so `npm install -g posty` silently installs somebody
> else's package.

## Authentication

**Option 1: OAuth2 (recommended)**

```bash
posty auth:login     # device flow, opens a browser
posty auth:status    # checks that credentials are still valid
posty auth:logout    # deletes stored credentials
```

The CLI stores credentials in `~/.posty/credentials.json`, mode `0600`, in a
`0700` directory. The file is separate from settings, so `logout` clears
secrets and leaves your config alone.

**Option 2: API key** — for a server, CI, or an agent:

```bash
export POSTY_API_KEY=your_api_key   # Settings → Developers, in the web app
```

## Workspaces

A credential can reach one workspace or several (tick "All my workspaces" on
the approval page, or make a multi-workspace key in Settings). Channel ids
belong to a workspace, so the CLI has to know which one you mean:

```bash
posty workspaces:list          # what this credential can act on; "current" marks the active one
posty workspaces:use <id>      # every following command acts on that workspace
posty workspaces:current       # the one commands act on now
posty posts:list --workspace <id>   # one command in another workspace
```

`auth:login` asks which workspace to use when the key spans several. The
choice is stored with your login (or in `~/.posty/config.json` for an env
key); `POSTY_WORKSPACE` and `--workspace` override it for one shell or one
command. A multi-workspace key with no choice made is refused by the API
with 403 on every route except `workspaces:list`, so nothing is ever posted
to a guessed workspace.

## Commands

### Discover channels

```bash
posty integrations:list                      # connected channels and their ids
posty integrations:list --group <group-id>   # one customer's channels
posty integrations:groups                    # groups (customers)
posty integrations:settings <id>             # settings schema, rules, character limit
posty integrations:trigger <id> <method>     # channel-specific lookup
```

### Create a post

```bash
# Simple scheduled post
posty posts:create -c "Content" --date "2026-12-31T12:00:00Z" -i "<id>"

# Draft
posty posts:create -c "Content" --date "2026-12-31T12:00:00Z" -t draft -i "<id>"

# Publish now (no date needed)
posty posts:create -c "Content" -t now -i "<id>"

# With media — upload the file first
IMG=$(posty upload photo.jpg | jq -r '.path')
posty posts:create -c "Content" -m "$IMG" --date "2026-12-31T12:00:00Z" -i "<id>"

# Several channels at once
posty posts:create -c "Content" --date "2026-12-31T12:00:00Z" -i "<id1>,<id2>"

# With channel-specific settings
posty posts:create -c "Content" --date "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "<x-id>"

# Complex post from JSON
posty posts:create --json post.json
```

### Manage posts

```bash
posty posts:list                                   # default -30 … +30 days
posty posts:list --startDate "..." --endDate "..." # a given range
posty posts:delete <id>                            # delete
posty posts:status <id> --status draft             # back to draft
posty posts:status <id> --status schedule          # queue a draft
posty posts:find-slot <id>                         # next free slot
```

### Analytics

```bash
posty analytics:platform <integration-id>        # channel, 7 days
posty analytics:platform <integration-id> -d 30  # channel, 30 days
posty analytics:post <post-id>                   # post, 7 days
```

If `analytics:post` returns `{"missing": true}`, the post is already live but
the platform did not return a usable id. Then:

```bash
posty posts:missing <post-id>                     # available content from the provider
posty posts:connect <post-id> --release-id "<id>" # connect it
posty analytics:post <post-id>                    # works now
```

### Media

```bash
posty upload file.jpg
```

**For `-m` you may only pass a path returned by `posty upload`.** Bare
filenames (`photo.jpg`) and external URLs (`https://...`) do not work,
because the platforms only accept addresses Posty serves.

### Settings

```bash
posty config:set timezone Europe/Budapest
posty config:get
posty workspaces:use <id>          # see "Workspaces" above
```

### Subscription

An agent can take the person from "subscribe me to Pro yearly" to a live
subscription. The one step that stays human is the payment, in Stripe
Checkout, with the person's own Link wallet or card.

```bash
posty billing:plans                                       # the four plans, prices in HUF, limits, trial rule, current tier
posty billing:subscribe --tier pro --period yearly        # a Stripe Checkout link as JSON; nothing is charged
posty billing:subscribe --tier pro --period yearly --open # same, and open it in this machine's browser
posty billing:status                                      # none | trialing | active | past_due | read_only | cancelled, plus any unpaid checkout
posty billing:manage                                      # a link to the Stripe billing portal (plan change, cancel, invoices, card)
```

**Never pay with a one-time or agent-issued card.** A Posty subscription
renews monthly or yearly; a one-time card fails at the first renewal and the
plan ends. Give the link to the subscriber, let them pay, then run
`posty billing:status` to confirm before continuing setup.

`billing:subscribe` and `billing:manage` need a full-workspace key (tick
"the whole workspace" on the `posty auth:login` approval page) or an OAuth
token, held by the person who pays for the workspace (or a workspace owner
when nobody pays yet). A scoped key is refused with a message that says so.
All four commands work before the workspace has a plan with API access: they
are how it gets one.

## Channel-specific settings

The exact schema is always what `posty integrations:settings <id>` shows.
In short:

### X (Twitter) — `x`

```bash
posty posts:create -c "Content" --date "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "<x-id>"
```

`who_can_reply_post` is **required**. Values: `everyone`, `following`,
`mentionedUsers`, `subscribers`, `verified`.

### Facebook — `facebook`

```bash
IMG=$(posty upload photo.jpg | jq -r '.path')
posty posts:create -c "Content" -m "$IMG" --date "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' -i "<facebook-id>"
```

`post_type`: `post` or `story`. You can publish to Pages, not to a personal
profile.

### Instagram — `instagram`

```bash
IMG=$(posty upload photo.jpg | jq -r '.path')
posty posts:create -c "Caption #hashtag" -m "$IMG" --date "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' -i "<instagram-id>"
```

`post_type` is **required**: `post` or `story`.

### Threads — `threads`, Bluesky — `bluesky`

**No settings.** Omit the `--settings` flag.

Full schema: [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md).

## For AI agents

**Discovery.** Do not let the agent guess. `integrations:list` shows the
channels that are actually connected, and `integrations:settings <id>` shows
the accepted settings. A channel that is not in `integrations:list` cannot
be posted to.

**Output contract.** The command writes the result **as JSON to stdout**, and
status lines and errors to **stderr**. On failure it exits with a non-zero
code:

```bash
posty integrations:list | jq -r '.[].id'
```

**JSON mode.** For a complex campaign, write the post to a file and pass it
with `--json`. Working examples are in [`examples/`](./examples).

**Threads.** Repeat `-c` to build a thread: the first item is the post, the
rest are comments. Each `-m` belongs to the `-c` in front of it:

```bash
posty posts:create \
  -c "First post"     -m "$(posty upload one.jpg | jq -r '.path')" \
  -c "Second post" \
  -c "Third post" -m "$(posty upload three.jpg | jq -r '.path')" \
  -d 2 \
  --date "2026-12-31T12:00:00Z" -i "<id>"
```

`-d` is in **minutes**, not seconds.

## Common workflows

**A campaign on several channels, with different text per channel** — write
it to a JSON file and pass `--json`; see
[`examples/multi-platform-with-settings.json`](./examples/multi-platform-with-settings.json).

**Weekly scheduling from a script:**

```bash
DATES=("2026-09-01T09:00:00Z" "2026-09-02T09:00:00Z" "2026-09-03T09:00:00Z")
TEXTS=("Monday kickoff" "Tuesday tip" "Wednesday takeaway")

for i in "${!DATES[@]}"; do
  posty posts:create -c "${TEXTS[$i]}" --date "${DATES[$i]}" -i "<id>"
done
```

**Check the character limit before publishing:**

```bash
MAX=$(posty integrations:settings "<id>" | jq '.output.maxLength')
```

## Environment variables

| Variable | Required | Default | What it is for |
|---|---|---|---|
| `POSTY_API_KEY` | no | — | API key instead of `auth:login` |
| `POSTY_API_URL` | no | `https://posty.hu/api` | Override the API endpoint |
| `POSTY_TIMEZONE` | no | — | IANA timezone for datetimes with no offset |
| `POSTY_WORKSPACE` | no | — | Workspace id for a key that spans several (see `workspaces:use`) |
| `POSTY_AUTH_SERVER` | no | `https://posty.hu` | OAuth2 server (self-hosting) |
| `POSTY_CLIENT_NAME` | no | `posty-cli` | Client name shown at device approval |

## Dates and timezones

A bare `"2026-12-31 12:00"` is ambiguous. The CLI **fails rather than
silently publishing an hour off**. It looks for a timezone in this order:

1. an explicit offset in the date — `2026-12-31T12:00:00Z` or `+01:00`
2. `--timezone Europe/Budapest`
3. `POSTY_TIMEZONE`
4. `posty config:set timezone Europe/Budapest`

If none of those is set, the command fails, and the error lists all four
fixes. You cannot pass a numeric offset as a timezone value.

## Error handling

The CLI writes every error to stderr and exits non-zero. stdout stays clean
and machine-readable.

| Error | Meaning |
|---|---|
| `--date is required...` | A schedule needs a date, or use `-t now` |
| `--integrations is required...` | No channel given; `integrations:list` |
| naive date error | No timezone anywhere; see above |
| `Integration not found` | Bad id, or the channel is no longer connected |
| 401 / 403 | Expired or revoked auth; `posty auth:login` |

## Development

```
src/
├── index.ts        # commands and flags (yargs)
├── api.ts          # HTTP client
├── commands/       # posts, integrations, analytics, upload, auth, config
├── dates.ts        # timezone resolution
├── settings.ts     # channel settings
└── output.ts       # the JSON/stderr output contract
```

```bash
git clone https://github.com/norbertlevente/posty-agent.git
cd posty-agent
pnpm install
pnpm run build          # tsup → dist/index.js
node dist/index.js --help
```

| Script | What it does |
|---|---|
| `pnpm run build` | Compiles into `dist/` |
| `pnpm run dev` | Watches and recompiles |
| `pnpm run release:check` | Checks the package and publishing (does not publish) |

## Quick reference

```bash
# Authentication
posty auth:status
posty auth:login
posty auth:logout

# Workspaces
posty workspaces:list
posty workspaces:use <id>

# Discovery
posty integrations:list
posty integrations:settings <id>
posty integrations:trigger <id> <method>

# Posting
posty posts:create -c "text" --date "2026-12-31T12:00:00Z" -i "<id>"
posty posts:create -c "text" -t draft --date "..." -i "<id>"
posty posts:create -c "text" -t now -i "<id>"
posty posts:create --json file.json

# Management
posty posts:list
posty posts:delete <id>
posty posts:status <id> --status draft
posty posts:find-slot <id>
posty upload <file>
posty upload:link
posty upload:files <id>

# Analytics
posty analytics:platform <id> -d 30
posty analytics:post <id>
posty posts:missing <id>
posty posts:connect <id> --release-id "<rid>"

# Subscription (the person pays in Stripe Checkout; never with an agent card)
posty billing:plans
posty billing:subscribe --tier pro --period yearly
posty billing:status
posty billing:manage
```

## When the file is not on this machine

`posty upload` uploads a file from disk. If the image or video is on your
phone, or the agent running the CLI cannot see your filesystem, mint an
upload link:

```bash
posty upload:link            # {id, url, expiresAt}
# open the url anywhere (it works signed out), drop the files on it
posty upload:files <id>      # {status, count, files:[{id, name, path, type}]}
```

Each item's `path` goes into `posts:create -m`. The link lives two hours,
accepts several files, and can only upload into the one workspace it was
made for.

## Documentation

- [SKILL.md](./SKILL.md) — the full command reference, written for AI agents
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) — install and run from source
- [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) — per-channel settings schemas
- [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) — accepted media types

## Supported channels

| Channel | `identifier` | Settings |
|---|---|---|
| X (Twitter) | `x` | `who_can_reply_post` required |
| Facebook (Pages) | `facebook` | `post_type` |
| Instagram | `instagram` | `post_type` required |
| LinkedIn | `linkedin` | none required |
| TikTok | `tiktok` | `privacy_level`, `content_posting_method` required |
| YouTube | `youtube` | `title`, `type` required |
| Threads | `threads` | none |
| Bluesky | `bluesky` | none |
| Telegram | `telegram` | none |
| Discord | `discord` | `channel` required (from the `channels` tool) |
| Slack | `slack` | `channel` required (from the `channels` tool) |

`integrations:list` shows which channels you can actually use. The table is
what Posty supports; the command output is what you have connected.

## Contributing

1. Fork the project
2. Create a branch (`git checkout -b feature/something`)
3. Build, then try it: `pnpm run build && node dist/index.js --help`
4. Open a pull request

## Links

- Website: [posty.hu](https://posty.hu)
- npm: [posty-cli](https://www.npmjs.com/package/posty-cli)
- GitHub: [norbertlevente/posty-agent](https://github.com/norbertlevente/posty-agent)

## License

AGPL-3.0, see the [LICENSE](./LICENSE) file.

© 2026 Kiss Industries
