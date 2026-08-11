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

    const values = (pairs.length ? pairs : contents.map((content: string) => ({ content, media: undefined })))
      .map(({ content, media }: { content: string; media?: string }) => ({
        content,
        image: media
          ? media.split(',').filter((img: string) => img.trim()).map((img: string) => ({
              id: Math.random().toString(36).substring(7),
              path: img.trim(),
            }))
          : [],
        delay: args?.delay || 0,
      }));

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
