# Supported file types for `posty upload`

**Eight types. Nothing else.** If you are here because an upload returned
`400 Unsupported file type.`, the answer is almost certainly on this page.

| MIME type | Extensions | Max size |
|---|---|---|
| `image/jpeg` | `.jpg`, `.jpeg` | 10 MB |
| `image/png` | `.png` | 10 MB |
| `image/gif` | `.gif` | 10 MB |
| `image/webp` | `.webp` | 10 MB |
| `image/avif` | `.avif` | 10 MB |
| `image/bmp` | `.bmp` | 10 MB |
| `image/tiff` | `.tif`, `.tiff` | 10 MB |
| `video/mp4` | `.mp4` | 1 GB |

That is the complete list. Source of truth:
`libraries/nestjs-libraries/src/upload/custom.upload.validation.ts` in the
Posty server, where it is a literal `Set` of exactly these eight strings.

## Not supported

**These will fail. They are listed because a previous version of this document
promised them.**

| | Why |
|---|---|
| `.pdf`, `.doc`, `.docx`, `.ppt` | Not a social-media asset. Posty's media library is images and video. |
| `.mp3`, `.wav`, `.ogg`, `.aac`, `.flac`, `.m4a` | No audio type is accepted. Posty has no audio-only post. |
| `.mov`, `.mkv`, `.webm`, `.avi`, `.wmv`, `.flv`, `.3gp` | MP4 is the only accepted video container. Convert first — see below. |
| `.svg` | Deliberately excluded. SVG is a document format that executes script; serving user-supplied SVG from Posty's own origin would be a stored-XSS vector. |
| anything else | There is no `application/octet-stream` fallback. |

**Do not expect this list to widen.** The allowlist is narrow on purpose, and
the type is decided by sniffing the file's magic bytes, not by its extension or
by the `Content-Type` the client sends. Renaming `clip.mov` to `clip.mp4` does
not work — the server reads the bytes, sees QuickTime, and rejects it. It is
also checked twice: once by the upload interceptor as the bytes stream in, and
again by a validation pipe over the sniffed type before anything is stored.

## Converting

```bash
# Any video container -> MP4 (H.264 + AAC, which every platform accepts)
ffmpeg -i clip.mov -c:v libx264 -c:a aac clip.mp4
posty upload clip.mp4

# SVG -> PNG
rsvg-convert -w 1200 logo.svg -o logo.png     # or: inkscape, imagemagick
posty upload logo.png
```

## Usage

```bash
posty upload ./images/photo.jpg
```

```json
{
  "id": "…",
  "path": "https://…/uploads/photo.jpg"
}
```

Then use the returned `path` as the media reference on a post:

```bash
PATH=$(posty upload ./videos/promo.mp4 | jq -r '.path')
posty posts:create -c "Új videó!" -m "$PATH" -i "<integration-id>"
```

The media reference **must** be a path returned by `posty upload`. Passing a
local filename (`-m "screenshot.png"`) is not an upload shortcut; it produces a
post with a broken media reference.

## Errors

| Response | Meaning |
|---|---|
| `400 Unsupported file type.` | The sniffed type is not one of the eight above. Convert the file. |
| `400 File size exceeds the maximum allowed size of N bytes.` | Over 10 MB for an image or 1 GB for a video. |
| `400 File is too large.` | Rejected at the transport layer, before the body was read. Same cause. |
| `401 Invalid API key` | The key is wrong, revoked, or expired. |
| `403 … missing the required permission: media:write` | The key is valid but was not granted `media:write` — or its owner's role no longer permits it. Scoped keys are re-checked against their owner's current role on every request, so a role change can narrow a working key with nothing else having happened. |
| `429` | Rate limit. Every public API route is limited per key. |

## Platform limits are a separate thing

The eight types above are what **Posty** accepts. Each social platform then
applies its own rules to what it will publish — X caps video at 512 MB,
Instagram at 100 MB, TikTok at ~287 MB. An upload that Posty accepts can still
be refused by a platform at publish time. Use
`posty integrations:settings <id>` to read a channel's live rules rather than
hard-coding any of these numbers.

---

*Corrected 2026-08-06. The previous version of this file listed PDF, DOC, DOCX,
MP3, WAV, OGG, AAC, FLAC, M4A, SVG, MOV, MKV, WEBM and AVI as supported, and
claimed "30+ file types". None of them were, and an agent reading it would send
one and get a 400 it had no way to anticipate.*
