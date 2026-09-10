---
name: posty
description: Schedule and publish social posts through Posty's MCP tools (Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky, Telegram, Discord, Slack). Use for anything about the user's social media calendar, posting, scheduling or publishing.
homepage: https://posty.hu
---

# Posty

Posty is the user's social media scheduler. This plugin connects you to it
over MCP: the server named `posty` is already configured, and its tools are
the way to do everything in this skill. Posty writes no text of its own, and
that is deliberate: you write the post, Posty publishes it.

## Use the MCP tools. Do not install anything.

Never run `npm install`, never install or invoke a `posty` command line
tool, and never touch the user's shell for Posty work. The MCP tools cover
every task below without leaving the conversation. (Posty's separate CLI
plugin, `posty-cli`, exists for terminal and script workflows; it is not
this one.)

If a tool call answers that the server needs authentication, tell the user
to sign in (`/mcp` → posty → Authenticate in Claude Code, or the sign-in
prompt in the desktop app), then retry. There is no key to paste.

## The tools, in the order a task uses them

| Tool | What it does | Writes? |
|---|---|---|
| `get_workspace_context` | current UTC time, the user's timezone, workspace name. **Call first** whenever a date or time is involved. | no |
| `list_integrations` | the connected channels with id, name, `@handle`, platform, and whether each can publish now | no |
| `list_groups` | the customer groups channels are filed under | no |
| `get_integration_schema` | one channel's posting rules and its real character limit. Call before writing for that channel. | no |
| `get_channel_options` | provider-specific choices (boards, subreddits, pages) when a setting needs an id | refreshes tokens |
| `preview_post` | validates a proposed post and shows exactly what would go out, per account. **Always call this and show the result before `create_post`.** | no |
| `create_post` | creates a draft, schedules, or publishes now, across one or more channels | yes |
| `list_posts` | the calendar: id, state, channel, UTC and local time | no |
| `delete_post` | removes an unpublished post; refuses anything already live | yes |
| `upload_media_from_url` | puts an image or video into the media library from a public URL or data URL | yes |
| `create_upload_link` | a browser link the user drops files on, for media that is on their own device | yes |
| `list_upload_link_files` | what the user dropped on that link, with the path to attach | no |

## Rules that hold on every call

- Dates: get the clock and timezone from `get_workspace_context`; never infer either from the conversation. Say times back to the user in their own local time. Dates you send are ISO 8601 UTC.
- Channels: pick by id from `list_integrations`. Use the `@handle` to tell same-named accounts apart, and say the handle back when confirming. Skip channels marked disabled or needing reconnect; they cannot publish until fixed in Posty.
- Limits: `get_integration_schema` returns the character limit for that account. It is binding, even if the user asks to ignore it. Never guess whether an X account has Premium.
- Confirmation: `preview_post` first, with the same payload you intend to send; show the user the account, handle, local time, character count and any problem; call `create_post` only after the user agrees. `create_post` also gets a client-side confirmation from the host, which is expected.
- Threads vs comments: entries after the first in `postsAndComments` are a thread on X, Threads and Bluesky, but comments on LinkedIn and Facebook. On thread-capable platforms ask which the user wants.
- Content is HTML with each line in `<p>`. Allowed tags: h1, h2, h3, u, strong, li, ul, p. Never u and strong together.
- Idempotency: pass an `idempotencyKey` (a UUID you invent per post) to `create_post`. If a call times out, resend the same request with the same key; nothing posts twice.
- Media: a public URL goes through `upload_media_from_url`; a file on the user's device goes through `create_upload_link`, then `list_upload_link_files`, then attach the returned path. Reels and Shorts want 9:16 video.
- Undo: `delete_post` with the id from `list_posts` or `create_post`, only before it publishes, and ask first. Posty cannot remove a post from a platform once it is live.
- Rate limits: if a call is refused for frequency, wait the number of seconds in the message.

## Worked example

User: "I have a video on my laptop, post it to TikTok, Reels and Shorts at 9 tomorrow."

1. `get_workspace_context` → today's date and the user's timezone; compute tomorrow 09:00 local → UTC.
2. `list_integrations` → the TikTok, Instagram and YouTube channel ids and handles.
3. `create_upload_link` → give the user the link; ask them to drop the video on it.
4. `list_upload_link_files` → the hosted path.
5. `get_integration_schema` for each of the three; write a caption within each limit. YouTube also needs a title and a privacy choice: ask the user.
6. `preview_post` with the three-channel payload; show the per-account result.
7. On the user's yes: `create_post` with the same payload and a fresh `idempotencyKey`. Report where and when it is scheduled, in local time.
