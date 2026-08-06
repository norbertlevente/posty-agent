# What the CLI can do

A capability list, honest about the edges. The complete guide is
[SKILL.md](./SKILL.md).

## Channels

Publishing is proven, against live accounts, on **X (Twitter), Facebook,
Instagram (including the standalone login), Threads and Bluesky**. **YouTube**
is coming and is treated as first-class here. **LinkedIn, TikTok and Google
Business Profile** are complete in code and waiting on those platforms' own
app review or quota grant — a user may not be able to connect one yet.

Nothing else. Posty's server carries inherited provider code for Reddit,
Mastodon, Pinterest, Discord, Slack, Telegram, Medium and others; none of it is
enabled or supported, and none of it should be offered to a user.

`posty integrations:list` is the ground truth for any given account.

## Posts

### Comments and threads — supported

Repeat `-c`. The first is the post, the rest are its comments in order. Pair
each with its own `-m`.

```bash
A=$(posty upload main.jpg | jq -r '.path')
B=$(posty upload reply.jpg | jq -r '.path')

posty posts:create \
  -c "Main post"    -m "$A" \
  -c "First reply"  -m "$B" \
  -c "Second reply" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

Semicolons in content are fine — there is no delimiter to escape. `-d` sets the
`delay` recorded on each comment.

### Multiple media per post or comment — supported

Comma-separate inside one `-m`. Every value must be a `.path` from
`posty upload`.

### Multi-platform in one command — supported, with one rule

```bash
posty posts:create -c "Content" -s "2026-12-31T12:00:00Z" -i "$X_ID,$FB_ID,$THREADS_ID"
```

**One X channel per post.** A post may not target two X channels, whatever the
content: X's Developer Policy forbids substantially similar content from
multiple accounts through a single developer app, and the developer account at
risk is Posty's, shared by every customer. Split it. Any other combination is
fine.

Different *content* per channel needs JSON mode — the flags send the same value
array to every integration.

### Drafts — supported, and worth using

`-t draft` runs the same validation as a scheduled post without publishing.
Promote it later with `posts:status <id> --status schedule`, or bin it with
`posts:delete`.

**A key without the `posts:publish` scope produces a draft whether you asked
for one or not.** The server coerces `type` rather than refusing, so a script
belonging to a Közreműködő (DRAFTER) quietly makes drafts. Read the `type` in
the response instead of assuming the one you sent.

### Scheduling — required

`-s` is not optional. Every post carries an ISO 8601 date.

## Media

Upload first, always. `-m` takes URLs returned by `posty upload`, never a local
filename or an external URL — several providers only accept Posty-verified
URLs, and a filename produces a post with a broken media reference rather than
an error.

**Eight types, nothing else:** JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF (10 MB
each) and MP4 (1 GB). No MOV, no WebM, no SVG, no PDF, no audio. The server
sniffs magic bytes, so renaming does not work. Full detail and conversion
commands in [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md).

## Per-channel settings

Every channel's fields are in [PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md),
transcribed from the server's validation DTOs. Threads and Bluesky take none at
all. You never have to write `__type` — the server stamps it from the
integration.

## Tools

One channel has one: Instagram's `audioSearch`, for attaching music to a Reel.
Every other supported channel returns an empty `tools` array. See
[INTEGRATION_TOOLS_WORKFLOW.md](./INTEGRATION_TOOLS_WORKFLOW.md).

## Analytics

```bash
posty analytics:platform <integration-id> -d 30
posty analytics:post <post-id> -d 7
```

If `analytics:post` returns `{"missing": true}`, the platform did not hand back
a usable post id at publish time. Resolve it before analytics will work:

```bash
posty posts:missing <post-id>                        # what the provider has
posty posts:connect <post-id> --release-id "<id>"    # link the right one
```

## JSON mode

For anything the flags cannot express — different content per channel, per-comment
media alongside per-channel settings, reusable templates.

```bash
posty posts:create --json campaign.json
```

Templates in [examples/](./examples/).

## What it does not do

- **No AI video generation.** Two routes exist on the API and are rate-limited
  at 10/h. The feature does not work, is not offered, and the CLI does not wrap
  them.
- **No image generation.** Media comes from files the user already has.
- **No channel deletion.** `DELETE /integrations/:id` was deliberately removed
  from the public API — it deleted a channel and every post attached to it,
  irrecoverably, for any key. Disconnecting is a signed-in admin action in the
  web app.
- **No approval workflow, no bulk import, no interactive mode.**
- **Nothing outside the channel list at the top of this page.**

## Limits to design around

Per key, per route, per hour. Each route has its own bucket.

| | |
|---|---|
| Reads | 600/h |
| `posts:create`, `posts:delete`, `posts:status`, `integrations:trigger` | 60/h |
| `analytics:*` | 30/h |
| `upload` | 30/h |

Exceeding one is a `429`. Back off — retrying in a loop spends the next hour
too.
