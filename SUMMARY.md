# What this repository is

The `posty` command-line interface to Posty's public API, plus the Claude skill
it ships as. Written for AI agents first and people second: every command
prints JSON to stdout, and every error prints a message and exits non-zero.

This file used to be a build report — "✅ 18 files created", "359 lines of
code", "ready for npm publishing", a directory tree rooted at `apps/cli/`, and
a documentation list including a `README.md`. None of that describes this
repository. It is a standalone package, the layout is in
[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md), and it is not on npm.

## Where to start

| You are | Read |
|---|---|
| An AI agent about to use the CLI | [SKILL.md](./SKILL.md) — everything, in one file |
| A person installing it | [HOW_TO_RUN.md](./HOW_TO_RUN.md) |
| In a hurry | [QUICK_START.md](./QUICK_START.md) |
| Writing a `--settings` payload | [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md) |
| Hitting a `400` on upload | [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md) |
| Looking for a template | [examples/](./examples/) |

## The three things that trip everyone up

**1. The channel list is short.** Publishing is proven on X, Facebook,
Instagram, Threads and Bluesky. YouTube is coming. LinkedIn, TikTok and Google
Business Profile are complete in code and blocked on those platforms' own
approval. Nothing else is offered, whatever inherited provider code exists on
the server. `posty integrations:list` is the truth for a given account.

**2. Media must be uploaded first.** `-m` takes a URL returned by
`posty upload`, never a local filename. Eight file types are accepted and the
server decides by sniffing bytes, so renaming a `.mov` to `.mp4` does not work.

**3. The package is `posty-cli`; the command is `posty`.** They differ because
`npm install -g posty` installs an unrelated UK-postcode library by another
author. `posty-cli` is not published yet, so until it is: clone,
`pnpm run build`, `npm link`.

## Commands

```
auth:login   auth:logout   auth:status

integrations:list   integrations:groups
integrations:settings <id>   integrations:trigger <id> <method>

posts:create   posts:list   posts:delete <id>
posts:status <id>   posts:missing <id>   posts:connect <id>

analytics:platform <id>   analytics:post <id>

upload <file>
```

`src/index.ts` is the authoritative flag list. yargs ignores unknown options
rather than erroring, so a flag that is not in that file fails silently rather
than loudly — which is exactly how `--image` and `--comments` survived in the
documentation for as long as they did.

## Configuration

`~/.posty/credentials.json` from `auth:login` wins; `POSTY_API_KEY` is the
fallback. Default API base `https://posty.hu/api`; `https://api.posty.hu` is
live and equivalent.

## Publishing

Don't. The name is taken and the decision is the owner's. See
[PUBLISHING.md](./PUBLISHING.md).
