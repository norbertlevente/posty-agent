---
name: posty
description: Posty schedules and publishes social posts from the command line to Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky, Pinterest, Telegram, Discord and Slack, plus Mastodon, Pixelfed, Tumblr, WordPress, Ghost, Dev.to, Google Chat and Microsoft Teams in beta.
homepage: https://posty.hu
metadata: {"openclaw":{"emoji":"🌎","requires":{"bins":[],"env":[]}}}
---

## Install

The npm package is **`posty-cli`**. The command it provides is `posty`. The
bare name `posty` on npmjs.com belongs to an unrelated UK postcode library:
**never run `npm install -g posty`** and never tell a user to.

```bash
npm install -g posty-cli
posty auth:login          # opens the browser to approve the login
```

Website: https://posty.hu. API: https://api.posty.hu (also served at
https://posty.hu/api, the CLI's fallback). MCP server, for chat clients
without a terminal: https://api.posty.hu/mcp-oauth (same account, same
channels). `docs.posty.hu`, `cdn.posty.hu` and `mcp.posty.hu` do not exist.

Details this file only points at (account creation, key scopes, FotoAI,
billing, rate limits, analytics repair) are in
[reference/details.md](./reference/details.md). For writing the post itself
(ideas, hooks, formats, each network's style) use the `posty-writing` skill
when it is installed.

---

## Which channels you can publish to

**Only these. Do not offer a user anything else, and do not try to post to it.**
Posty's server carries inherited code for many more providers; that code is not
enabled and not supported. Posty adds channels over time, so
`posty integrations:list` can show a channel that is newer than this table.

| Channel | `identifier` | Status |
|---|---|---|
| X (Twitter) | `x` | Live |
| Facebook (Pages) | `facebook` | Live |
| Instagram (business account through a Facebook Page) | `instagram` | Live |
| Instagram (professional account, no Facebook Page) | `instagram-standalone` | Live |
| LinkedIn (member feed) | `linkedin` | Live |
| TikTok | `tiktok` | Live |
| YouTube | `youtube` | Live |
| Threads | `threads` | Live |
| Bluesky | `bluesky` | Live |
| Pinterest | `pinterest` | Live (a pin needs a `board` id) |
| Telegram | `telegram` | Live |
| Discord | `discord` | Live |
| Slack | `slack` | Live |
| Mastodon (mastodon.social) | `mastodon` | BETA |
| Mastodon (any other server) | `mastodon-custom` | BETA |
| Pixelfed (any server) | `pixelfed` | BETA |
| Tumblr | `tumblr` | BETA |
| WordPress (your own site) | `wordpress` | BETA |
| Ghost (your own site) | `ghost` | BETA |
| Dev.to | `devto` | BETA |
| Google Chat (a space, by webhook) | `google-chat` | BETA |
| Microsoft Teams (a channel, by webhook) | `microsoft-teams` | BETA |
| Google Business Profile | `gmb` | Coming soon, not schedulable yet |
| LinkedIn Pages (company pages) | `linkedin-page` | Coming soon, not schedulable yet |

**Pinterest is live for everyone** (since 2026-10-27). A pin needs a `board`
id in `--settings`; get the ids with `posty integrations:trigger <id> boards`.

**The BETA channels** connect and publish, but Posty has not tried them with
many real accounts yet. Say so when the user picks one. Several need settings
(a title for WordPress, Dev.to and Ghost); check `integrations:settings` and
PROVIDER_SETTINGS.md.

**Google Business Profile and LinkedIn Pages are coming soon.** Those platforms
have not approved Posty yet, so the user cannot connect them. Personal LinkedIn
profiles (`linkedin`) work today.

**`integrations:list` is the truth.** The table says what Posty supports; that
command says what THIS user has connected. Never post to an id that is not in
its output. If a user asks for Reddit, Medium, Farcaster, VK or anything else
that is not in the table, Posty does not offer it. Do not build a `--settings`
payload for it.

---

## Two hard rules

**Rule 1: Authenticate before anything.** Every command fails without valid
credentials. Run `posty auth:status` first.

**Rule 2: Every file passed to `-m` (or to a media item in `--json`) MUST first
go through `posty upload`.** Local paths (`image.jpg`) and outside URLs
(`https://example.com/...`) are refused by the publishing pipeline. Always:

```bash
MEDIA_PATH=$(posty upload ./photo.jpg | jq -r '.path')
posty posts:create ... -m "$MEDIA_PATH" ...
```

Never name the variable `PATH`: that overwrites the shell's search path, and
the next `posty` call fails with "command not found".

## Output contract

Every command prints its **JSON result, and nothing else, to stdout**; status
lines, warnings and errors go to stderr, and every failure exits 1. So
`posty upload x.jpg | jq -r '.path'` is always safe. Unknown flags are an
error. If a flag is rejected, it does not exist; do not retry with variations.

---

## Authentication

```bash
posty auth:status     # is there a valid sign-in?
posty auth:login      # device login: opens the browser, the human approves
posty auth:logout
```

1. `auth:status` first. If it is not authenticated, run `posty auth:login`.
   The human approves it in the browser and chooses the workspace and the
   channels the key may reach. You never see or handle a key; do not read,
   print or copy the CLI's stored sign-in.
2. `authenticated: true, apiAccess: false, reason: "no-plan"` is a valid key
   of a workspace that has not paid yet. Do not run `auth:login` for it; only
   the `billing:*` commands work until the user subscribes.
3. The user has no account and asks you to make one: `posty auth:signup
   --email <address>`. There is no free trial on such an account. Follow the
   steps in [reference/details.md](./reference/details.md#creating-an-account)
   (the e-mailed code, the terms the user must accept themselves, the plan).

**401** means the sign-in is invalid: `auth:login`. **403** means the key is
valid but may not do this (a missing scope, the owner's current role, or a
channel or workspace outside the key's grant). The message names the reason.
Do not retry and do not log in again; ask the user for a key with that access.
Details: [reference/details.md](./reference/details.md#what-a-key-can-do).

---

## Workflow

Do these steps in this order for every post.

1. **Authenticate.** `posty auth:status` (see above).
2. **Workspace.** `posty workspaces:list`. If there is more than one and none
   is `current`, ask the user which one, then `posty workspaces:use <id>`.
   Channel ids belong to a workspace.
3. **Discover.** `posty integrations:list` for the channel ids, then
   `posty integrations:settings <id>` for each channel: its `maxLength`, its
   required settings and its `tools`.
4. **Fetch.** If a setting needs an id (a Pinterest board, a Discord or Slack
   channel, Instagram audio), get it with `posty integrations:trigger`.
5. **Prepare media.** `posty upload <file>` for each file (Rule 2), or an
   upload link when the file is not on this machine.
6. **Write.** One text per channel, within its `maxLength` and its rules. If
   a text is too long, rewrite it shorter and show the user. Never cut it off.
7. **Confirm.** Show the user, for each channel: the account (name and
   handle), the full text, the media, and the publish time in the user's
   LOCAL time. Wait for a clear yes. If anything is unclear, or the user is
   not there to answer, save it with `-t draft` instead and say so.
8. **Post.** `posty posts:create ...` with exactly what the user approved.
9. **Check the result.** Read the `type` that came back (a key without
   `posts:publish` makes a draft) and the `notices` (links removed from X,
   24 hour caps). Tell the user both.
10. **Follow up.** `posty posts:get <id>` to see one post; `posty posts:list`
    for the calendar; analytics later.

```bash
# 1. Authenticate
posty auth:status

# 3. Discover
posty integrations:list
posty integrations:settings <integration-id>

# 5. Prepare media (upload first, always)
MEDIA_PATH=$(posty upload ./photo.jpg | jq -r '.path')

# 7. Confirm with the user: account, text, media, local time. Then:

# 8. Post, at a local wall clock time
posty posts:create -c "Content" -m "$MEDIA_PATH" \
  -s "2026-12-31 09:00" --timezone Europe/Budapest -i "<integration-id>"

# 9. Read "type" and "notices" in the JSON it printed, and tell the user.
```

---

## Workspaces

A key may reach several workspaces. Then the API refuses every request that
does not name one ("This API key spans several workspaces").

```bash
posty workspaces:list            # [{id, name, role, current}]
posty workspaces:use <id>        # persists; every later command acts there
posty workspaces:current
posty integrations:list --workspace <id>   # one command elsewhere, without switching
```

Say the workspace name back when the user has more than one, and never pick
one for them. After a switch, run `integrations:list` again.

---

## Media

### Upload

```bash
posty upload ./photo.jpg
# → {"path":"https://posty.hu/uploads/2026/08/abc123.jpg","size":123456,"type":"image/jpeg"}
```

Exactly eight types are accepted; anything else is `400 Unsupported file type`.
The server reads the file's bytes, so renaming does not help.

- Images (max 10 MB): JPEG, PNG, GIF, WEBP, AVIF, BMP, TIFF.
- Video (max 1 GB): MP4 only. Convert a MOV first:
  `ffmpeg -i clip.mov -c:v libx264 -c:a aac clip.mp4`.
- Not accepted: MOV, MKV, WEBM, AVI, SVG, PDF, documents, audio. See
  SUPPORTED_FILE_TYPES.md.

### Upload link: the file is not on this machine

When the file is on the user's phone, or you cannot see their files, do not
ask them to host it somewhere public. Make a link:

```bash
posty upload:link
# → {"id":"kR3mQ7xP2nLa","url":"https://posty.hu/feltoltes/…","expiresAt":"…"}
```

Show the `url` to the user as it is: open it, drop the image or video, then
tell me it is done. It works signed out and on a phone. Then:

```bash
posty upload:files kR3mQ7xP2nLa
# → {"status":"ready","count":1,"files":[{"id":"…","name":"clip.mp4","path":"https://…","type":"video"}]}
```

Pass each `path` to `-m`. `status: "empty"` means the upload has not finished:
ask the user to check that the page says "uploaded", then run it again. The
link lives two hours.

### Alt text

`--alt <text>` (repeat it) gives alt text to the media of the post itself (the
first `-c`), in the same order as `-m`. In `--json`, put `"alt"` on the media
item. Write alt text that says what the picture shows; ask the user when you
cannot see the picture.

```bash
posty posts:create -c "Our new shop" -m "$IMG1,$IMG2" \
  --alt "The shop front at night" --alt "The counter with fresh bread" \
  -s "2026-12-31 09:00" --timezone Europe/Budapest -i "$IG_ID"
```

### Video covers

| Flag | What it does | Where it works |
|---|---|---|
| `--cover-frame <seconds>` | the moment of the post's first video to show as the cover (e.g. `2.5`) | Instagram and TikTok. TikTok takes a frame only, and only with `content_posting_method: DIRECT_POST` |
| `--cover-image <url>` | a separate cover picture; the URL must come from `posty upload` | Instagram only; it wins over `--cover-frame` there |

Both apply to the first video of the post itself, never to a comment. With
`--json` these flags are refused; set the fields on the video's media item
instead: `"thumbnailTimestamp"` (milliseconds) and/or `"thumbnail"` (the
cover picture URL).

### Images and videos made for the user

Posty itself generates no text, images or video. Media is the user's own
files. When the user asks for a picture or a video to be made, the `fotoai:*`
commands can make one with the user's OWN FotoAI (fotoai.hu) account and
credits, after the user agrees to the price: see
[reference/details.md](./reference/details.md#fotoai-images-and-videos).

---

## Creating posts

```bash
# Scheduled, local time (date required unless -t now)
posty posts:create -c "Content" -s "2026-12-31 12:00" --timezone Europe/Budapest -i "<id>"

# Draft (nothing is published; safe when the user has not confirmed)
posty posts:create -c "Content" -s "2026-12-31T12:00:00Z" -t draft -i "<id>"

# Publish now
posty posts:create -c "Content" -t now -i "<id>"

# Several images (upload each first)
IMG1=$(posty upload img1.jpg | jq -r '.path')
IMG2=$(posty upload img2.jpg | jq -r '.path')
posty posts:create -c "Content" -m "$IMG1,$IMG2" -s "2026-12-31T12:00:00Z" -i "<id>"

# Same text on several channels
posty posts:create -c "Content" -s "2026-12-31T12:00:00Z" -i "$FB_ID,$THREADS_ID,$BSKY_ID"

# Channel settings
posty posts:create -c "Content" -s "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "$X_ID"

# Different text per channel, or anything complex
posty posts:create --json post.json
```

### Threads and comments

Each extra `-c` is one more entry, with its own `-m`. On X, Threads and
Bluesky the entries form a THREAD; on LinkedIn and Facebook they are COMMENTS
under the post. On thread platforms, ask the user whether they want a thread
or one long post. `-d` is the delay between entries, in minutes.

```bash
INTRO=$(posty upload intro.jpg | jq -r '.path')
P1=$(posty upload point1.jpg | jq -r '.path')
posty posts:create \
  -c "Three things we learned this year (1/3)" -m "$INTRO" \
  -c "One: ... (2/3)" -m "$P1" \
  -c "The short version: ... (3/3)" \
  -s "2026-12-31T12:00:00Z" -d 5 -i "$X_ID"
```

Do not put a comment after a line continuation (`\  # note`): the shell then
ends the command there and the rest is lost. Put notes on their own line.

### JSON mode

`--json` takes the API's real request body: `type`, `date`, `shortLink`,
`tags`, and a `posts` array where each element has an `integration` (`{id}`),
its `value` (the entries: `content` and `image`, the media items) and its
`settings`. There is no `provider` key and no `post` key. Working files are in
[examples/](https://github.com/norbertlevente/posty-agent/tree/main/examples).

```json
{
  "type": "schedule",
  "date": "2026-12-01T09:00:00Z",
  "shortLink": false,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "<youtube-id>" },
      "value": [
        {
          "content": "Video description",
          "image": [
            { "id": "v1", "path": "<.path from posty upload>", "alt": "What the video shows", "thumbnailTimestamp": 2500 }
          ]
        }
      ],
      "settings": {
        "title": "Video title",
        "type": "public",
        "selfDeclaredMadeForKids": "no",
        "tags": [{ "value": "tech", "label": "Tech" }]
      }
    },
    {
      "integration": { "id": "<facebook-id>" },
      "value": [{ "content": "A longer text for Facebook", "image": [] }],
      "settings": { "post_type": "post" }
    }
  ]
}
```

You never write `__type` yourself: the server sets it from the channel and
overwrites what you sent. Channels with no settings (Threads, Bluesky,
Telegram, Mastodon, Pixelfed, Google Chat, Teams) take `{}`.

---

## Changing posts after they are made

```bash
posty posts:get <id>                       # one post in full
posty posts:update <id> -c "..." [-m ...] [--alt "..."] [-s date --timezone TZ] [-t schedule|draft|now] [--settings JSON]
posty posts:update <id> --json change.json # {date, type, settings, posts:[{content, attachments, altText, cover}]}
posty posts:reschedule <id...> -s "2026-12-31 10:00" --timezone Europe/Budapest
posty posts:retry <id...> [-s date] [--confirmed]
posty posts:status <id> --status draft     # back to draft; stops a running publish
posty posts:status <id> --status schedule  # queue a draft at its stored date
posty posts:delete <id>                    # one channel of a group, before it publishes
posty posts:delete-group <group>           # every channel of a group (group from posts:list)
```

- **`posts:get`** shows one channel's post in full: every entry with its
  attachments and their alt text, the video cover, the settings, the tags, the
  state, the publish time and, for a failed post, the reason.
- **`posts:update`** changes a scheduled, draft or failed post. Send EVERY
  entry again as `-c`, like `posts:create`, not only the changed one.
  Attachments keep their alt text and cover unless you give new ones; tags are
  kept. Without `-s` it keeps the post's time. Without `-t` a draft stays a
  draft and anything else is scheduled. A published post is refused. Saving a
  failed post schedules it again. Run `posts:get` first, and confirm the
  change with the user as in the Workflow.
- **`posts:reschedule`** changes only the time of one or more posts. A draft
  stays a draft. A failed post is not rescheduled: use `posts:retry`.
- **`posts:retry`** asks Posty to try failed posts again. Posty decides per
  post: a temporary failure is retried at once; a platform limit not before
  the limit can have passed; a disconnected channel only after the user
  reconnects it. Content the platform refused is NOT retried: fix it with
  `posts:update`. When the post may already be live, or the account has a
  problem, the answer says so: ask the user, then run it again with
  `--confirmed`. Several posts are spread two minutes apart. Tell the user the
  result for each post.

---

## Dates

**Always pass an explicit offset, or `--timezone` with an IANA name.** The
server reads a date without an offset as UTC, which would move a Hungarian
"12:00" by one or two hours, so the CLI refuses such a date.

```bash
-s "2026-12-31T12:00:00Z"                          # explicit UTC
-s "2026-12-31 12:00" --timezone Europe/Budapest   # wall clock plus IANA zone
```

Order of resolution: an offset in the string; then `--timezone`; then the saved
setting (`posty config:set timezone Europe/Budapest`, offered during
`auth:login` on a terminal); otherwise exit 1. Off a terminal (when you run
it) the CLI never asks for a timezone.

- Timezone values are IANA names (`Europe/Budapest`, `UTC`). Numeric offsets
  (`+02:00`, `UTC+2`, `Etc/GMT+2`) are refused. Never compute summer time by
  hand; give the IANA name and let the CLI convert.
- When a timezone is applied, stderr shows the UTC result:
  `Interpreted "2026-12-24 18:00" as Europe/Budapest (via --timezone) → 2026-12-24T17:00:00.000Z`.
- A bare date (`"2026-12-31"`) is midnight in the resolved timezone.
- `posty posts:find-slot <integration-id>` returns `{"date": "..."}`, the next
  free slot on that channel; pass it to `-s`.
- `-t now` needs no date. `posts:list --startDate/--endDate` take the same
  forms; the default is 30 days back to 30 days forward.
- `posty config:get` shows what is saved; settings survive `auth:logout`.

---

## Integration tools

Some channels have a tool for data that cannot be written by hand. Read the
`tools` array from `integrations:settings` first; its `methodName` is the only
string `integrations:trigger` accepts. Never guess a method name.

| Channel | Tool | The result goes into |
|---|---|---|
| Instagram (`instagram`) | `audioSearch` (`{"q":"lofi","type":"music"}`; an empty `q` gives trending audio) | `settings.audio.id` |
| Pinterest (`pinterest`) | `boards` | `settings.board` |
| Discord (`discord`) | `channels` | `settings.channel` |
| Slack (`slack`) | `channels` | `settings.channel` |
| X, Facebook, Instagram without a Page, Threads, Bluesky, YouTube, LinkedIn, TikTok, Telegram | none | |

For the beta channels (WordPress and Dev.to have some), read `tools` from
`integrations:settings`. A method that
does not exist answers `404 Tool not found`. There is no `getPlaylists`,
`getCompanies`, `getBoards` or `getFlairs`.

```bash
PIN_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="pinterest") | .id')
posty integrations:trigger "$PIN_ID" boards | jq '.output'
```

---

## Behaviours that surprise people

1. **A key without `posts:publish` makes a draft.** `posts:create` needs only
   `posts:draft`. If the key (or its owner's current role) lacks
   `posts:publish`, the server saves a draft instead of refusing. Read back
   the `type` you got. If the user wanted it published, tell them the key
   cannot do it; do not report success.
2. **One X channel per post.** A post may not go to two X channels. X's rules
   forbid the same content from several accounts through one app, and the app
   at risk is Posty's, shared by every customer. Make two posts. X together
   with Facebook, Instagram and the rest is fine.
3. **X posts lose their links.** X charges for every post with a link, so
   Posty removes links from X posts and their threads before saving. Do not
   put links into X posts. If the user wants to share a link on X, tell them
   to post it on X themselves.
4. **Read `notices` in every `posts:create` result and tell the user.** It
   lists the links that were removed, and the 24 hour caps: some platforms
   accept only so many posts from one account in 24 hours (YouTube about 10,
   TikTok about 15). Past the cap, offer to spread the posts over more days.
5. **HTTP 402: the monthly X quota is used up.** The workspace has a monthly
   number of X posts (each thread entry counts as one). When it is used up, X
   posts can only be saved as drafts until the reset date the message gives.
   Say so, offer `-t draft`, and do not retry.

---

## Patterns

### Instagram Reel with music and a cover

```bash
IG_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="instagram") | .id')
AUDIO_ID=$(posty integrations:trigger "$IG_ID" audioSearch -d '{"q":"lofi","type":"music"}' | jq -r '.output[0].id')
VIDEO=$(posty upload reel.mp4 | jq -r '.path')
COVER=$(posty upload cover.jpg | jq -r '.path')

posty posts:create -c "Reel caption" -m "$VIDEO" --cover-image "$COVER" \
  --settings "{\"post_type\":\"post\",\"audio\":{\"id\":\"$AUDIO_ID\"}}" \
  -s "2026-12-31 18:00" --timezone Europe/Budapest -i "$IG_ID"
```

### A TikTok video with a cover frame

```bash
VIDEO=$(posty upload clip.mp4 | jq -r '.path')
posty posts:create -c "Caption" -m "$VIDEO" --cover-frame 2.5 \
  --settings '{"privacy_level":"PUBLIC_TO_EVERYONE","content_posting_method":"DIRECT_POST"}' \
  -s "2026-12-31 18:00" --timezone Europe/Budapest -i "$TIKTOK_ID"
```

### Check the length before posting

```bash
MAX_LENGTH=$(posty integrations:settings "$X_ID" | jq '.output.maxLength')
if [ ${#CONTENT} -gt "$MAX_LENGTH" ]; then
  echo "Too long: ${#CONTENT} of $MAX_LENGTH characters" >&2
  # Rewrite the text shorter and show the new version to the user.
  # Never cut it off: a truncated post goes out broken.
fi
```

### A week of posts

Get real future dates from the user or from `posts:find-slot`; never reuse
dates from an example. Confirm the whole list with the user first.

```bash
CONTENT=("Monday text" "Tuesday text" "Wednesday text")
for i in "${!CONTENT[@]}"; do
  DATE=$(posty posts:find-slot "$X_ID" | jq -r '.date')
  IMG=$(posty upload "post-${i}.jpg" | jq -r '.path')
  posty posts:create -c "${CONTENT[$i]}" -m "$IMG" -s "$DATE" -i "$X_ID"
done
```

### After an error, look before you run it again

`posts:create` sends an `Idempotency-Key` and, after a network failure or a
5xx, retries ONCE with the same key, so the server returns the post it already
made. Running the command again is a NEW post. Never wrap `posts:create` in a
retry loop:

```bash
if ! posty posts:create -c "$CONTENT" -s "$DATE" -i "$ID"; then
  posty posts:list --startDate "$DATE" --endDate "$DATE"   # did it get through?
fi
```

A 403 for a missing permission, a 401 for a workspace with no plan, and a 402
for the X quota are not retryable. A 429 means a rate limit: wait, do not loop.

---

## Platform settings

Every field below comes from the server's validation. A field that is not
listed does not exist, and sending it is a `400`. All channels:
[PROVIDER_SETTINGS.md](https://github.com/norbertlevente/posty-agent/blob/main/PROVIDER_SETTINGS.md).

- **X (`x`):** `who_can_reply_post` **required**: `everyone`, `following`,
  `mentionedUsers`, `subscribers` or `verified`. Optional: `community`
  (`https://x.com/i/communities/<digits>`), `made_with_ai`, `paid_partnership`.
- **Facebook (`facebook`):** all optional: `post_type` (`post` or `story`),
  `url`, `text_format_preset_id` (a background for a text only post; Pages
  only, about 130 characters).
- **Instagram (`instagram`, `instagram-standalone`):** `post_type`
  **required** (`post` or `story`). Optional: `collaborators` (`[{label}]`),
  `audio` (`{id, ...}` from `audioSearch`), `is_trial_reel`,
  `graduation_strategy` (`MANUAL` or `SS_PERFORMANCE`).
- **TikTok (`tiktok`):** `privacy_level` and `content_posting_method`
  **required**.
- **YouTube (`youtube`):** `title` and `type` **required**.
- **Pinterest (`pinterest`):** `board` **required** (from the `boards` tool);
  optional `title` (up to 100 characters) and `link`.
- **Discord, Slack:** `channel` **required** (from the `channels` tool).
- **WordPress:** `title` and `type` **required**. **Dev.to, Ghost:** `title`
  **required**. Read the rest from `integrations:settings`.
- **Threads, Bluesky, Telegram, LinkedIn:** nothing required.

---

## Analytics

```bash
posty analytics:platform <integration-id> -d 30   # the channel, last 30 days (default 7)
posty analytics:post <post-id> -d 7               # one post
```

Each returns metrics (followers, impressions, likes, comments) with daily
values and the change over the period. If `analytics:post` returns
`{"missing": true}`, the platform did not give back the post's id (TikTok
often does this). The fix (`posts:missing`, then `posts:connect`) is in
[reference/details.md](./reference/details.md#when-analytics-says-missing).

---

## What Posty does NOT do

State these plainly rather than trying a workaround.

- **No AI writing, images or video of its own.** You write the text; media is
  the user's own files, or FotoAI output paid with the user's own FotoAI
  credits when they ask for it. The old `/generate-video` routes were removed
  and answer 404.
- **No channel connecting or deleting.** The user connects and disconnects
  channels in the web app.
- **No changes to a published post.** `posts:update` refuses it, and Posty
  cannot remove a post from a platform once it is live.
- **Nothing outside the channel table above.**

---

## Quick reference

```bash
# Authentication (first, always)
posty auth:status
posty auth:login
posty auth:signup --email <address>               # new account; no free trial
posty auth:logout

# Settings (survive logout)
posty config:set timezone Europe/Budapest
posty config:get

# Workspaces and discovery
posty workspaces:list
posty workspaces:use <id>
posty integrations:list [--group <group-id>]
posty integrations:groups
posty integrations:settings <id>
posty integrations:trigger <id> <method> -d '{}'

# Media
posty upload <file>                               # → {path}; use the path in -m
posty upload:link                                 # file on the user's phone
posty upload:files <link-id>

# Posting (date: explicit offset or --timezone; not needed with -t now or --json)
posty posts:create -c "text" -s "2026-12-31 08:00" --timezone Europe/Budapest -i "<id>"
posty posts:create -c "text" -s "2026-12-31T12:00:00Z" -t draft -i "<id>"
posty posts:create -c "text" -t now -i "<id>"
posty posts:create -c "text" -m "$MEDIA_PATH" --alt "What it shows" -s "..." -i "<id>"
posty posts:create -c "main" -c "thread entry or comment" -s "..." -i "<id>"
posty posts:create -c "text" -m "$VIDEO" --cover-frame 2.5 -s "..." -i "<id>"       # Instagram, TikTok
posty posts:create -c "text" -m "$VIDEO" --cover-image "$COVER" -s "..." -i "<id>"  # Instagram
posty posts:create -c "text" -s "..." --settings '{"key":"value"}' -i "<id>"
posty posts:create --json file.json

# Managing posts
posty posts:list [--startDate ... --endDate ...]
posty posts:get <id>
posty posts:update <id> -c "every" -c "entry" [-m ...] [--alt ...] [-s ...] [-t ...]
posty posts:reschedule <id...> -s "..." --timezone Europe/Budapest
posty posts:retry <id...> [-s ...] [--confirmed]
posty posts:find-slot <integration-id>
posty posts:status <id> --status draft|schedule
posty posts:delete <id>
posty posts:delete-group <group>

# Analytics
posty analytics:platform <id> -d 30
posty analytics:post <id>
posty posts:missing <id>                          # when analytics says {"missing": true}
posty posts:connect <id> --release-id "<rid>"

# More (see reference/details.md)
posty billing:plans | billing:subscribe | billing:status | billing:manage
posty fotoai:status | fotoai:models | fotoai:generate | fotoai:get

# Help
posty --help
posty posts:create --help
```

---

## Supporting files

- [reference/details.md](./reference/details.md): account creation, key
  scopes, FotoAI, billing, rate limits, the analytics repair.
- PROVIDER_SETTINGS.md: the settings of every channel.
- SUPPORTED_FILE_TYPES.md: the eight accepted media types.
- HOW_TO_RUN.md: installing and running the CLI.
- examples/: ready `--json` files (threads, several channels, YouTube, TikTok).
- The `posty-writing` skill: ideas, hooks, formats and a check before
  publishing.
