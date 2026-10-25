import { PostyAPI } from '../api';
import { getConfig } from '../config';
import { result, status, fail } from '../output';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

export async function uploadFile(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  if (!existsSync(args.file)) {
    console.error(`❌ File not found: ${args.file}`);
    process.exit(1);
  }

  try {
    const fileBuffer = readFileSync(args.file);
    const filename = basename(args.file) || 'file';

    const res = await api.upload(fileBuffer, filename);
    status('✅ File uploaded successfully!');
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to upload file', error);
  }
}

/**
 * `posty upload:link` — for a file that is NOT on this machine.
 *
 * `posty upload` needs the file on disk. When the person has it on their
 * phone, or the agent running this CLI cannot see their filesystem, mint a
 * link instead: they open it in any browser, drop the files, and
 * `posty upload:files <id>` returns what arrived.
 */
export async function createUploadLink() {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.createUploadLink();
    status(
      `🔗 Upload link created. Open it in a browser, drop the files, then run: posty upload:files ${res.id}`
    );
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to create an upload link', error);
  }
}

export async function listUploadLinkFiles(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.getUploadLinkFiles(args.id);
    if (res.status === 'empty') {
      status('⏳ Nothing has arrived through this link yet. Ask the person to check the page says "uploaded", then run this again.');
    } else {
      status(`✅ ${res.count} file(s) arrived. Use each .path in posts:create -m`);
    }
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to read the upload link', error);
  }
}
