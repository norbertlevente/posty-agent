import { PostyAPI } from '../api';
import { getConfig } from '../config';
import { resolveDateInput } from '../dates';
import { result, status, fail } from '../output';
import { readFileSync, existsSync } from 'fs';

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

    // Support multiple -c and -m flags
    // Normalize to arrays
    const contents = Array.isArray(args.content) ? args.content : [args.content];
    const medias = Array.isArray(args.media) ? args.media : (args.media ? [args.media] : []);

    if (!contents[0]) {
      console.error('❌ At least one -c/--content is required');
      process.exit(1);
    }

    // Build value array by pairing contents with their media
    const values = contents.map((content: string, index: number) => {
      const mediaForThisContent = medias[index];
      const images = mediaForThisContent
        ? mediaForThisContent.split(',').map((img: string) => ({
            id: Math.random().toString(36).substring(7),
            path: img.trim(),
          }))
        : [];

      return {
        content: content,
        image: images,
        delay: args?.delay || 0,
      };
    });

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
      try {
        const resolved = resolveDateInput(args.date);
        dateIso = resolved.iso;
        if (resolved.assumedTimezone) {
          status(
            `ℹ️  Interpreted "${args.date}" as ${resolved.assumedTimezone} → ${dateIso} (set POSTY_TIMEZONE or pass an explicit offset to override)`
          );
        }
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

  const resolve = (label: string, value: string | undefined, fallback: Date) => {
    if (!value) return fallback.toISOString();
    try {
      return resolveDateInput(value).iso;
    } catch (error: any) {
      console.error(`❌ Invalid ${label}: ${error.message}`);
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
