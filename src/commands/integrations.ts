import { PostyAPI } from '../api';
import { getConfig } from '../config';
import { result, fail } from '../output';

export async function listIntegrations(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.listIntegrations(args?.group);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to list integrations', error);
  }
}

export async function listGroups() {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.listGroups();
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to list groups', error);
  }
}

export async function getIntegrationSettings(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  try {
    const res = await api.getIntegrationSettings(args.id);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to get integration settings', error);
  }
}

export async function triggerIntegrationTool(args: any) {
  const config = getConfig();
  const api = new PostyAPI(config);

  // Parse data from JSON string or use empty object
  let data: Record<string, string> = {};
  if (args.data) {
    try {
      data = JSON.parse(args.data);
    } catch (error: any) {
      console.error(`❌ Failed to parse data JSON: ${error.message}`);
      process.exit(1);
    }
  }

  try {
    const res = await api.triggerIntegrationTool(args.id, args.method, data);
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to trigger tool', error);
  }
}
