# Provider-specific settings

Every channel Posty supports, and every field its `--settings` payload accepts.

**The channels below are the whole list.** Posty's server carries inherited
code for many other providers — Reddit, Mastodon, Pinterest, Medium, Dev.to,
Hashnode, WordPress, Lemmy, Nostr, VK, Tumblr, Dribbble, Farcaster and others.
None of them are enabled or supported. Do not build a settings payload for one.

| Channel | `__type` | Has settings? | Status |
|---|---|---|---|
| X (Twitter) | `x` | yes | Publishing verified |
| Facebook | `facebook` | yes, all optional | Publishing verified |
| Instagram | `instagram` | yes | Publishing verified |
| Threads | `threads` | **no** | Publishing verified |
| Bluesky | `bluesky` | **no** | Publishing verified |
| LinkedIn | `linkedin` | yes, all optional | Publishing verified |
| Telegram | `telegram` | **no** | Publishing verified |
| Discord | `discord` | yes, `channel` required | Publishing verified |
| Slack | `slack` | yes, `channel` required | Publishing verified |
| YouTube | `youtube` | yes | Approved by Google, quota-limited |
| TikTok | `tiktok` | yes | Pending TikTok's app review |

Source of truth for everything on this page:
`libraries/nestjs-libraries/src/dtos/posts/providers-settings/*.ts` in the Posty
server. If this file and a DTO disagree, the DTO is right — and the
`integrations:settings` route serves those DTOs as live JSON schema, so you can
always ask instead of trusting a document:

```bash
posty integrations:settings <integration-id> | jq '.output.settings'
```

---

## How to pass settings

### Command line

```bash
posty posts:create \
  -c "Your content" \
  -s "2026-12-31T12:00:00Z" \
  --settings '<json>' \
  -i "<integration-id>"
```

The backend fills in `__type` from the integration's provider. You do not send
it on the command line.

### JSON file

```bash
posty posts:create --json post.json
```

```json
{
  "type": "schedule",
  "date": "2026-12-31T12:00:00Z",
  "shortLink": false,
  "tags": [],
  "posts": [{
    "integration": { "id": "<youtube-integration-id>" },
    "value": [{ "content": "Video description", "image": [{ "id": "…", "path": "https://…" }] }],
    "settings": {
      "__type": "youtube",
      "title": "Video title",
      "type": "public",
      "tags": [{ "value": "tech", "label": "Tech" }]
    }
  }]
}
```

You do not have to write `__type` even here: the server stamps it from the
integration's provider before validating, overwriting whatever you sent. Write
it for readability if you like — a stale or wrong value cannot break the
request, because it is replaced, not checked.

**Two behaviours worth knowing before you publish:**

- **A key without the `posts:publish` scope produces a draft, not a refusal.**
  `posts:create` needs only `posts:draft`; without `posts:publish` the server
  coerces `type` to `draft` and creates one. Read back the `type` in the
  response rather than assuming the one you sent.
- **One X channel per post.** A single post may not target two X channels,
  whatever the content — X's Developer Policy forbids it and the developer
  account at risk is Posty's, shared by every customer. Any other combination
  of channels is fine.

---

## X (Twitter) — `x`

| Field | Required | Values |
|---|---|---|
| `who_can_reply_post` | **yes** | `everyone`, `following`, `mentionedUsers`, `subscribers`, `verified` |
| `community` | no | A community URL matching `https://x.com/i/communities/<digits>`, or empty string |
| `made_with_ai` | no | boolean |
| `paid_partnership` | no | boolean |

```bash
posty posts:create \
  -c "Announcement" \
  -s "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' \
  -i "$X_ID"
```

A malformed `community` fails validation with the expected format in the
message. Anything other than the five reply values is a `400`.

---

## Facebook — `facebook`

All fields optional.

| Field | Values |
|---|---|
| `post_type` | `post`, `story` |
| `url` | A URL to attach |
| `text_format_preset_id` | A Facebook background preset id |

`text_format_preset_id` applies to **text-only posts on Pages** and caps at
about 130 characters. Facebook exposes no API to enumerate the presets, so the
server carries a hardcoded catalogue; the ids are opaque strings.

```bash
IMG=$(posty upload photo.jpg | jq -r '.path')
posty posts:create -c "Post text" -s "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"post"}' -m "$IMG" -i "$FB_ID"
```

---

## Instagram — `instagram`

| Field | Required | Values |
|---|---|---|
| `post_type` | **yes** | `post`, `story` |
| `collaborators` | no | array of `{ "label": "<username>" }` |
| `audio` | no | `{ id, title?, artist?, image?, audio_volume?, video_volume? }` — volumes 0–100 |
| `is_trial_reel` | no | boolean |
| `graduation_strategy` | no | `MANUAL`, `SS_PERFORMANCE` |

`audio.id` comes from the `audioSearch` tool — the only tool any supported
channel has:

```bash
posty integrations:trigger "$IG_ID" audioSearch -d '{"q":"lofi","type":"music"}'
# type is "music" (default) or "original_sound"; an empty q returns trending audio
```

```bash
STORY=$(posty upload story.jpg | jq -r '.path')
posty posts:create -c "" -s "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"story"}' -m "$STORY" -i "$IG_ID"
```

---

## Threads — `threads`

**No settings.** Omit `--settings`. There are no fields to send and inventing
one is a `400`.

```bash
posty posts:create -c "Post text" -s "2026-12-31T12:00:00Z" -i "$THREADS_ID"
```

---

## Bluesky — `bluesky`

**No settings.** Same as Threads.

---

## YouTube — `youtube`

