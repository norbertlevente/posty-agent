import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createPost, listPosts, deletePost, getMissingContent, connectPost, changePostStatus, findSlot } from './commands/posts';
import { listIntegrations, listGroups, getIntegrationSettings, triggerIntegrationTool } from './commands/integrations';
import { getAnalytics, getPostAnalytics } from './commands/analytics';
import { uploadFile, createUploadLink, listUploadLinkFiles } from './commands/upload';
import { authLogin, authLogout, authStatus } from './commands/auth';
import { configSet, configGet } from './commands/config';
import type { Argv } from 'yargs';

yargs(hideBin(process.argv))
  .scriptName('posty')
  .usage('$0 <command> [options]')
  .command(
    'posts:create',
    'Create a new post (schedule, draft, or publish now)',
    (yargs: Argv) => {
      return yargs
        .option('content', {
          alias: 'c',
          describe: 'Post/comment content (repeat for a thread: first is the post, the rest are comments)',
          type: 'string',
        })
        .option('media', {
          alias: 'm',
          describe: 'Comma-separated media URLs for the corresponding -c (repeatable; URLs must come from "posty upload")',
          type: 'string',
        })
        .option('integrations', {
          alias: 'i',
          describe: 'Comma-separated list of integration IDs (from "posty integrations:list")',
          type: 'string',
        })
        .option('date', {
          alias: 's',
          describe:
            'Publish date. ALWAYS give ISO 8601 with an explicit offset ("2026-12-31T12:00:00Z" / "+01:00"), or a datetime without offset ("2026-12-31 12:00") together with a timezone (--timezone / POSTY_TIMEZONE / posty config:set timezone). A naive date with no timezone configured is an error. Required unless --type now or --json.',
          type: 'string',
        })
        .option('timezone', {
          describe:
            'IANA timezone name (e.g. Europe/Budapest) used to interpret --date when it has no explicit offset. Numeric offsets are not accepted here — put those in the date string.',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          describe: 'Post type: "schedule" (default), "draft", or "now" (publish immediately)',
          type: 'string',
          choices: ['schedule', 'draft', 'now'],
          default: 'schedule',
        })
        .option('delay', {
          alias: 'd',
          describe: 'Delay in MINUTES between comments (default: 0)',
          type: 'number',
          default: 0,
        })
        .option('json', {
          alias: 'j',
          describe: 'Path to JSON file with the full post structure (see examples/)',
          type: 'string',
        })
        .option('shortLink', {
          describe: 'Use short links',
          type: 'boolean',
          default: true,
        })
        .option('settings', {
          describe: 'Platform-specific settings as JSON string (schema: "posty integrations:settings <id>")',
          type: 'string',
        })
        .check((argv) => {
          if (!argv.json && !argv.content) {
            throw new Error('Either --content or --json is required');
          }
          if (!argv.json && !argv.integrations) {
            throw new Error('--integrations is required when not using --json');
          }
          if (!argv.json && !argv.date && argv.type !== 'now') {
            throw new Error('--date is required when not using --json (or use --type now to publish immediately)');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hello World!" -s "2026-12-31T12:00:00Z" -i "integration-id"',
          'Simple scheduled post (explicit UTC)'
        )
        .example(
          '$0 posts:create -c "Merry Christmas! 🎄" -s "2026-12-24 18:00" --timezone Europe/Budapest -i "integration-id"',
          'Local wall-clock time with an explicit IANA timezone'
        )
        .example(
          '$0 posts:create -c "This goes out right now" -t now -i "integration-id"',
          'Publish immediately (no --date needed)'
        )
        .example(
          '$0 posts:create -c "Draft post" -s "2026-12-31T12:00:00Z" -t draft -i "integration-id"',
          'Create draft post'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg,img2.jpg" -s "2026-12-31T12:00:00Z" -i "integration-id"',
          'Post with multiple images (each URL from "posty upload")'
        )
        .example(
          '$0 posts:create -c "Main post" -m "img1.jpg" -c "First comment" -m "img2.jpg" -c "Second comment" -m "img3.jpg,img4.jpg" -s "2026-12-31T12:00:00Z" -i "integration-id"',
          'Post with comments, each having their own media'
        )
        .example(
          '$0 posts:create -c "Thread 1/3" -c "Thread 2/3" -c "Thread 3/3" -d 5 -s "2026-12-31T12:00:00Z" -i "integration-id"',
          'X (Twitter) thread with 5 minute delay between comments'
        )
        .example(
          '$0 posts:create --json ./post.json',
          'Complex post from JSON file'
        )
        .example(
          '$0 posts:create -c "Tweet content" -s "2026-12-31T12:00:00Z" --settings \'{"who_can_reply_post":"everyone"}\' -i "integration-id"',
          'X (Twitter) post with reply settings'
        )
        .example(
          '$0 posts:create -c "Video description" -s "2026-12-31T12:00:00Z" --settings \'{"title":"My Video","type":"public"}\' -i "youtube-id"',
          'YouTube post with title and visibility'
        );
    },
    createPost as any
  )
  .command(
    'posts:list',
    'List posts in a date range',
    (yargs: Argv) => {
      return yargs
        .option('startDate', {
          describe: 'Start date (ISO 8601 with explicit offset, or use --timezone). Default: 30 days ago',
          type: 'string',
        })
        .option('endDate', {
          describe: 'End date (ISO 8601 with explicit offset, or use --timezone). Default: 30 days from now',
          type: 'string',
        })
        .option('timezone', {
          describe:
            'IANA timezone name (e.g. Europe/Budapest) used to interpret --startDate/--endDate when they have no explicit offset',
          type: 'string',
        })
        .option('customer', {
          describe: 'Customer (group) ID (optional)',
          type: 'string',
        })
        .example('$0 posts:list', 'List posts (last 30 days to next 30 days)')
        .example(
          '$0 posts:list --startDate "2026-01-01T00:00:00Z" --endDate "2026-12-31T23:59:59Z"',
          'List posts for a specific date range'
        )
        .example(
          '$0 posts:list --customer "customer-id"',
          'List posts for a specific customer'
        );
    },
    listPosts as any
  )
  .command(
    'posts:delete <id>',
    'Delete a post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID to delete',
          type: 'string',
        })
        .example('$0 posts:delete abc123', 'Delete post with ID abc123');
    },
    deletePost as any
  )
  .command(
    'posts:find-slot <id>',
    'Find the next free publishing slot for an integration',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .example(
          '$0 posts:find-slot integration-123',
          'Returns {"date": "..."} — the next free datetime, usable as posts:create --date'
        );
    },
    findSlot as any
  )
  .command(
    'posts:missing <id>',
    'List available content from the provider for a post with missing release ID',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .example(
          '$0 posts:missing post-123',
          'Get available content to connect to a post'
        );
    },
    getMissingContent as any
  )
  .command(
    'posts:status <id>',
    'Change a post status between draft and schedule',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('status', {
          alias: 's',
          describe: 'New status: "draft" or "schedule"',
          type: 'string',
          choices: ['draft', 'schedule'],
          demandOption: true,
        })
        .example(
          '$0 posts:status post-123 --status draft',
          'Move a scheduled post back to draft (stops the running workflow)'
        )
        .example(
          '$0 posts:status post-123 --status schedule',
          'Schedule a draft post so it is queued for publishing'
        );
    },
    changePostStatus as any
  )
  .command(
    'posts:connect <id>',
    'Connect a post to its published content by updating the release ID',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('release-id', {
          describe: 'The platform-specific content ID to connect',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 posts:connect post-123 --release-id "7321456789012345678"',
          'Connect a post to its published content'
        );
    },
    connectPost as any
  )
  .command(
    'integrations:list',
    'List all connected integrations',
    (yargs: Argv) => {
      return yargs
        .option('group', {
          describe: 'Filter integrations by group (customer) ID',
          type: 'string',
        })
        .example('$0 integrations:list', 'List all connected integrations')
        .example(
          '$0 integrations:list --group "customer-id"',
          'List integrations for a specific group'
        );
    },
    listIntegrations as any
  )
  .command(
    'integrations:groups',
    'List all groups (customers)',
    {},
    listGroups as any
  )
  .command(
    'integrations:settings <id>',
    'Get settings schema, rules, max length and tools for an integration',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .example(
          '$0 integrations:settings youtube-456',
          'Get settings schema for a YouTube integration'
        )
        .example(
          '$0 integrations:settings instagram-123',
          'Get settings schema and tools for an Instagram integration'
        );
    },
    getIntegrationSettings as any
  )
  .command(
    'integrations:trigger <id> <method>',
    'Trigger an integration tool to fetch additional data',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .positional('method', {
          describe: 'Method name from the "tools" array of integrations:settings',
          type: 'string',
        })
        .option('data', {
          alias: 'd',
          describe: 'Data to pass to the tool as JSON string',
          type: 'string',
        })
        .example(
          '$0 integrations:trigger instagram-123 audioSearch -d \'{"q":"lofi","type":"music"}\'',
          'Search Instagram audio for a Reel (the only tool on a supported channel)'
        );
    },
    triggerIntegrationTool as any
  )
  .command(
    'analytics:platform <id>',
    'Get analytics for a specific integration/channel',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Integration ID',
          type: 'string',
        })
        .option('days', {
          alias: ['d', 'date'],
          describe: 'Number of days to look back (default: 7)',
          type: 'string',
          default: '7',
        })
        .example(
          '$0 analytics:platform integration-123',
          'Get last 7 days of analytics'
        )
        .example(
          '$0 analytics:platform integration-123 -d 30',
          'Get last 30 days of analytics'
        );
    },
    getAnalytics as any
  )
  .command(
    'analytics:post <id>',
    'Get analytics for a specific post',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'Post ID',
          type: 'string',
        })
        .option('days', {
          alias: ['d', 'date'],
          describe: 'Number of days to look back (default: 7)',
          type: 'string',
          default: '7',
        })
        .example(
          '$0 analytics:post post-123',
          'Get last 7 days of post analytics'
        )
        .example(
          '$0 analytics:post post-123 -d 30',
          'Get last 30 days of post analytics'
        );
    },
    getPostAnalytics as any
  )
  .command(
    'upload <file>',
    'Upload a media file; returns the URL to pass to posts:create -m',
    (yargs: Argv) => {
      return yargs
        .positional('file', {
          describe: 'File path to upload (jpeg/png/gif/webp/avif/bmp/tiff up to 10 MB, mp4 up to 1 GB)',
          type: 'string',
        })
        .example('$0 upload ./image.png', 'Upload an image; use the returned .path in posts:create -m');
    },
    uploadFile as any
  )
  .command(
    'upload:link',
    'Get a browser upload link for a file that is not on this machine (e.g. on a phone)',
    (yargs: Argv) => {
      return yargs.example(
        '$0 upload:link',
        'Returns {id, url, expiresAt}. Show the url to the person; they drop files on it, signed out. Then run upload:files <id>'
      );
    },
    createUploadLink as any
  )
  .command(
    'upload:files <id>',
    'List the files that arrived through an upload link; each .path goes to posts:create -m',
    (yargs: Argv) => {
      return yargs
        .positional('id', {
          describe: 'The id returned by "posty upload:link"',
          type: 'string',
        })
        .example(
          '$0 upload:files kR3mQ7xP2nLa',
          'Returns {status, count, files:[{id,name,path,type}]}; status "empty" means nothing has arrived yet'
        );
    },
    listUploadLinkFiles as any
  )
  .command(
    'config:set <key> <value>',
    'Save a CLI setting to ~/.posty/config.json',
    (yargs: Argv) => {
      return yargs
        .positional('key', {
          describe: 'Setting name. Known: "timezone" (an IANA name)',
          type: 'string',
        })
        .positional('value', {
          describe: 'Setting value',
          type: 'string',
        })
        .example(
          '$0 config:set timezone Europe/Budapest',
          'Interpret dates written without an explicit offset in Budapest time'
        );
    },
    configSet as any
  )
  .command(
    'config:get [key]',
    'Show saved CLI settings (all, or one key)',
    (yargs: Argv) => {
      return yargs
        .positional('key', {
          describe: 'Setting name. Known: "timezone"',
          type: 'string',
        })
        .example('$0 config:get', 'Show all saved settings as JSON')
        .example('$0 config:get timezone', 'Show the saved timezone');
    },
    configGet as any
  )
  .command(
    'auth:login',
    'Authenticate using the OAuth2 device flow (opens a browser)',
    (yargs: Argv) => {
      return yargs
        .option('auth-server', {
          describe: 'Auth server URL (default: https://posty.hu/api)',
          type: 'string',
        })
        .example(
          '$0 auth:login',
          'Login via OAuth2 device flow'
        );
    },
    authLogin as any
  )
  .command(
    'auth:logout',
    'Remove stored OAuth2 credentials',
    {},
    authLogout as any
  )
  .command(
    'auth:status',
    'Show current authentication status and verify the credentials',
    {},
    authStatus as any
  )
  .demandCommand(1, 'Specify a command. Run "posty --help" for the list.')
  .strict()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .wrap(Math.min(110, process.stdout.columns || 110))
  .epilogue(
    'Output contract: results are JSON on stdout; status and errors go to stderr. Every failure exits 1.\n\nAuthentication:\n  Device login: posty auth:login\n  API Key: export POSTY_API_KEY=your_api_key\n\nDates: ALWAYS pass an explicit offset ("2026-12-31T12:00:00Z" / "+01:00"), or pass --timezone with an IANA name (e.g. Europe/Budapest). A date without either is resolved via POSTY_TIMEZONE, then the timezone saved by "posty config:set timezone" — and is an ERROR when none of those is set. Numeric offsets are never accepted as timezone values.\n\nFor more information, visit: https://posty.hu'
  )
  .parse();
