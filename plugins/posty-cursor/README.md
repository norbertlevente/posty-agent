# Posty for Cursor and Grok Bot

Write, schedule and publish social media posts without leaving the editor:
Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky,
Telegram, Discord and Slack. Posty previews every post per account (name,
@handle, local publish time, character count) and creates it only after you
confirm.

## What it adds

- **MCP server** `posty` at `https://api.posty.hu/mcp-oauth`. Sign in with
  your browser on first use; no key to paste.
- **Skill** `posty`: the workflow and the rules for posting through Posty.
- **Commands**
  - `/announce-release`: posts about your latest release, from the changelog.
  - `/schedule-post`: one post, at the time you name.

## Requirements

- A Posty account at [posty.hu](https://posty.hu) with your social channels
  connected, on a workspace whose plan includes API access.
- Channels are connected in Posty itself, not from Cursor.

## Try it

- "Announce today's release on LinkedIn and X tomorrow at 9:00."
- "What is scheduled on my social channels this week?"
- "Cancel the LinkedIn post for Friday."

## Links

- Documentation: https://posty.hu/en/docs/mcp
- Privacy: https://posty.hu/privacy
- Support: norbert@posty.hu

License: AGPL-3.0
