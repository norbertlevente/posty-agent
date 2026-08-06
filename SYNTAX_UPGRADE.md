# The `-c` / `-m` syntax

A historical note about how `posts:create` came to take repeated flags, kept
because scripts written against the older shape still exist.

**The short version:** repeat `-c` for the post and each comment, pair each
with its own `-m`. `--comments` and `--image` are not flags on this CLI and
never were on this fork — yargs ignores unknown options rather than erroring,
so a command using them posts with the comments and the media silently missing.

## What Changed

The CLI now supports a **much better** command-line syntax for creating posts with comments that have their own media.

## New Syntax: Multiple `-c` and `-m` Flags

Instead of using semicolon-separated strings (which break when you need semicolons in your content), you can now use multiple `-c` and `-m` flags:

```bash
posty posts:create \
  -c "main post content" -m "media1.png,media2.png" \
  -c "first comment" -m "media3.png" \
  -c "second comment; with semicolon!" -m "media4.png,media5.png" \
  -i "$X_ID"
```

## The Problem We Solved

### ❌ The old shape (upstream, not this CLI)

```bash
posty posts:create \
  -c "Main post" \
  --comments "Comment 1;Comment 2;Comment 3" \
  -i "$X_ID"
```

**Issues:**
1. ❌ Can't use semicolons in comment text
2. ❌ Comments can't have their own media
3. ❌ Less intuitive syntax
4. ❌ Limited flexibility

**And on this CLI it does nothing.** `--comments` is not a registered option,
so the post goes out with no comments at all and no error.

### ✅ New Approach (Better!)

```bash
posty posts:create \
  -c "Main post" -m "main.jpg" \
  -c "Comment 1; with semicolon!" -m "comment1.jpg" \
  -c "Comment 2" -m "comment2.jpg" \
  -c "Comment 3" \
  -i "$X_ID"
```

**Benefits:**
1. ✅ Semicolons work fine in content
2. ✅ Each comment can have different media
3. ✅ More readable and intuitive
4. ✅ Fully flexible

## How It Works

### Pairing Logic

The CLI pairs `-c` and `-m` flags in order:

```bash
posty posts:create \
  -c "Content 1" -m "media-for-content-1.jpg" \    # Pair 1
  -c "Content 2" -m "media-for-content-2.jpg" \    # Pair 2
  -c "Content 3" -m "media-for-content-3.jpg" \    # Pair 3
  -i "$X_ID"
```

- **1st `-c`** = Main post
- **2nd `-c`** = First comment (posted after delay)
- **3rd `-c`** = Second comment (posted after delay)
- Each `-m` is paired with the corresponding `-c` (in order)

### Every `-m` value is an uploaded URL

`-m` takes a `.path` returned by `posty upload`, comma-separated for several.
A local filename is not an upload shortcut — it produces a post with a broken
media reference. Read `media1.png` below as shorthand for
`$(posty upload media1.png | jq -r '.path')`.

### Media is Optional

```bash
posty posts:create \
  -c "Post with media" -m "image.jpg" \
  -c "Comment without media" \
  -c "Another comment" \
  -i "$X_ID"
```

Result:
- Post with image
- Text-only comment
- Another text-only comment

### Multiple Media per Post/Comment

```bash
posty posts:create \
  -c "Main post" -m "img1.jpg,img2.jpg,img3.jpg" \
  -c "Comment" -m "img4.jpg,img5.jpg" \
  -i "$X_ID"
```

Result:
- Main post with 3 images
- Comment with 2 images

## Real Examples

### Example 1: Product Launch

```bash
posty posts:create \
  -c "🚀 Launching ProductX today!" \
  -m "hero.jpg,features.jpg" \
  -c "⭐ Key features you'll love..." \
  -m "features-detail.jpg" \
  -c "💰 Special offer: 50% off!" \
  -m "discount.jpg" \
  -i "$X_ID,$FB_ID"
```

### Example 2: Twitter Thread

```bash
posty posts:create \
  -c "🧵 Thread: How to X (1/5)" -m "intro.jpg" \
  -c "Step 1: ... (2/5)" -m "step1.jpg" \
  -c "Step 2: ... (3/5)" -m "step2.jpg" \
  -c "Step 3: ... (4/5)" -m "step3.jpg" \
  -c "Conclusion (5/5)" -m "done.jpg" \
  -d 2000 \
  -i "$X_ID"
```

