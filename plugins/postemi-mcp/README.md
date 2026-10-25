# Postemi: Social Media Scheduler (Claude plugin)

Connects Claude to Postemi (https://postemi.com) over MCP, so Claude can write,
schedule and publish social media posts to 20 platforms, including Facebook,
Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky, Pinterest and
Mastodon, with a content calendar and photo and video uploads in full
quality. Browser sign-in, no key.

Postemi is the international brand of Posty: the same platform and the same
accounts.

## Install

```sh
claude plugin marketplace add norbertlevente/posty-agent
claude plugin install postemi@posty-agent
```

Then sign in when Claude asks (`/mcp` → postemi → Authenticate in Claude
Code, or the sign-in prompt in the desktop app).

## Requirements

- A Postemi account (https://postemi.com/app/login) on a plan with API and
  MCP access.
- At least one channel connected in Postemi. Claude cannot connect a social
  account.

## Where data goes

The plugin talks to one service only: the Postemi MCP server named in this
plugin's `.mcp.json`. What it sends: the post text, schedule times, channel
ids and settings you ask Claude to use, and the media you upload. Postemi
stores posts and media in your workspace until you delete them.

- Privacy policy: https://postemi.com/privacy
- Terms: https://postemi.com/terms
- Help: https://postemi.com/help
- Docs: https://postemi.com/docs/mcp
- Support: norbert@postemi.com

Made by Kiss Industries (Basel, Switzerland), the company behind Posty and
Postemi.

## Submitting to Anthropic's plugin directory (owner)

Only the owner submits. Nothing here has been submitted.

Must be live first:

1. The Postemi MCP server at the URL in `.mcp.json`, with OAuth sign-in
   (discovery, dynamic client registration, consent) and the full tool list.
   Check it in Claude Code: `claude plugin install` from a local checkout,
   `/mcp` → postemi → Authenticate, then list channels and preview a post.
2. https://postemi.com/ai/claude, /docs/mcp, /help, /privacy and /terms
   answer 200 with Postemi text.
3. This plugin pushed to `main` of `norbertlevente/posty-agent` (ask before
   pushing: the push fires the Anthropic directory webhook).

Steps:

1. Open https://claude.ai/directory/manage and start a NEW plugin bundle
   submission. Do not edit the Posty listing.
2. Repository `norbertlevente/posty-agent`, path `plugins/postemi-mcp`.
   Name, display name, description, links and icon come from
   `.claude-plugin/plugin.json`.
3. The icon (`.claude-plugin/icon.png`, 512 x 512, the black Postemi mark on
   white) is read ONCE, at the first save. Check it before the first save.
4. Listing text: the `description` in `plugin.json`. Category and use cases
   as on the Posty listing, with Postemi in place of Posty.
5. Optional: a separate Postemi MCP connector with the same URL as
   `.mcp.json`. The directory pairs a bundle and a connector by URL. Use a
   Postemi reviewer account (for example `reviewer@postemi.com`, with
   Facebook, Instagram and YouTube connected), not reviewer@posty.hu.
6. Click Submit (owner only).

If the MCP URL changes (for example to `/mcp-oauth`), change it in
`.mcp.json` only, before the first submission.
