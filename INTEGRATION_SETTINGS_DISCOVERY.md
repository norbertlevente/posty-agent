# Discovering a channel's settings

`posty integrations:settings <integration-id>` returns, for one connected
channel, the character limit, the provider's publishing rules, the JSON schema
of its `--settings` payload, and its tools.

**Prefer it to any document, including this one.** The schema is generated from
the class-validator DTOs that actually validate the request, so it cannot drift
from what the server will accept.

```bash
posty integrations:settings <integration-id>
```

```
GET /public/v1/integration-settings/:id      scope: channels:read
```

---

## What comes back

```typescript
{
  output: {
    rules: string;                                    // the provider's publishing rules
    maxLength: number;                                // character limit for this channel
    settings: JSONSchema | "No additional settings required";
    tools: Array<{ methodName: string; description: string; dataSchema: any }>;
  }
}
```

Useful slices:

```bash
posty integrations:settings "$ID" | jq '.output.maxLength'
posty integrations:settings "$ID" | jq '.output.settings.required // []'
posty integrations:settings "$ID" | jq '.output.tools'
posty integrations:settings "$ID" | jq -r '.output.rules'
```

---

## Workflow

### 1. List integrations

```bash
posty integrations:list
```

```json
[
  { "id": "…", "name": "@myhandle",     "identifier": "x" },
  { "id": "…", "name": "My Page",       "identifier": "facebook" },
  { "id": "…", "name": "My Channel",    "identifier": "youtube" }
]
```

`identifier` is the provider. It is also the `__type` you write in JSON mode.

**A channel that is not in this list cannot be posted to.** For LinkedIn,
TikTok and Google Business Profile that is the expected state until those
platforms approve Posty's app — the code is complete and waiting on them.

### 2. Read the settings

```bash
posty integrations:settings "$X_ID"
```

```json
{
  "output": {
    "maxLength": 280,
    "settings": {
      "properties": {
        "who_can_reply_post": {
          "enum": ["everyone", "following", "mentionedUsers", "subscribers", "verified"]
        },
        "community": { "pattern": "^(https://x\\.com/i/communities/\\d+)?$" },
        "made_with_ai": { "type": "boolean" },
        "paid_partnership": { "type": "boolean" }
      },
      "required": ["who_can_reply_post"]
    },
    "tools": []
  }
}
```

### 3. Post with what you found

```bash
posty posts:create \
  -c "My post" \
  -s "2026-12-31T12:00:00Z" \
  --settings '{"who_can_reply_post":"everyone"}' \
  -i "$X_ID"
```

---

## Character limits, per channel

Read off the providers' `maxLength()` implementations. Confirm with the command
rather than hard-coding these — they are the current values, not a contract.

| Channel | `maxLength` |
|---|---|
| X (Twitter) | 280 — **4 000 if the account is marked Verified** |
| Facebook | 63 206 |
| Instagram / Instagram standalone | 2 200 |
| Threads | 500 |
| Bluesky | 300 |
| YouTube | 5 000 (this is the video **description**; the `title` setting is capped separately at 100) |
| LinkedIn / LinkedIn Page | 3 000 |
| TikTok | 2 000 (the `title` setting is capped separately at 90) |
| Google Business Profile | 1 500 |

X is the only channel whose limit depends on the account: the server reads a
`Verified` flag from the channel's stored settings, so the same command can
return 280 for one X channel and 4 000 for another.

---

## Which channels have settings at all

| Channel | `settings` |
|---|---|
| X | schema — `who_can_reply_post` required |
| Facebook | schema — all optional |
| Instagram, Instagram standalone | schema — `post_type` required |
| **Threads** | `"No additional settings required"` |
| **Bluesky** | `"No additional settings required"` |
| YouTube | schema — `title` and `type` required |
| LinkedIn, LinkedIn Page | schema — all optional |
| TikTok | schema — `privacy_level` and `content_posting_method` required |
| Google Business Profile | schema — all optional |

Threads and Bluesky are the only two that take nothing. Full field lists are in
[PROVIDER_SETTINGS.md](./PROVIDER_SETTINGS.md).

Those eleven identifiers are the whole supported set. Posty's server carries
inherited code for other providers, none of which are enabled; do not ask for
settings for one.

---

## For an agent

Discover, validate, then post. Handle the "no settings" case — two channels
return a string where you might expect an object.

```bash
#!/bin/bash
ID="$1"
CONTENT="$2"

SETTINGS=$(posty integrations:settings "$ID")

MAX=$(echo "$SETTINGS" | jq -r '.output.maxLength')
if [ "${#CONTENT}" -gt "$MAX" ]; then
  echo "Content is ${#CONTENT} characters; this channel caps at $MAX." >&2
  exit 1
fi

# "No additional settings required" is a STRING, not an object.
if [ "$(echo "$SETTINGS" | jq -r '.output.settings | type')" = "string" ]; then
  echo "No settings needed."
else
  echo "Required: $(echo "$SETTINGS" | jq -c '.output.settings.required // []')"
fi
```

Cache the result. `integrations:settings` is a read at the default allowance
(600/h per key in production), but there is no reason to ask twice for a schema
that changes on deploys, not on posts.

---

## Validating before publish

The surest check is a draft. It runs the same validation as a scheduled post,
so a bad payload fails immediately:

```bash
posty posts:create -c "…" -s "2026-12-31T12:00:00Z" -t draft --settings '…' -i "$ID"
posty posts:status <post-id> --status schedule   # promote it
posty posts:delete <post-id>                     # or bin it
```

---

## Errors

| Response | Cause |
|---|---|
| `404 Integration not found` | Wrong id, or the channel is outside this key's grant |
| `403 … missing the required permission: channels:read` | The key lacks the scope, or its owner's role no longer allows it |
| `401 Invalid API key` | Wrong, revoked or expired key |
| `429` | Rate limit — reads share the default per-key hourly allowance |
