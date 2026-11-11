# Posty CLI: details

The main skill ([../SKILL.md](../SKILL.md)) links here for the things an agent
needs only now and then: making an account, what a key can do, FotoAI, billing,
rate limits and the analytics repair.

## Creating an account

Only when the user asks you to make them a Posty account and they have none.

```bash
posty auth:signup --email anna@example.com
# → {codeSent:true, terms, privacy, timezone, language, next}
posty auth:signup --email anna@example.com --code 123456 --accept-terms [--workspace-name "Anna Kávézó"] [--timezone Europe/Budapest]
# → {created:true, workspaceId, workspaceName, trial:false, credentials, next}
```

1. Run it with `--email` only. Posty e-mails the user a six digit code (valid
   10 minutes). Ask the user to read the code to you. Off a terminal, `next`
   is the exact second command with every option kept.
2. Show the user the terms (https://posty.hu/aszf) and the privacy notice
   (https://posty.hu/adatvedelem) and ask whether they agree. Pass
   `--accept-terms` ONLY after they said yes; never decide it for them.
3. Run it again with `--code` and `--accept-terms`. The CLI keeps the sign-in
   the same way `auth:login` does and never prints it.
4. **There is no free trial on an account made this way.** Until the user
   pays, only the `billing:*` commands work. Next: `billing:plans`, confirm a
   plan with the user, `billing:subscribe`, give them the link. The user
   connects channels in the web app after paying.
5. **You keep working for the user only on a plan with API access**
   (`limits.apiAndMcpAccess: true` in `billing:plans`). Alap has none: if the
   user picks it, tell them BEFORE they pay that you will not be able to
   schedule for them afterwards. `billing:subscribe` answers with
   `apiAndMcpAccess: false` and a warning on stderr for such a plan.

Exit 1 with "already has a Posty account" (HTTP 409): the address is taken, so
the user signs in with `posty auth:login`. A wrong or expired code: run step 1
again for a new one.

## What a key can do

`posty auth:login` is a device login: the CLI asks Posty for a short code,
opens the approval page, and waits until the signed in human approves it and
chooses which workspace and which channels the new key may reach. Keys can
also be made in the web app under Settings, Developers. A key is shown once;
a lost key cannot be recovered, only rotated.

Two limits apply to every request, and both explain a 403 that looks like a
bug:

1. **Scopes.** A key carries some of `posts:read`, `posts:draft`,
   `posts:publish`, `channels:read`, `channels:write`, `media:write`,
   `analytics:read`. A route refuses a key without its scope.
2. **The owner's current role, checked on every request.** A key never does
   more than the person who made it can do right now. If that person loses a
   role, their keys narrow on the next request. A key that worked yesterday
   can return 403 today with no change to the key.

A key can also be limited to some workspaces and some channels; a request that
names a channel outside the grant is refused even with the right scope.

On a 403, read the message: it names what is missing. Do not retry, do not
try another route around it, and do not run `auth:login`. Ask the user for a
key with that access, or to have someone with the right role make one.

## FotoAI images and videos

Posty generates nothing itself. When the user asks for a picture or a video to
be made for a post and has a FotoAI (fotoai.hu) account, the `fotoai:*`
commands make it with THEIR FotoAI credits; the result lands in the Posty
media library.

```bash
posty fotoai:status                     # → {connected, needsReconnect, email, balanceCredits, connectUrl}
posty fotoai:models --category image    # → {models:[{id, name, can_use, params, base_price_credits}]}
posty fotoai:generate -m <model> -p "<prompt>" --aspect 4:5                   # price only
posty fotoai:generate -m <model> -p "<prompt>" --aspect 4:5 --yes --wait 60   # → {id, status, media:[{id, path}]}
posty fotoai:get <id> --wait 60         # → {status, media:[{id, path}], error}
```

1. `fotoai:status`. If `connected` is false, give the user `connectUrl` (they
   open it once, sign in to FotoAI or make an account there, and allow Posty)
   and wait until they say it is done.
2. Pick a model with `can_use: true` and a supported `--aspect` (and
   `--duration` for video).
3. Run `fotoai:generate` WITHOUT `--yes`, tell the user the price in credits,
   and ask. If `insufficient` is true, give them `topup_url` instead.
4. After the user agrees, run the same command with `--yes --wait 60`. It
   never spends more than the quoted price.
5. Attach each `media[].path` (not the id) with `posts:create -m`. If it was
   still running, `fotoai:get <id> --wait 60`.

## Subscription (only when the user asks)

The only commands that name a plan. Use them only when the user asks about
plans, asks to subscribe, or asks to manage the subscription; never suggest a
plan or an upgrade otherwise.

```bash
posty billing:plans                                  # → {current, plans:[{plan, slug, monthly, yearly, limits}], trial, trialDays}
posty billing:subscribe --tier pro --period yearly   # → {status:"requires_payment", checkoutUrl, ..., apiAndMcpAccess}
posty billing:status                                 # → {state, plan, period, currentPeriodEnd, payerIsCaller, pendingCheckout, apiAndMcpAccess}
posty billing:manage                                 # → {portalUrl}
```

1. Confirm the plan (`--tier` is the `slug`: alap, pro, kreator, csapat) and
   the period (monthly or yearly) with the user.
2. Run `billing:subscribe` once and give the user `checkoutUrl`. **The user
   opens it and pays with their OWN Link wallet or card.** Never pay with a
   one time or agent issued card, a virtual card number or any credential of
   your own: the subscription renews, and a one time credential fails at the
   first renewal, which ends the plan. `--open` opens the link in this
   machine's browser; use it only when this machine is the user's own.
3. After the user says they paid, run `billing:status` and check that `state`
   is `trialing` or `active`. If it shows a `pendingCheckout`, give that link
   back instead of running `billing:subscribe` again.
4. Plan changes, cancelling and invoices are in the Stripe portal:
   `billing:manage` prints the link.

These commands work before the workspace has a plan (they are how it gets
one). `billing:subscribe` and `billing:manage` need a full workspace key or a
sign-in held by the person who pays (or a workspace owner when nobody pays
yet); a scoped key is refused with a message that says so.

## Rate limits

Per key, per route, per hour. Each route has its own allowance, so polling
`posts:list` cannot use up `posts:create`.

| Routes | Limit per hour |
|---|---|
| Reads: `posts:list`, `integrations:list`, `integrations:groups`, `integrations:settings`, `posts:missing`, `posts:find-slot` | 600 |
| Writes: `posts:create`, `posts:delete`, `posts:delete-group`, `posts:status`, `integrations:trigger` | 60 |
| Analytics: `analytics:platform`, `analytics:post` | 30 |
| Uploads: `upload` | 30 |
| Upload links: `upload:link` 60, `upload:files` 600 | |

Rotating a key starts a fresh allowance. Over the limit the answer is `429`:
wait, and do not retry in a tight loop, which only uses up the next hour too.

## When analytics says missing

If `analytics:post` returns `{"missing": true}`, the post was published but the
platform did not give back a usable post id (TikTok often does this). Connect
the post to its content once, then analytics work:

```bash
posty posts:missing <post-id>
# → [{"id": "7321456789012345678", "url": "https://...cover.jpg"}, ...]
posty posts:connect <post-id> --release-id "7321456789012345678"
posty analytics:post <post-id>
```

Show the user the candidates (the `url` is a cover picture) and let them pick
when it is not clear which one is theirs. `posts:missing` returns an empty list
when the platform does not support this or the post is not missing its id.
