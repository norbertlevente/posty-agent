/**
 * Persistent CLI settings — `~/.posty/config.json`.
 *
 * Deliberately separate from `credentials.json`: settings survive
 * `posty auth:logout`, and the credentials file keeps holding secrets only.
 *
 * One known key today: `timezone` (an IANA name, used to interpret dates
 * written without an explicit offset — see dates.ts for the full ladder).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SETTINGS_DIR = join(homedir(), '.posty');
const SETTINGS_FILE = join(SETTINGS_DIR, 'config.json');

export const KNOWN_SETTINGS = ['timezone'] as const;
export type SettingKey = (typeof KNOWN_SETTINGS)[number];

export function settingsFilePath(): string {
  return SETTINGS_FILE;
}

export function loadSettings(): Record<string, string> {
  try {
    if (!existsSync(SETTINGS_FILE)) return {};
    const data = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function getSetting(key: SettingKey): string | undefined {
  const value = loadSettings()[key];
  return typeof value === 'string' && value ? value : undefined;
}

export function saveSetting(key: SettingKey, value: string): void {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true, mode: 0o700 });
  }
  const settings = loadSettings();
  settings[key] = value;
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', {
    encoding: 'utf-8',
  });
}
