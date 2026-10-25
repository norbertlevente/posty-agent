import { PostyAPI } from '../api';
import { getConfig, getWorkspaceId } from '../config';
import { loadCredentials, saveCredentials } from './auth';
import { saveSetting, settingsFilePath } from '../settings';
import { result, status, fail } from '../output';

/**
 * `posty workspaces:list` — every workspace the credential can act on, with
 * `current` marking the one requests go to. A key from `posty auth:login`
 * spans one workspace unless "all my workspaces" was ticked on the approval
 * page; a key made in Settings can span any number.
 */
export async function listWorkspaces() {
  const api = new PostyAPI(getConfig());
  try {
    const res = await api.listWorkspaces();
    result(res);
    return res;
  } catch (error: any) {
    fail('Failed to list workspaces', error);
  }
}

/**
 * `posty workspaces:use <id>` — make every following command act on that
 * workspace. Checked against the API first, so a typo is refused here and
 * not on the next post. Stored next to the token for a device login, in
 * config.json for a key that comes from the environment.
 */
export async function useWorkspace(args: any) {
  const id = String(args.id || '').trim();
  if (!id) {
    fail('Failed to select workspace', new Error('Give the workspace id, from "posty workspaces:list"'));
  }

  // Listed WITHOUT naming a workspace: the list route is the one route that
  // answers for a multi-workspace key either way, and asking with the header
  // would trip the target's subscription gate before the choice is even saved.
  const api = new PostyAPI({ ...getConfig(), workspaceId: undefined });

  let workspaces;
  try {
    workspaces = await api.listWorkspaces();
  } catch (error: any) {
    fail('Failed to select workspace', error);
  }

  const chosen = workspaces.find((w) => w.id === id);
  if (!chosen) {
    fail(
      'Failed to select workspace',
      new Error(
        `This credential cannot act on workspace ${id}. Available: ${workspaces
          .map((w) => `${w.name} (${w.id})`)
          .join(', ') || 'none'}`
      )
    );
  }

  const creds = loadCredentials();
  if (creds) {
    saveCredentials({ ...creds, organizationId: chosen.id });
    status(`✅ Workspace set to ${chosen.name} (saved with your login)`);
  } else {
    saveSetting('workspace', chosen.id);
    status(`✅ Workspace set to ${chosen.name} (saved to ${settingsFilePath()})`);
  }
  result({ id: chosen.id, name: chosen.name, role: chosen.role });
}

/** `posty workspaces:current` — the one requests go to, or null. */
export async function currentWorkspace() {
  const id = getWorkspaceId();
  const api = new PostyAPI(getConfig());
  try {
    const workspaces = await api.listWorkspaces();
    const current = workspaces.find((w) => w.current) || null;
    if (!current && workspaces.length > 1) {
      status(
        'No workspace selected and this key spans several. Run: posty workspaces:use <id>'
      );
    }
    result(current ?? (id ? { id, name: null } : null));
  } catch (error: any) {
    fail('Failed to read the current workspace', error);
  }
}
