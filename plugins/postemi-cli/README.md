# Postemi CLI plugin

A skill that teaches a coding agent (Claude Code and other agents with a
terminal) to use the `postemi` command line tool to write, schedule and
publish social media posts with Postemi (https://postemi.com): Facebook,
Instagram, X, LinkedIn, TikTok, YouTube, Threads, Bluesky, Telegram, Discord,
Slack and Pinterest (beta).

## Install

```sh
npm install -g postemi
claude plugin marketplace add norbertlevente/posty-agent
claude plugin install postemi-cli@posty-agent
```

## Requirements

- The CLI: `npm install -g postemi` (package and command are both `postemi`).
- A Postemi account on a plan with API access. Sign in with
  `postemi auth:login`: it opens the browser and the person approves it there.
  The plugin asks for no key and reads none.

## Where data goes

The skill runs the `postemi` command. That command sends data to one service
only, Postemi's own API:

- `https://api.postemi.com`

What it sends: the post text, schedule times, channel ids and settings you
ask the agent to use, and the media files you upload with `postemi upload`.
Postemi stores posts and media in your workspace until you delete them.

- Privacy policy: https://postemi.com/privacy
- Terms: https://postemi.com/terms
- Help: https://postemi.com/help
- Support: norbert@postemi.com

Made by Kiss Industries (Basel, Switzerland), the company behind Postemi.
