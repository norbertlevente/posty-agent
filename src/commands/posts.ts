import { PostyAPI } from '../api';
import { getConfig } from '../config';
import {
  ResolvedDate,
  ResolvedTimezone,
  resolveDateInput,
  resolveTimezone,
} from '../dates';
import { result, status, fail } from '../output';
import { readFileSync, existsSync } from 'fs';

/**
 * Read `--content`/`--media` off the raw argv, keeping the order they were
 * written in, so each `-m` belongs to the `-c` it follows.
 *
 * Exported for the tests, and separate from the handler because it is pure:
 * argv in, pairs out, no process state.
 *
 * Accepts `-c X`, `--content X` and `--content=X`. Repeating `-m` under one
 * `-c` appends, matching the comma syntax a single `-m` already supports.
 */
export const pairContentsWithMedia = (
  argv: string[]
): { content: string; media?: string }[] => {
  const read = (
    token: string,
    next: string | undefined,
    long: string,
    short: string
  ): { value: string; consumed: number } | null => {
    if (token === `--${long}` || token === `-${short}`) {
      return next === undefined ? null : { value: next, consumed: 2 };
    }
    if (token.startsWith(`--${long}=`)) {
      return { value: token.slice(long.length + 3), consumed: 1 };
    }
    return null;
  };

  const pairs: { content: string; media?: string }[] = [];

  for (let i = 0; i < argv.length; ) {
    const content = read(argv[i], argv[i + 1], 'content', 'c');
    if (content) {
      pairs.push({ content: content.value });
      i += content.consumed;
      continue;
    }

    const media = read(argv[i], argv[i + 1], 'media', 'm');
    if (media) {
      /*
        An -m before any -c has nothing to attach to. Guessing (first
        content? all of them?) is how the old bug behaved, so refuse instead.
      */
      if (!pairs.length) {
        console.error('❌ --media/-m must come after the --content/-c it belongs to');
        process.exit(1);
      }
      const last = pairs[pairs.length - 1];
      last.media = last.media ? `${last.media},${media.value}` : media.value;
      i += media.consumed;
      continue;
    }

    i += 1;
  }

  return pairs;
};

