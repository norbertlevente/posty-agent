import {
  KNOWN_SETTINGS,
  SettingKey,
  loadSettings,
  saveSetting,
  settingsFilePath,
} from '../settings';
import { assertIanaTimezone } from '../dates';
import { result, status } from '../output';

function assertKnownKey(key: string): SettingKey {
  if (!(KNOWN_SETTINGS as readonly string[]).includes(key)) {
    console.error(
      `❌ Unknown setting "${key}". Known settings: ${KNOWN_SETTINGS.join(', ')}`
    );
    process.exit(1);
  }
  return key as SettingKey;
}

export async function configSet(args: any) {
  const key = assertKnownKey(args.key);
  let value = String(args.value);

  if (key === 'timezone') {
    try {
      value = assertIanaTimezone(value, 'config:set');
    } catch (error: any) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }

  saveSetting(key, value);
  status(`✅ ${key} = ${value} saved to ${settingsFilePath()}`);
  result({ [key]: value });
}

export async function configGet(args: any) {
  const settings = loadSettings();

  if (args.key) {
    const key = assertKnownKey(args.key);
    result({ [key]: settings[key] ?? null });
    return;
  }

  result(settings);
}
