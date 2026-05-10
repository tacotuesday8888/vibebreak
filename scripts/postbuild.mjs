import {chmodSync} from 'node:fs';

const binPath = new URL('../dist/index.js', import.meta.url);

try {
	chmodSync(binPath, 0o755);
} catch (error) {
	// Windows ignores the executable bit; fail quietly there and on any
	// platform that disallows chmod (npm install will set the bit anyway).
	if (process.platform !== 'win32') {
		console.warn(`postbuild: could not chmod dist/index.js: ${error.message}`);
	}
}