/** Walk the timezone ladder for this invocation, or exit 1 with the reason. */
function timezoneForArgs(args: any): ResolvedTimezone | null {
  try {
    return resolveTimezone(args.timezone);
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

function echoInterpretation(input: string, resolved: ResolvedDate) {
  if (resolved.appliedTimezone) {
    status(
      `ℹ️  Interpreted "${input}" as ${resolved.appliedTimezone.name} (via ${resolved.appliedTimezone.source}) → ${resolved.iso}`
    );
  }
}

/** Each -c with its -m paths, as the API's `value` entries. */
const buildValues = (
  pairs: { content: string; media?: string }[],
  args: any
) => {
  const values = pairs.map(({ content, media }) => ({
    content,
    image: media
      ? media
          .split(',')
          .filter((img: string) => img.trim())
          .map((img: string) => ({
            id: Math.random().toString(36).substring(7),
            path: img.trim(),
          }))
      : ([] as any[]),
    delay: args?.delay || 0,
  }));
  applyAltAndCover(values, args);
  return values;
};

/*
  ALT TEXT AND THE VIDEO COVER, on the media of the post itself (the first
  -c), never on a comment.

  - `--alt` (repeatable) gives alt text to the first -c's media, in order;
    more --alt than media is refused rather than guessed.
  - The cover belongs to the video's media item, the same two fields the web
    editor's cover picker writes: `thumbnailTimestamp` (milliseconds) and
    `thumbnail` (a picture URL), on the first .mp4. A cover with no video is
    refused rather than silently dropped.
*/
const applyAltAndCover = (values: { image: any[] }[], args: any) => {
  const alts: string[] = ([] as any[])
    .concat(args.alt ?? [])
    .filter((a: any) => a !== undefined && a !== null)
    .map((a: any) => String(a));
  const media = values[0]?.image || [];
  if (alts.length) {
    if (alts.length > media.length) {
      console.error(
        `❌ ${alts.length} --alt given but the post (first -c) has ${media.length} media. Give one --alt per file, in the -m order.`
      );
      process.exit(1);
    }
    alts.forEach((alt, i) => {
      media[i].alt = alt;
    });
  }

  const coverFrame = args.coverFrame ?? args['cover-frame'];
  const coverImage = args.coverImage ?? args['cover-image'];
  if (coverFrame === undefined && !coverImage) {
    return;
  }
  if (
    coverFrame !== undefined &&
    (typeof coverFrame !== 'number' || !Number.isFinite(coverFrame) || coverFrame < 0)
  ) {
    console.error('❌ --cover-frame must be a number of seconds, 0 or more (e.g. 2.5)');
    process.exit(1);
  }
  const video = media.find((m: { path: string }) =>
    /\.mp4$/i.test(m.path.split(/[?#]/)[0])
  );
  if (!video) {
    console.error("❌ --cover-frame / --cover-image need an .mp4 video in the post's -m (the first -c).");
    process.exit(1);
  }
  if (coverFrame !== undefined) {
    video.thumbnailTimestamp = Math.round(coverFrame * 1000);
  }
  if (coverImage) {
    video.thumbnail = String(coverImage).trim();
  }
};

export async function getMissingContent(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.getMissingContent(args.id);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to get missing content', error);
  }
}

export async function connectPost(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.updateReleaseId(args.id, args.releaseId);
    status(`✅ Post ${args.id} connected to release ${args.releaseId}`);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to connect post', error);
  }
}

export async function findSlot(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.findSlot(args.id);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to find a free slot', error);
  }
}

export async function createPost(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  // Support both simple and complex post creation
  let postData: any;

  if (args.json) {
    if ((args.coverFrame ?? args['cover-frame']) !== undefined || (args.coverImage ?? args['cover-image']) || args.alt !== undefined) {
      console.error('❌ --alt / --cover-frame / --cover-image do not apply to --json.');
      console.error('Put them on the media items in the JSON instead: "alt", and on the video "thumbnailTimestamp" (milliseconds) and/or "thumbnail" (a picture URL).');
      process.exit(1);
    }
    // Load from JSON file for complex posts with comments and media
    try {
      const jsonPath = args.json;
      if (!existsSync(jsonPath)) {
        console.error(`❌ JSON file not found: ${jsonPath}`);
        process.exit(1);
      }
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      postData = JSON.parse(jsonContent);
    } catch (error: any) {
      console.error(`❌ Failed to parse JSON file: ${error.message}`);
      process.exit(1);
    }
  } else {
    const integrations = args.integrations
      ? args.integrations.split(',').map((id: string) => id.trim())
      : [];

    if (integrations.length === 0) {
      console.error('❌ At least one integration ID is required');
      console.error('Use -i or --integrations to specify integration IDs');
      console.error('Run "posty integrations:list" to see available integrations');
      process.exit(1);
    }

    const contents = Array.isArray(args.content) ? args.content : [args.content];

    if (!contents[0]) {
      console.error('❌ At least one -c/--content is required');
      process.exit(1);
    }

    /*
      PAIRED BY POSITION ON THE COMMAND LINE, NOT BY ARRAY INDEX.

      yargs collects every -c into one array and every -m into another, and
      this used to pair them by index. The two arrays only line up when every
      -c has an -m, so

        -c "A" -m one.jpg -c "B" -c "C" -m three.jpg

      produced medias ["one","three"] and attached three.jpg to comment B.
      Silently, and to a live social account. Reading the real argv is the
      only way to know which -c an -m was written under.
    */
    const pairs = pairContentsWithMedia(process.argv);

    if (pairs.length && pairs.length !== contents.length) {
      console.error(
        `❌ Could not match --media to --content reliably (parsed ${pairs.length} content flags, yargs saw ${contents.length}).`
      );
      console.error('Pass the post structure with --json instead.');
      process.exit(1);
    }

    const values = buildValues(pairs.length ? pairs : contents.map((content: string) => ({ content, media: undefined })), args);

    // Parse provider-specific settings if provided
    // Note: __type is automatically added by the backend based on integration ID
    let settings: any = undefined;

    if (args.settings) {
      try {
        settings = typeof args.settings === 'string'
          ? JSON.parse(args.settings)
          : args.settings;
      } catch (error: any) {
        console.error(`❌ Failed to parse settings JSON: ${error.message}`);
        process.exit(1);
      }
    }

    const type = args.type || 'schedule';

    // `now` publishes immediately; the server replaces the date, but the API
    // still requires the field, so send the current instant when it is omitted.
    let dateIso: string;
    if (!args.date && type === 'now') {
      dateIso = new Date().toISOString();
    } else {
      const timezone = timezoneForArgs(args);
      try {
        const resolved = resolveDateInput(args.date, timezone, '--date');
        dateIso = resolved.iso;
        echoInterpretation(args.date, resolved);
      } catch (error: any) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
    }

    // Build the proper post structure
    postData = {
      type,
      creationMethod: 'CLI',
      date: dateIso,
      shortLink: args.shortLink !== false,
      tags: [],
      posts: integrations.map((integrationId: string) => ({
        integration: { id: integrationId },
        value: values,
        settings: settings,
      })),
    };
  }

  try {
    const res = await api.createPost(postData);
    status('✅ Post created successfully!');
    if (postData?.type && postData.type !== 'draft') {
      status(
        'Note: a key without posts:publish creates a DRAFT even when you asked to schedule — check the type in the response.'
      );
    }
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to create post', error);
  }
}

export async function listPosts(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  // Set default date range: last 30 days to 30 days in the future
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 30);

  // Only walk the ladder when a date was actually supplied — the defaults are
  // computed instants and must not fail on, say, a typoed POSTY_TIMEZONE.
  const timezone =
    args.startDate || args.endDate ? timezoneForArgs(args) : null;

  const resolve = (label: string, value: string | undefined, fallback: Date) => {
    if (!value) return fallback.toISOString();
    try {
      const resolved = resolveDateInput(value, timezone, label);
      echoInterpretation(value, resolved);
      return resolved.iso;
    } catch (error: any) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  };

  // Only send fields that are in GetPostsDto
  const filters: any = {
    startDate: resolve('--startDate', args.startDate, defaultStartDate),
    endDate: resolve('--endDate', args.endDate, defaultEndDate),
  };

  // customer is optional in the DTO
  if (args.customer) {
    filters.customer = args.customer;
  }

  try {
    const res = await api.listPosts(filters);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to list posts', error);
  }
}

export async function changePostStatus(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.changePostStatus(args.id, args.status);
    status(`✅ Post ${args.id} status changed to ${args.status}`);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to change post status', error);
  }
}

