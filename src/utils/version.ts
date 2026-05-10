import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
// Both src/utils/version.ts (dev via tsx) and dist/utils/version.js (built)
// sit two levels deep, so package.json is always two parents up.
const packageJsonPath = join(moduleDir, '..', '..', 'package.json');

let detectedVersion = '0.0.0';

try {
	const raw = readFileSync(packageJsonPath, 'utf8');
	const parsed = JSON.parse(raw) as {version?: unknown};

	if (typeof parsed.version === 'string' && parsed.version.length > 0) {
		detectedVersion = parsed.version;
	}
} catch {
	// Fall back to the default if package.json is missing or unreadable.
}

export const VERSION = detectedVersion;
