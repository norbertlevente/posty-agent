# Provider settings — quick reference

The full page, with every field and its accepted values, is
[PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md). This is the one-screen version.

## The channels

Eleven identifiers, and that is the complete list. Posty's server carries
inherited code for many other providers; none are enabled or supported.

| Channel | `__type` | Required settings | Status |
|---|---|---|---|
| X (Twitter) | `x` | `who_can_reply_post` | Publishing verified |
| Facebook | `facebook` | — | Publishing verified |
| Instagram | `instagram` | `post_type` | Publishing verified |
| Instagram standalone | `instagram-standalone` | `post_type` | Publishing verified |
| Threads | `threads` | *no settings at all* | Publishing verified |
| Bluesky | `bluesky` | *no settings at all* | Publishing verified |
| YouTube | `youtube` | `title`, `type` | Coming |
| LinkedIn | `linkedin` | — | Pending LinkedIn's review |
| LinkedIn Page | `linkedin-page` | — | Pending LinkedIn's review |
| TikTok | `tiktok` | `privacy_level`, `content_posting_method` | Pending TikTok's review |
| Google Business Profile | `gmb` | — | Pending Google's quota grant |

## The fields

| Channel | Fields |
|---|---|
| `x` | `who_can_reply_post` **(req)**, `community`, `made_with_ai`, `paid_partnership` |
| `facebook` | `post_type`, `url`, `text_format_preset_id` |
| `instagram`, `instagram-standalone` | `post_type` **(req)**, `collaborators`, `audio`, `is_trial_reel`, `graduation_strategy` |
| `threads`, `bluesky` | none |
| `youtube` | `title` **(req, 2–100)**, `type` **(req)**, `selfDeclaredMadeForKids`, `thumbnail`, `tags` (500 chars total) |
| `linkedin`, `linkedin-page` | `post_as_images_carousel`, `carousel_name` |
| `tiktok` | `title`, `privacy_level`, `content_posting_method`, `duet`, `stitch`, `comment`, `autoAddMusic`, `brand_content_toggle`, `brand_organic_toggle`, `video_made_with_ai` |
| `gmb` | `topicType`, `callToActionType`, `callToActionUrl`, event fields, offer fields |

## Examples

**X**
```bash
posty posts:create -c "Announcement" -s "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' -i "$X_ID"
```

**YouTube** — `-c` is the description; `title` is separate and required.
```bash
VIDEO=$(posty upload video.mp4 | jq -r '.path')
posty posts:create -c "Video description" -s "2026-12-31T12:00:00Z" \
  --settings '{"title":"How to build a CLI","type":"public","tags":[{"value":"tech","label":"Tech"}]}' \
  -m "$VIDEO" -i "$YT_ID"
```

**Instagram story**
```bash
STORY=$(posty upload story.jpg | jq -r '.path')
posty posts:create -c "" -s "2026-12-31T12:00:00Z" \
  --settings '{"post_type":"story"}' -m "$STORY" -i "$IG_ID"
```

**Threads / Bluesky** — no `--settings`.
```bash
posty posts:create -c "Post text" -s "2026-12-31T12:00:00Z" -i "$THREADS_ID"
```

**LinkedIn carousel**
```bash
posty posts:create -c "Product showcase" -m "$A,$B,$C" -s "2026-12-31T12:00:00Z" \
  --settings '{"post_as_images_carousel":true,"carousel_name":"Product launch"}' -i "$LI_ID"
```

**TikTok** — `privacy_level`, not `privacy`. `UPLOAD` does not publish.
```bash
VIDEO=$(posty upload video.mp4 | jq -r '.path')
posty posts:create -c "Caption #fyp" -s "2026-12-31T12:00:00Z" \
  --settings '{"title":"Caption","privacy_level":"PUBLIC_TO_EVERYONE","duet":true,"stitch":true,"comment":true,"autoAddMusic":"no","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"DIRECT_POST"}' \
  -m "$VIDEO" -i "$TT_ID"
```

## Traps

1. **There is no `-p` / `--provider` flag.** Earlier versions of this file used
   one in every example. `posts:create` takes `-c`, `-m`, `-i`, `-s`, `-t`,
   `-d`, `--settings`, `--shortLink` and `--json`. The provider is inferred
   from the integration id.
2. **`-m` takes URLs from `posty upload`,** never a local filename. See
   [SUPPORTED_FILE_TYPES.md](./SUPPORTED_FILE_TYPES.md).
3. **`-s` is required.** Every post needs an ISO 8601 date.
4. **Draft first.** `-t draft` runs the same validation as a scheduled post, so
   a bad settings payload fails now rather than at publish time.
5. **Ask the server, don't trust a document.**
   `posty integrations:settings <id> | jq '.output.settings'` returns the live
   JSON schema generated from the validation DTOs.

## Finding ids

```bash
posty integrations:list
X_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="x") | .id')
```

A channel that is not in that output cannot be posted to. For LinkedIn, TikTok
and Google Business Profile that is the expected state until those platforms
approve the app.
