# Integration tools workflow

A "tool" is a method a provider exposes so you can fetch data that cannot be
hard-coded — an id you have to look up before you can put it in a settings
payload. `integrations:settings` lists them; `integrations:trigger` calls them.

## Read this before you plan around a tool

**Of the channels Posty supports, exactly one has a tool.**

| Channel | Tools |
|---|---|
| Instagram (`instagram`) | `audioSearch` |
| Instagram standalone, X, Facebook, Threads, Bluesky, YouTube, LinkedIn, LinkedIn Page, TikTok, Google Business Profile | *none* |

That is the whole table. For every channel in the second row,
`integrations:settings` returns `"tools": []` and `integrations:trigger`
returns `404 Tool not found` whatever you pass it.

An earlier version of this document described `getFlairs`, `searchSubreddits`,
`getSubreddits`, `getPlaylists`, `getCategories`, `getChannels`,
`getCompanies`, `getOrganizations`, `getListsowned`, `getCommunities`,
`getBoards` and `getBoardSections`, with sample output for several of them.
**None of those methods exist**, on any provider, under any name. If you are
following a plan that calls one, the plan is wrong.

There is also no `playlistId` on YouTube and no `companyId` on LinkedIn, so the
lookups those fabricated tools existed to serve had nowhere to put their answer
in the first place.

---

## The workflow

### 1. List integrations

```bash
posty integrations:list
```

Gives you the ids, and — for LinkedIn, TikTok and Google Business Profile,
which are pending platform approval — tells you whether the channel is
connectable at all yet.

### 2. Read the channel's settings and tools

```bash
posty integrations:settings <integration-id>
```

Returns:

| Key | What it is |
|---|---|
| `rules` | The provider's own publishing rules, as text |
| `maxLength` | Character limit for this channel (higher if the account is verified) |
| `settings` | JSON schema generated from the server's validation DTO, or the string `"No additional settings required"` |
| `tools` | Array of `{ methodName, description, dataSchema }` — usually empty |

**This route is the source of truth, not any document including this one.** The
schema is generated from the DTOs that validate the request, so it cannot drift
from what the server accepts.

```bash
posty integrations:settings "$ID" | jq '.output.tools'
posty integrations:settings "$ID" | jq '.output.maxLength'
```

### 3. Call a tool, if there is one

```bash
posty integrations:trigger <integration-id> <methodName>
posty integrations:trigger <integration-id> <methodName> -d '{"key":"value"}'
```

`methodName` must be a string that appeared in the `tools` array. The server
checks it against that list before dispatching, so a guessed name is a `404`,
never an accidental call.

### 4. Use the result in the post

---

## The one real example: Instagram audio

Attach music or an original sound to a Reel.

```bash
IG_ID=$(posty integrations:list | jq -r '.[] | select(.identifier=="instagram") | .id')

posty integrations:settings "$IG_ID" | jq '.output.tools'
```

```json
[
  {
    "methodName": "audioSearch",
    "description": "Search audio (music or original sounds) to attach to a Reel via the \"audio\" setting, an empty query returns trending audio",
    "dataSchema": [
      { "key": "q",    "type": "string", "description": "Search query, leave empty for trending audio" },
      { "key": "type", "type": "string", "description": "Either \"music\" or \"original_sound\", defaults to \"music\"" }
    ]
  }
]
```

```bash
# Trending audio
posty integrations:trigger "$IG_ID" audioSearch -d '{}'

# Search
AUDIO=$(posty integrations:trigger "$IG_ID" audioSearch -d '{"q":"lofi","type":"music"}')
AUDIO_ID=$(echo "$AUDIO" | jq -r '.output[0].id')

VIDEO=$(posty upload reel.mp4 | jq -r '.path')
posty posts:create \
  -c "Reel caption" \
  -s "2026-12-31T12:00:00Z" \
  --settings "{\"post_type\":\"post\",\"audio\":{\"id\":\"$AUDIO_ID\"}}" \
  -m "$VIDEO" \
  -i "$IG_ID"
```

The `audio` object also takes `title`, `artist`, `image`, `audio_volume` and
`video_volume` (0–100). Only `id` is required.

---

## Generic discovery, for an agent

Do not assume a tool exists. Ask, and handle the empty case — which is the
common one.

```bash
#!/bin/bash
ID="$1"

TOOLS=$(posty integrations:settings "$ID" | jq -r '.output.tools[]?.methodName')

if [ -z "$TOOLS" ]; then
  echo "This channel has no tools. Build the settings payload directly."
  exit 0
fi

for METHOD in $TOOLS; do
  echo "== $METHOD"
  posty integrations:trigger "$ID" "$METHOD" -d '{}'
done
```

Note the loop passes `-d '{}'`. A tool with a non-empty `dataSchema` may need
real parameters; read the schema rather than calling blind.

---

## Rate limit

`integrations:trigger` reaches the provider's API, so it is throttled as a
write: **60 calls per key per hour**. `integrations:settings` and
`integrations:list` are reads, at the default allowance (600/h in production).

Cache tool results. They rarely change, and a `429` costs you the rest of the
hour.

---

## Errors

| Response | Cause |
|---|---|
| `404 Tool not found` | The method is not in this provider's `tools` array. Almost always because the channel has no tools at all. |
| `404 Integration not found` | Wrong id, or the channel belongs to a workspace this key was not granted. |
| `401 Channel disconnected due to expired token` | The provider's token could not be refreshed. The user must reconnect the channel in the web app. |
| `403 … missing the required permission: channels:read` | The key lacks the scope, or its owner's role no longer allows it. Scopes are re-checked against the owner's current role on every request. |
| `429` | Rate limit. Back off; do not retry in a loop. |

---

## Summary

- Read `integrations:settings` first. Always.
- Expect `"tools": []`. Only Instagram has one.
- Never invent a `methodName`.
- The JSON schema in `.output.settings` is generated from the code that
  validates your request — trust it over any document.
