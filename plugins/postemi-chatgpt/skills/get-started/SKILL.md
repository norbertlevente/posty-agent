---
name: get-started
description: Set up Postemi after installation. Check the connected channels, save the user's timezone, and open the Postemi app. Use when the user chooses Set up for Postemi or asks how to start with Postemi.
---

# Set up Postemi

Help the user get Postemi ready in a few short steps. Ask one question at a
time and let the user skip any step.

1. Call `read_settings` with `{}`. It returns the user's timezone and the
   workspace this connection acts on.
2. If the timezone value is "Not set", ask the user which city or timezone
   they post from. Map the answer to an IANA name (for example Berlin is
   `Europe/Berlin`) and call `update_settings` with
   `{"set":{"timezone":"<name>"}}`. Confirm the saved value from the tool
   result. Do not claim it was saved if the tool fails.
3. If the settings list more than one workspace, say which workspace is
   active and ask whether that is the right one. Change it with
   `update_settings` only if the user asks.
4. Call `list_integrations`. Name the connected channels with their
   `@handle`. If a channel has `needsReconnect` or `disabled`, say that the
   user must fix it in Postemi (postemi.com, Channels). If there are no channels,
   tell the user to connect one in Postemi first; ChatGPT cannot connect a
   social account.
5. Call `open_posty` with `{}` to open the Postemi app, and explain the three
   tabs in one sentence each: Calendar, New post, Channels. Mention that
   Postemi is also in the ChatGPT sidebar.
6. Offer a first task, for example: "Tell me what you want to post and when,
   and I will write it and show you a preview."

If the user installed Postemi during another task, continue that task in the
same conversation after these steps.