export async function deletePost(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.deletePost(args.id);
    status(`✅ Post ${args.id} deleted successfully!`);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to delete post', error);
  }
}

export async function deletePostGroup(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.deletePostGroup(args.group);
    status(`✅ Post group ${args.group} deleted from every channel`);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to delete post group', error);
  }
}

/** `posts:get <id>`: one channel's post in full, the input for posts:update. */
export async function getPost(args: any) {
  const api = new PostyAPI(getConfig());
  try {
    const res = await api.getPost(args.id);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to read post', error);
  }
}

/** A date flag resolved like posts:create does it, or exit with the reason. */
const dateFromArgs = (args: any, flag = '--date') => {
  const timezone = timezoneForArgs(args);
  try {
    const resolved = resolveDateInput(args.date, timezone, flag);
    echoInterpretation(args.date, resolved);
    return resolved.iso;
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
};

/*
  `posts:update <id>`: rewrite one channel's scheduled, draft or failed post.

  Every part is sent, like posts:create (-c/-m pairs), or the whole body with
  --json. Without -s the post keeps its time; without -t a draft stays a
  draft and anything else is scheduled. On the server, an attachment sent
  again keeps its alt text and cover unless --alt / --cover-* set new ones,
  and the post keeps its tags.
*/
export async function updatePost(args: any) {
  const api = new PostyAPI(getConfig());
  let body: any;

  if (args.json) {
    if (args.alt !== undefined || (args.coverFrame ?? args['cover-frame']) !== undefined || (args.coverImage ?? args['cover-image'])) {
      console.error('❌ --alt / --cover-frame / --cover-image do not apply to --json; put altText and cover on the parts in the JSON.');
      process.exit(1);
    }
    if (!existsSync(args.json)) {
      console.error(`❌ JSON file not found: ${args.json}`);
      process.exit(1);
    }
    try {
      body = JSON.parse(readFileSync(args.json, 'utf-8'));
    } catch (error: any) {
      console.error(`❌ Failed to parse JSON file: ${error.message}`);
      process.exit(1);
    }
  } else {
    const contents = ([] as string[]).concat(args.content ?? []);
    if (!contents.length || !contents[0]) {
      console.error('❌ posts:update needs every part as -c (like posts:create), or --json.');
      console.error(`Read the post first: posty posts:get ${args.id}`);
      process.exit(1);
    }
    const pairs = pairContentsWithMedia(process.argv);
    if (pairs.length && pairs.length !== contents.length) {
      console.error('❌ Could not match --media to --content reliably. Use --json instead.');
      process.exit(1);
    }
    const values = buildValues(
      pairs.length ? pairs : contents.map((content) => ({ content, media: undefined })),
      args
    );

    let current: any;
    if (!args.date || !args.type) {
      try {
        current = await api.getPost(args.id);
      } catch (error: any) {
        fail('Failed to read post', error);
      }
    }

    // A failed post's time is in the past: saving it unchanged would be
    // refused. Retry it, or give it a new time.
    if (!args.date && current?.state === 'ERROR') {
      console.error(`❌ This post failed to publish, and its time (${current.publishAtUtc}) has passed.`);
      console.error(`To send it again unchanged: posty posts:retry ${args.id}`);
      console.error('To change it: add -s with a new time (or -t draft).');
      process.exit(1);
    }

    let settings: any;
    if (args.settings) {
      try {
        settings = typeof args.settings === 'string' ? JSON.parse(args.settings) : args.settings;
      } catch (error: any) {
        console.error(`❌ Failed to parse settings JSON: ${error.message}`);
        process.exit(1);
      }
    }

    body = {
      date: args.date ? dateFromArgs(args) : current?.publishAtUtc,
      type: args.type || (current?.state === 'DRAFT' ? 'draft' : 'schedule'),
      // Without --settings the server keeps the post's own settings.
      ...(settings ? { settings } : {}),
      parts: values.map((v: any) => {
        const video = v.image.find((m: any) => m.thumbnail || m.thumbnailTimestamp != null);
        const alts = v.image.map((m: any) => m.alt);
        const lastAlt = alts.map((a: any) => a !== undefined).lastIndexOf(true);
        return {
          content: v.content,
          attachments: v.image.map((m: any) => m.path),
          // Only the alt texts this call sets; the server keeps the rest.
          ...(lastAlt >= 0 ? { altText: alts.slice(0, lastAlt + 1).map((a: any) => a ?? '') } : {}),
          ...(video
            ? {
                cover: {
                  ...(video.thumbnailTimestamp != null ? { frameSeconds: video.thumbnailTimestamp / 1000 } : {}),
                  ...(video.thumbnail ? { image: video.thumbnail } : {}),
                },
              }
            : {}),
        };
      }),
    };
  }

  try {
    const res: any = await api.updatePost(args.id, body);
    status(`✅ Post ${args.id} updated.`);
    if (res?.notices) {
      status(`Note: ${Array.isArray(res.notices) ? res.notices.join(' ') : res.notices}`);
    }
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to update post', error);
  }
}

/** `posts:reschedule <id...> -s <date>`: only the time changes. */
export async function reschedulePosts(args: any) {
  const api = new PostyAPI(getConfig());
  const ids: string[] = ([] as string[]).concat(args.id ?? []).map(String);
  if (!args.date) {
    console.error('❌ --date is required.');
    process.exit(1);
  }
  const date = dateFromArgs(args);
  const out: any[] = [];
  for (const id of ids) {
    try {
      const res: any = await api.reschedulePost(id, date);
      out.push(...(res?.results || [{ postId: id, done: true }]));
    } catch (error: any) {
      out.push({ postId: id, done: false, message: error?.message || String(error) });
    }
  }
  const failed = out.filter((r) => !r.done).length;
  status(failed ? `⚠️ ${out.length - failed} moved, ${failed} not moved (see message).` : `✅ ${out.length} moved.`);
  result({ results: out });
  if (failed) process.exitCode = 1;
  return out;
}

/** `posts:retry <id...>`: the server decides per post whether a retry can work. */
export async function retryPosts(args: any) {
  const api = new PostyAPI(getConfig());
  const ids: string[] = ([] as string[]).concat(args.id ?? []).map(String);
  const date = args.date ? dateFromArgs(args) : undefined;
  try {
    const res: any = await api.retryPosts(ids, date, !!args.confirmed);
    const results = res?.results || [];
    const not = results.filter((r: any) => !r.retried).length;
    status(not ? `⚠️ ${results.length - not} retried, ${not} not retried (see message: what to fix first).` : `✅ ${results.length} retried.`);
    result(res);
    if (not) process.exitCode = 1;
    return res;
  } catch (error: any) {
    fail('Failed to retry', error);
  }
}
