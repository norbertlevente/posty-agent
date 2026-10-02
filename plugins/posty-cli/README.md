# Posty CLI plugin

A skill that teaches a coding agent (Claude Code and other agents with a
terminal) to use the `posty` command line tool to write, schedule and publish
social media posts with Posty (https://posty.hu): Facebook, Instagram, X,
LinkedIn, TikTok, YouTube, Threads, Bluesky, Telegram, Discord, Slack and
Pinterest.

## Requirements

- The CLI: `npm install -g posty-cli` (the command is `posty`).
- A Posty account on a plan with API access. Sign in with `posty auth:login`:
  it opens the browser and the person approves it there. The plugin asks for
  no key and reads none.

## Where data goes

The skill runs the `posty` command. That command sends data to one service
only, Posty's own API:

- `https://api.posty.hu` (also served at `https://posty.hu/api`)

What it sends: the post text, schedule times, channel ids and settings you
ask the agent to use, and the media files you upload with `posty upload`.
Posty stores posts and media in your workspace until you delete them.

- Privacy policy: https://posty.hu/privacy
- Terms: https://posty.hu/terms
- Help: https://posty.hu/en/help

Made by Kiss Industries (Basel, Switzerland), the company behind Posty.
