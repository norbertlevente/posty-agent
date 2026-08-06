import { PostyAPI } from '../api';
import { getConfig } from '../config';
import { result, fail } from '../output';

function daysArg(args: any): string {
  const days = String(args.days ?? '7');
  if (!/^\d+$/.test(days) || Number(days) < 1) {
    console.error('❌ --days must be a positive whole number of days, e.g. --days 30');
    process.exit(1);
  }
  return days;
}

export async function getAnalytics(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.getAnalytics(args.id, daysArg(args));
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to get analytics', error);
  }
}

export async function getPostAnalytics(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.getPostAnalytics(args.id, daysArg(args));
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to get post analytics', error);
  }
}
