import {spawn} from 'node:child_process';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {render} from 'ink';
import {App} from './components/App.js';
import type {AgentOptions, AgentTool} from './types.js';
import {formatDuration} from './utils/format.js';

const askYesNo = async (
	question: string,
	defaultValue: boolean,
): Promise<boolean> => {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return false;
	}

	const prompt = defaultValue ? 'Y/n' : 'y/N';
	const input = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const answer = (await input.question(`${question} (${prompt}) `))
			.trim()
			.toLowerCase();

		if (!answer) {
			return defaultValue;
		}

		return answer === 'y' || answer === 'yes';
	} finally {
		input.close();
	}
};

const runTool = (tool: AgentTool, args: string[]): Promise<number> =>
	new Promise(resolve => {
		const child = spawn(tool, args, {
			stdio: 'inherit',
		});

		child.on('error', error => {
			if ('code' in error && error.code === 'ENOENT') {
				console.error(`Could not find "${tool}" on your PATH.`);
				resolve(127);
				return;
			}

			console.error(error instanceof Error ? error.message : String(error));
			resolve(1);
		});

		child.on('close', code => {
			resolve(code ?? 0);
		});
	});

export const runAgentWrapper = async (
	tool: AgentTool,
	args: string[],
	options: AgentOptions,
): Promise<number> => {
	if (options.breakMode === 'start' || options.breakMode === 'both') {
		const shouldPlayBefore = await askYesNo(
			`Play Today's Break before ${tool} starts?`,
			true,
		);

		if (shouldPlayBefore) {
			const app = render(<App initialCommand={{kind: 'daily'}} />);
			await app.waitUntilExit();
		}
	}

	const startedAt = Date.now();
	const exitCode = await runTool(tool, args);
	const elapsedMs = Date.now() - startedAt;
	const thresholdMs = options.thresholdMinutes * 60 * 1000;

	if (
		options.breakMode === 'off' ||
		options.breakMode === 'start' ||
		elapsedMs < thresholdMs
	) {
		return exitCode;
	}

	const shouldPlay = await askYesNo(
		`That ${tool} session lasted ${formatDuration(elapsedMs)}. Play Today's Break?`,
		true,
	);

	if (shouldPlay) {
		const app = render(<App initialCommand={{kind: 'daily'}} />);
		await app.waitUntilExit();
	}

	return exitCode;
};
