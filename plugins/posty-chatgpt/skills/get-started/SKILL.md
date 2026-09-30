---
name: get-started
description: Set up Posty after installation. Check the connected channels, save the user's timezone, and open the Posty app. Use when the user chooses Set up for Posty or asks how to start with Posty.
---

# Set up Posty

Help the user get Posty ready in a few short steps. Ask one question at a
time and let the user skip any step.

1. Call `read_settings` with `{}`. It returns the user's timezone and the
   workspace this connection acts on.
2. If the timezone value is "Not set", ask the user which city or timezone
   they post from. Map the answer to an IANA name (for example Budapest is
   `Europe/Budapest`) and call `update_settings` with
   `{"set":{"timezone":"<name>"}}`. Confirm the saved value from the tool
   result. Do not claim it was saved if the tool fails.
3. If the settings list more than one workspace, say which workspace is
   active and ask whether that is the right one. Change it with
   `update_settings` only if the user asks.
4. Call `list_integrations`. Name the connected channels with their
   `@handle`. If a channel has `needsReconnect` or `disabled`, say that the
   user must fix it in Posty (posty.hu, Channels). If there are no channels,
   tell the user to connect one in Posty first; ChatGPT cannot connect a
   social account.
5. Call `open_posty` with `{}` to open the Posty app, and explain the three
   tabs in one sentence each: Calendar, New post, Channels. Mention that
   Posty is also in the ChatGPT sidebar.
6. Offer a first task, for example: "Tell me what you want to post and when,
   and I will write it and show you a preview."

If the user installed Posty during another task, continue that task in the
same conversation after these steps.