### Example 3: Tutorial with Screenshots

```bash
posty posts:create \
  -c "Tutorial: Feature X 📖" \
  -m "tutorial-cover.jpg" \
  -c "1. Open settings" \
  -m "settings-screenshot.jpg" \
  -c "2. Enable feature X" \
  -m "enable-screenshot.jpg" \
  -c "3. You're done! 🎉" \
  -m "success-screenshot.jpg" \
  -i "$X_ID"
```

### Example 4: Content with Special Characters

```bash
posty posts:create \
  -c "Main post about programming" \
  -c "First tip: Use const; avoid var" \
  -c "Second tip: Functions should do one thing; keep it simple" \
  -c "Third tip: Comments should explain 'why'; not 'what'" \
  -i "$X_ID"
```

**No escaping needed!** Semicolons work perfectly.

## Options Reference

| Option | Alias | Multiple? | Description |
|--------|-------|-----------|-------------|
| `--content` | `-c` | ✅ Yes | Post/comment content |
| `--media` | `-m` | ✅ Yes | Comma-separated media URLs |
| `--integrations` | `-i` | ❌ No | Integration IDs |
| `--schedule` | `-s` | ❌ No | ISO 8601 date |
| `--delay` | `-d` | ❌ No | Delay between comments (minutes, default: 0) |
| `--shortLink` | - | ❌ No | Use URL shortener (default: true) |
| `--json` | `-j` | ❌ No | Load from JSON file |

## Delay Between Comments

`-d` sets the `delay` value recorded on each comment.

```bash
posty posts:create \
  -c "Main" \
  -c "Comment 1" \
  -c "Comment 2" \
  -d 10 \    # 10 minutes between each
  -i "$X_ID"
```

**Default:** 0 (no delay)

## Command Line vs JSON

### Use Command Line When:
- ✅ Quick posts
- ✅ Same content for all platforms
- ✅ Simple structure
- ✅ Dynamic/scripted content

### Use JSON When:
- ✅ Different content per platform
- ✅ Very complex structures
- ✅ Reusable templates
- ✅ Integration with other tools

## For AI Agents

### Generating Commands

```bash
# Build a multi-post command with media
posty posts:create \
  -c "Main post" \
  -m "img1.jpg,img2.jpg" \
  -c "Comment; with semicolon!" \
  -m "img3.jpg" \
  -c "Another comment" \
  -i "$X_ID"
```

## Migration Guide

If you have existing scripts using the old syntax — note that on this CLI they
were not merely limited, they were silently dropping the comments and the
media.

### Before:
```bash
posty posts:create \
  -c "Main post" \
  --comments "Comment 1;Comment 2" \
  --image "main-image.jpg" \
  -i "$X_ID"
```

### After:
```bash
MAIN=$(posty upload main-image.jpg | jq -r '.path')

posty posts:create \
  -c "Main post" -m "$MAIN" \
  -c "Comment 1" \
  -c "Comment 2" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

`-s` is required. It is absent from every example above this line because they
predate the requirement; add it.

## Documentation

- [examples/COMMAND_LINE_GUIDE.md](./examples/COMMAND_LINE_GUIDE.md) — full command-line reference
- [examples/command-line-examples.sh](./examples/command-line-examples.sh) — executable examples
- [examples/EXAMPLES.md](./examples/EXAMPLES.md) — usage patterns
- [SKILL.md](./SKILL.md) — the complete guide, and what an AI agent should read

## Summary

### ✅ You Can Now:

1. **Use multiple `-c` flags** for main post + comments
2. **Use multiple `-m` flags** to pair media with each `-c`
3. **Use semicolons freely** in your content
4. **Create complex threads** easily from command line
5. **Each comment has its own media** array
6. **More intuitive syntax** overall

### 🎯 Perfect For:

- X threads
- Product launches with follow-ups
- Tutorials with screenshots
- Event coverage
- Multi-step announcements
- Any post with comments that need their own media!

**The CLI is now much more powerful and user-friendly!** 🚀
