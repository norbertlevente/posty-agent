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
