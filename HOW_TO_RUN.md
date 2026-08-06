# How to run the Posty CLI

This repository **is** the CLI. It is a standalone package — there is no
`apps/cli` directory and no monorepo to build it from. Earlier versions of this
file described that layout; it does not exist here.

## Install

**Not from npm.** The name `posty` on npmjs.com belongs to an unrelated
UK-postcode library by another author. `npm install -g posty` installs that,
successfully and silently. Do not run it.

```bash
git clone <this repository>
cd posty-agent

pnpm install
pnpm run build          # tsup → dist/index.js, with a shebang

npm link                # makes `posty` available on your PATH
posty --help
```

`npm link` is reversible with `npm unlink -g posty` from the same directory.

### Without linking

`dist/index.js` is executable on its own:

```bash
node dist/index.js --help
./dist/index.js --help
```

### Rebuilding while you work

```bash
pnpm run dev            # tsup --watch
```

A linked binary points at `dist/`, so a rebuild takes effect immediately — no
re-link.

## Authenticate

Two ways, and the CLI prefers the first if both are present.

### Device login

```bash
posty auth:login
```

Prints a short code, opens the approval page in your browser, and polls until
you approve it while signed in to Posty. You choose there which workspace and
which channels the resulting key may reach.

Credentials go to `~/.posty/credentials.json`, mode `0600` inside a `0700`
directory. The response also carries the API base, so the CLI points itself at
the right host without needing a release.

```bash
posty auth:status       # verifies the credentials against the API
posty auth:logout       # deletes the file
```

### API key

Mint one in the web app under **Settings → Developers**. It is shown once and
stored hashed — a lost key is rotated, not recovered.

```bash
export POSTY_API_KEY=your_api_key_here
```

Permanent:

```bash
echo 'export POSTY_API_KEY=your_api_key' >> ~/.zshrc   # or ~/.bashrc
```

## Environment variables

| Variable | Required | Default | What it does |
|---|---|---|---|
| `POSTY_API_KEY` | Only without `auth:login` | — | Bearer credential |
| `POSTY_API_URL` | No | `https://posty.hu/api` | API base. `https://api.posty.hu` is live and equivalent. |
| `POSTY_AUTH_SERVER` | No | `https://posty.hu/api` | Where the device flow runs |
| `POSTY_CLIENT_NAME` | No | `Posty CLI` | The name shown on the approval page |

Stored credentials from `auth:login` override `POSTY_API_KEY` and
`POSTY_API_URL`. If you set a key and it seems to be ignored, run
`posty auth:status` — a stale `~/.posty/credentials.json` is the usual reason.

`docs.posty.hu`, `cdn.posty.hu` and `mcp.posty.hu` appear in older
documentation. None of them resolve.

## First commands

```bash
posty auth:status
posty integrations:list
```

`integrations:list` is the ground truth for what you can post to. LinkedIn,
TikTok and Google Business Profile are pending those platforms' own approval,
so they may not appear even though the code is complete.

```bash
# Upload first — always. -m takes URLs from upload, never a local filename.
IMG=$(posty upload ./photo.jpg | jq -r '.path')

posty posts:create \
  -c "Első poszt a CLI-ből" \
  -m "$IMG" \
  -s "2026-12-31T12:00:00Z" \
  -t draft \
  -i "<integration-id>"
```

`-s` is required on every post. `-t draft` is worth using the first few times:
it validates exactly as a scheduled post would, without publishing.

## Troubleshooting

**`posty: command not found`** — `which posty`. If empty, `npm link` again from
this directory, or use `node dist/index.js`.

**`No authentication found`** — neither `~/.posty/credentials.json` nor
`POSTY_API_KEY`. Run `posty auth:login`.

**`401 Invalid API key`** — wrong, revoked or expired. Re-run `auth:login`, or
mint a new key.

**`403 … missing the required permission: <scope>`** — the key was not granted
that scope, *or* its owner's role no longer allows it. Scopes are re-checked
against the owner's current role on every request, so a key that worked
yesterday can narrow today with nothing having been revoked.

**`400 Unsupported file type.`** — eight MIME types are accepted and the server
sniffs magic bytes, so renaming does not help. See
[SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md).

**`429`** — rate limit, per key per route per hour. Back off; retrying in a
loop just spends the next hour too.

**A post came back as a draft when you asked for a schedule** — the key lacks
`posts:publish`. The server coerces rather than refusing. Read the `type` in
the response.

## Getting help

```bash
posty --help
posty posts:create --help
```

Start with [SKILL.md](./SKILL.md) — it is the complete guide, and the one an AI
agent should read.
