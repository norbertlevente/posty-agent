# Submitting Postemi to the ChatGPT app directory (owner)

This package is a NEW app, "Postemi: Social Media Scheduler", version 1.0.0.
It is not a version of the Posty app. Only the owner submits. Nothing here has
been uploaded or submitted.

## Identity: do not reuse Posty's app id

- `plugin.json` `name` is `postemi`. Posty's package uses its OpenAI app id
  (`app-6a78a805...`) as `name`; uploading a ZIP with that name would land on
  the Posty listing. Never copy it here.
- TODO (owner): the OpenAI app id field is empty on purpose. Create the new
  app first (see below). If OpenAI then assigns an id like `app-...` and later
  uploads need it to match, put that id in `name` and commit it. Until then
  `postemi` stays.
- Create it with the dashboard's general "Upload new or existing plugin" box
  (this is the path that makes a separate plugin). Do NOT use the Posty
  listing's own "Upload plugin to make changes" box.

## Must be live first

1. The Postemi MCP server at the URL in `mcp.json` (one place; change it there
   only, for example if the backend ends up on `/mcp-oauth`), with OAuth
   sign-in, the same tools as Posty's server, the cards, the side panel, the
   settings page and the @ menu. The widget CSP and the upload card's storage
   CORS must allow the new app's sandbox origin (Posty's bucket rule allows
   Posty's origin only).
2. https://postemi.com, /help, /privacy, /terms and /app/login answer 200.
3. The review test image at https://postemi.com/review/postemi-test-photo.jpg
   (TODO: copy Posty's `apps/frontend/public/review/posty-test-photo.jpg` into
   the Postemi web repo as `public/review/postemi-test-photo.jpg` and deploy).
4. Test in developer mode first: ChatGPT Settings, Security and login,
   Developer mode; add the URL from `mcp.json`; Refresh. Check the sidebar
   entry, the side panel, the settings page and the @ menu on desktop.

## Reviewer account (TODO, owner creates)

- E-mail: `reviewer@postemi.com` (placeholder; create the mailbox and the
  account).
- Login: https://postemi.com/app/login
- Same setup as reviewer@posty.hu: a plan with API and MCP access, a Facebook
  Page, Instagram and YouTube connected, a timezone set.
- Enter the credentials in the dashboard's Review information dialog. They are
  not in the package.
- Note for the reviewer, if OAuth consent screens of Facebook, Google and the
  others still say "Posty": Postemi runs on the Posty platform; Postemi is its
  international brand.

## Demo video (TODO, owner records)

`review.demo_recording_url` in `plugin.json` holds a TODO text. Record the
same 13-step script as Posty 1.2.0 (the positive test cases in `plugin.json`,
in order) on the Postemi reviewer account, upload it to YouTube (unlisted is
fine) and put the link there before the final upload.

## Steps on platform.openai.com

1. Plugins, "Upload new or existing plugin", identity as for Posty. Upload a
   ZIP of this folder's contents (`plugin.json`, `mcp.json`, `assets/`,
   `skills/`; leave `SUBMIT.md` out). Check that a NEW plugin named "Postemi:
   Social Media Scheduler" was created and that the Posty listing is
   untouched.
2. MCPs tab: Connect account for the scan (the reviewer account or the
   owner's), run the scan, resolve findings.
3. Review information: reviewer credentials, check the test cases, the video
   link and the 25 countries (all of Posty's except HU).
4. Submit (owner only). After approval, publish by hand.
5. After Postemi is published: narrow Posty's package countries to HU only, in
   a new Posty version. Not before.

## Listing facts

- Display name: Postemi: Social Media Scheduler
- Version: 1.0.0, English only (no translations)
- Countries: CH, AT, DE, CZ, SK, PL, RO, SI, GB, IE, US, CA, FR, ES, IT, PT,
  NL, BE, LU, SE, DK, NO, FI, HR, GR
- Links: https://postemi.com, /help, /privacy, /terms
- Brand colour #0A0A0A (dark mode #FFFFFF); logo `assets/logo.png` (512 x 512,
  black mark on white), composer icon `assets/logo.svg` (black mark).
- The tool `open_posty` and the `posty://` @-menu links keep their names: they
  come from the shared backend.
