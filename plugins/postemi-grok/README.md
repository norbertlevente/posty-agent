# Postemi plugin for Grok Build

Connect Grok Build to [Postemi](https://postemi.com), a social media scheduler:
write, preview, schedule and publish posts to 20 platforms, including Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky, Pinterest and Mastodon, and
manage the content calendar.

## Installation

In Grok Build, open `/plugin`, search for **Postemi**, and install. On first
connection, Grok opens Postemi's sign-in page in the browser. Approve access
for the workspace you want Grok to use. Do not paste an API key into the chat.

## What it adds

- MCP server `postemi` (streamable HTTP).
- Skill `postemi`: the posting workflow and its rules (preview before create,
  times in the user's timezone, per-account character limits).
- Commands `/announce-release` (posts about the latest release, from the
  changelog) and `/schedule-post`.

## Authentication and network endpoints

The plugin connects only to Postemi:

- `https://mcp.postemi.com/mcp`: hosted MCP server (streamable HTTP)
- `https://mcp.postemi.com/.well-known/oauth-authorization-server`: OAuth 2.1
  metadata; `/oauth/register` (dynamic client registration), `/oauth/token`,
  `/oauth/revoke` on the same host
- `https://postemi.com/app/oauth/authorize`: the human sign-in and consent page

Credentials: a Postemi account that owns a workspace whose plan includes API
access. The access token is used as `Authorization: Bearer` on the MCP server
and expires after one hour; refresh tokens rotate. No key is stored in the
plugin. Tools act only on the workspace the user approved. Social accounts
are connected in Postemi itself, never through the plugin. The plugin ships no
hooks and runs no code on the user's machine.

## License

AGPL-3.0. Use of the hosted service is governed by Postemi's terms:
https://postemi.com/terms