| Field | Required | Values |
|---|---|---|
| `title` | **yes** | 2–100 characters |
| `type` | **yes** | `public`, `private`, `unlisted` |
| `selfDeclaredMadeForKids` | no | `yes`, `no` |
| `thumbnail` | no | A media object from `posty upload` |
| `tags` | no | array of `{ value, label }` |

The post's `-c` content becomes the **video description**. `title` is separate
and is the video's title.

**The tag budget is 500 characters in total across every tag**, not per tag.
A tag containing whitespace costs two extra characters against that budget,
because YouTube wraps it in quotes. Over the budget is a `400` naming the
limit.

There is **no `playlistId` field** and no way to add a video to a playlist
through the API. Earlier documentation claimed otherwise.

```bash
VIDEO=$(posty upload video.mp4 | jq -r '.path')
posty posts:create \
  -c "Full video description…" \
  -s "2026-12-31T12:00:00Z" \
  --settings '{"title":"How to build a CLI","type":"public","selfDeclaredMadeForKids":"no","tags":[{"value":"tech","label":"Tech"},{"value":"tutorial","label":"Tutorial"}]}' \
  -m "$VIDEO" \
  -i "$YT_ID"
```

Only MP4 uploads. See [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md).

---

## LinkedIn — `linkedin`

*Connecting a LinkedIn channel is pending LinkedIn's app review. The code is
complete; a user may not be able to connect one yet. Check
`integrations:list`.*

Both fields optional.

| Field | Values |
|---|---|
| `post_as_images_carousel` | boolean |
| `carousel_name` | string |

There is **no `companyId`**. Posting as a company page is a separate connected
channel with identifier `linkedin-page`, chosen at connect time — not a setting
on a personal post.

```bash
posty posts:create -c "Content" -s "2026-12-31T12:00:00Z" \
  --settings '{"post_as_images_carousel":true,"carousel_name":"Product launch"}' \
  -m "$A,$B,$C" -i "$LI_ID"
```

---

## TikTok — `tiktok`

*Pending TikTok's app review.*

| Field | Required | Values |
|---|---|---|
| `title` | no | ≤ 90 characters |
| `privacy_level` | **yes for `DIRECT_POST`** | `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` |
| `content_posting_method` | **yes** | `DIRECT_POST`, `UPLOAD` |
| `duet` | yes | boolean — video only, `DIRECT_POST` only |
| `stitch` | yes | boolean — video only, `DIRECT_POST` only |
| `comment` | yes | boolean — `DIRECT_POST` only |
| `autoAddMusic` | yes | `yes`, `no` — photo posts only, `DIRECT_POST` only |
| `brand_content_toggle` | yes | boolean — `DIRECT_POST` only |
| `brand_organic_toggle` | yes | boolean — `DIRECT_POST` only |
| `video_made_with_ai` | no | boolean — video only, `DIRECT_POST` only |

The field is `privacy_level`. Earlier documentation called it `privacy`; that
name is silently ignored, which is worse than an error.

**`UPLOAD` does not publish.** It sends the media to the user's TikTok app
inbox as a draft, which they must finish and publish by hand within 24 hours or
it is discarded — and TikTok ignores every setting above except `title`. Only
use it when the user explicitly asks to finish the post inside the TikTok app.

**`privacy_level` deliberately has no default.** TikTok's Content Sharing
Guidelines require the person posting to choose it. Ask the user; do not pick
one on their behalf.

```bash
VIDEO=$(posty upload video.mp4 | jq -r '.path')
posty posts:create \
  -c "Caption #fyp" \
  -s "2026-12-31T12:00:00Z" \
  --settings '{"title":"Caption","privacy_level":"PUBLIC_TO_EVERYONE","duet":true,"stitch":true,"comment":true,"autoAddMusic":"no","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}' \
  -m "$VIDEO" \
  -i "$TT_ID"
```

---

## Telegram — `telegram`

**No settings.** Same as Threads. The channel is fixed when the user connects
it in Posty (one shared bot posts into the channel or group they chose).

---

## Discord — `discord`

| Field | Values |
|---|---|
| `channel` | **required** — a channel id from the `channels` tool |

Get the id first; a channel name is a `400`:

```bash
posty integrations:trigger "$DISCORD_ID" channels -d '{}' | jq '.output'
posty posts:create -c "Release notes are out" -s "2026-12-31T12:00:00Z" \
  --settings '{"channel":"123456789012345678"}' -i "$DISCORD_ID"
```

---

## Slack — `slack`

| Field | Values |
|---|---|
| `channel` | **required** — a channel id from the `channels` tool |

Same shape as Discord:

```bash
posty integrations:trigger "$SLACK_ID" channels -d '{}' | jq '.output'
posty posts:create -c "Release notes are out" -s "2026-12-31T12:00:00Z" \
  --settings '{"channel":"C0123456789"}' -i "$SLACK_ID"
```

---

## Finding your integration ids

```bash
posty integrations:list
# [{ "id": "…", "name": "…", "identifier": "instagram", … }]

X_ID=$(posty integrations:list  | jq -r '.[] | select(.identifier=="x")        | .id')
IG_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="instagram")| .id')
YT_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="youtube")  | .id')
```

`identifier` is the provider; `__type` in JSON mode is the same string.

If a channel is not in `integrations:list`, the user cannot post to it. For
LinkedIn, TikTok and Google Business Profile that is the expected state until
those platforms approve the app — say so rather than scheduling a post that
will fail.

---

## Validating before you publish

Post as a draft first. A draft goes through the same validation as a scheduled
post, so a bad settings payload fails immediately instead of at publish time:

```bash
posty posts:create -c "…" -s "2026-12-31T12:00:00Z" -t draft --settings '…' -i "$ID"
```

Then promote it, or delete it:

```bash
posty posts:status <post-id> --status schedule
posty posts:delete <post-id>
```
