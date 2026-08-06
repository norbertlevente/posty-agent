# Posty CLI - Advanced Examples

This directory contains examples demonstrating the full capabilities of the Posty CLI, including posts with comments and multiple media.

## Understanding the Post Structure

The Posty API supports a rich post structure:

```typescript
{
  type: 'now' | 'schedule' | 'draft' | 'update',
  date: string,              // ISO 8601 date
  shortLink: boolean,        // Use URL shortener
  tags: Tag[],              // Post tags
  posts: [                  // Can post to multiple platforms at once
    {
      integration: { id: string },    // Platform integration ID
      value: [                        // Main post + comments/thread
        {
          content: string,            // Post/comment text
          image: MediaDto[],          // Multiple media attachments
          delay?: number              // Delay in minutes before posting (for comments)
        },
        // ... more comments
      ],
      settings: { __type: 'x'   // stamped by the server from the integration }
    }
  ]
}
```

## Simple Usage Examples

### Basic Post

```bash
posty posts:create \
  -c "Hello World!" \
  -i "$X_ID"
```

### Post with Multiple Images

There is no `--image` flag. Media goes on `-m`, comma-separated, and every
value must be a `.path` returned by `posty upload`.

```bash
A=$(posty upload img1.jpg | jq -r '.path')
B=$(posty upload img2.jpg | jq -r '.path')
C=$(posty upload img3.jpg | jq -r '.path')

posty posts:create \
  -c "Check out these images!" \
  -m "$A,$B,$C" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

### Post with Comments

There is no `--comments` flag either. Repeat `-c`: the first is the post, the
rest are its comments, in order.

```bash
posty posts:create \
  -c "Main post content" \
  -c "First comment" \
  -c "Second comment" \
  -s "2026-12-31T12:00:00Z" \
  -i "$X_ID"
```

### Scheduled Post

```bash
posty posts:create \
  -c "Future post" \
  -s "2024-12-31T12:00:00Z" \
  -i "$X_ID,$FB_ID"
```

## Advanced JSON Examples

For complex posts with comments that have their own media, use JSON files:

### 1. Post with Comments and Media

**File:** `post-with-comments.json`

```bash
posty posts:create --json examples/post-with-comments.json
```

This creates:
- Main post with 2 images
- First comment with 1 image (posted 5s after main)
- Second comment with 2 images (posted 10s after main)

### 2. Multi-Platform Campaign

**File:** `multi-platform-post.json`

```bash
posty posts:create --json examples/multi-platform-post.json
```

This creates:
- Twitter post with main + comment
- LinkedIn post with single content
- Facebook post with main + comment
All scheduled for the same time with platform-specific content and media!

### 3. Twitter Thread

**File:** `thread-post.json`

```bash
posty posts:create --json examples/thread-post.json
```

This creates a 5-part Twitter thread, with each tweet having its own image and a 2-second delay between tweets.

## JSON File Structure Explained

### Basic Structure

```json
{
  "type": "now",                    // "now", "schedule", "draft", "update"
  "date": "2024-01-15T12:00:00Z",  // When to post (ISO 8601)
  "shortLink": true,                // Enable URL shortening
  "tags": [],                       // Array of tags
  "posts": [...]                    // Array of posts
}
```

### Post Structure

```json
{
  "integration": {
    "id": "$X_ID"              // Get this from integrations:list
  },
  "value": [                         // Array of content (main + comments)
    {
      "content": "Post text",        // The actual content
      "image": [                     // Array of media
        {
          "id": "unique-id",         // Unique identifier
          "path": "https://..."      // URL to the image
        }
      ],
      "delay": 5                     // Optional delay in minutes
    }
  ],
  "settings": {
    "__type": "x"                     // stamped by the server; you need not send it
  }
}
```

## Use Cases

### 1. Product Launch Campaign

Create a coordinated multi-platform launch:

```json
{
  "type": "schedule",
  "date": "2024-03-15T09:00:00Z",
  "posts": [
    {
      "integration": { "id": "twitter-id" },
      "value": [
        { "content": "🚀 Launching today!", "image": [...] },
        { "content": "Special features:", "image": [...], "delay": 3600000 },
        { "content": "Get it now:", "image": [...], "delay": 7200000 }
      ]
    },
    {
      "integration": { "id": "linkedin-id" },
      "value": [
        { "content": "Professional announcement...", "image": [...] }
      ]
    }
  ]
}
```

### 2. Tutorial Series

Create an educational thread:

```json
{
  "type": "now",
  "posts": [
    {
      "integration": { "id": "twitter-id" },
      "value": [
        { "content": "🧵 How to X (1/5)", "image": [...] },
        { "content": "Step 1: ... (2/5)", "image": [...], "delay": 2000 },
        { "content": "Step 2: ... (3/5)", "image": [...], "delay": 2000 },
        { "content": "Step 3: ... (4/5)", "image": [...], "delay": 2000 },
        { "content": "Conclusion (5/5)", "image": [...], "delay": 2000 }
      ]
    }
  ]
}
```

### 3. Event Coverage

Live event updates with media:

```json
{
  "type": "now",
  "posts": [
    {
      "integration": { "id": "twitter-id" },
      "value": [
        {
          "content": "📍 Event starting now!",
          "image": [
            { "id": "1", "path": "venue-photo.jpg" }
          ]
        },
        {
          "content": "First speaker taking stage",
          "image": [
            { "id": "2", "path": "speaker-photo.jpg" }
          ],
          "delay": 1800000
        }
      ]
    }
  ]
}
```

## Getting Integration IDs

Before creating posts, get your integration IDs:

```bash
posty integrations:list
```

Output:
```json
[
  { "id": "abc-123-twitter", "provider": "twitter", "name": "@myaccount" },
  { "id": "def-456-linkedin", "provider": "linkedin", "name": "My Company" }
]
```

Use these IDs in your `integration.id` fields.

## Tips for AI Agents

1. **Use JSON for complex posts** - If you need comments with media, always use JSON files
2. **Delays matter** - Use appropriate delays between comments (Twitter: 2-5s, others: 30s-1min)
3. **Image IDs** - Generate unique IDs for each image (can use UUIDs or random strings)
4. **Validate before sending** - Check that all integration IDs exist
5. **Test with "draft" type** - Use `"type": "draft"` to create without posting

## Automation Scripts

### Batch Create from Directory

```bash
#!/bin/bash
# Create posts from all JSON files in a directory

for file in posts/*.json; do
  echo "Creating post from $file..."
  posty posts:create --json "$file"
  sleep 2
done
```

### Generate JSON Programmatically

```bash
# Generate a thread JSON file
cat > thread.json << 'EOF'
{
  "type": "now",
  "date": "2024-12-31T12:00:00Z",
  "shortLink": true,
  "tags": [],
  "posts": [{
    "integration": { "id": "$X_ID" },
    "value": [
      { "content": "Tweet 1", "image": [] },
      { "content": "Tweet 2", "image": [], "delay": 2000 },
      { "content": "Tweet 3", "image": [], "delay": 2000 }
    ],
    "settings": { "__type": "x" }
  }]
}
EOF

# Post using the JSON file
posty posts:create --json thread.json
```

## Error Handling

Common errors and solutions:

1. **Invalid integration ID** - Run `integrations:list` to get valid IDs
2. **Invalid image path** - Ensure images are accessible URLs or uploaded to Posty first
3. **Missing required fields** - Check that `type`, `date`, `shortLink`, `tags`, and `posts` are all present
4. **Invalid date format** - Use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

## Further Reading

- See `SKILL.md` for AI agent patterns
- See `README.md` for installation and setup
- See `QUICK_START.md` for basic usage
