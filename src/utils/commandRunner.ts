import {spawn} from 'node:child_process';

export type CommandOutputLine = {
	id: number;
	kind: 'stderr' | 'stdout';
	text: string;
};

export type CommandRunResult = {
	elapsedMs: number;
	error?: string;
	exitCode: number | null;
	outputLines: CommandOutputLine[];
	signal: NodeJS.Signals | null;
};

export type RunningCommand = {
	cancel: () => void;
	result: Promise<CommandRunResult>;
};

const MAX_CAPTURED_LINES = 80;
const MAX_RENDERED_LINE_LENGTH = 300;

const ANSI_PATTERN =
	/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
const UNSAFE_CONTROL_PATTERN =
	/[\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u007F]/g;

export const sanitizeCommandOutput = (text: string): string =>
	text.replace(ANSI_PATTERN, '').replace(UNSAFE_CONTROL_PATTERN, '');

const trimCapturedLines = (
	lines: CommandOutputLine[],
	limit = MAX_CAPTURED_LINES,
): CommandOutputLine[] =>
	lines.length <= limit ? lines : lines.slice(lines.length - limit);

const normalizeLine = (text: string): string => {
	const clean = sanitizeCommandOutput(text);

	if (clean.length <= MAX_RENDERED_LINE_LENGTH) {
		return clean;
	}

	return `${clean.slice(0, MAX_RENDERED_LINE_LENGTH - 1)}…`;
};

export const exitStatusFromResult = (result: CommandRunResult): number => {
	if (typeof result.exitCode === 'number') {
		return result.exitCode;
	}

	if (result.signal === 'SIGINT') {
		return 130;
	}

	if (result.signal === 'SIGTERM') {
		return 143;
	}

	return 1;
};

export const formatCommandForDisplay = (
	command: string,
	args: string[] = [],
): string => [command, ...args].join(' ');

export const startCommandRunner = ({
	args,
	command,
	onOutput,
}: {
	args: string[];
	command: string;
	onOutput?: (line: CommandOutputLine) => void;
}): RunningCommand => {
	const startedAt = Date.now();
	const outputLines: CommandOutputLine[] = [];
	const pending: Record<CommandOutputLine['kind'], string> = {
		stderr: '',
		stdout: '',
	};
	let child: ReturnType<typeof spawn> | null = null;
	let hasFinished = false;
	let nextLineId = 1;

	const pushLine = (kind: CommandOutputLine['kind'], text: string): void => {
		const line = {
			id: nextLineId,
			kind,
			text: normalizeLine(text),
		};
		nextLineId += 1;
		outputLines.push(line);
		const trimmed = trimCapturedLines(outputLines);
		outputLines.splice(0, outputLines.length, ...trimmed);
		onOutput?.(line);
	};

	const collectChunk = (
		kind: CommandOutputLine['kind'],
		chunk: Buffer | string,
	): void => {
		const normalized = sanitizeCommandOutput(String(chunk))
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n');
		const parts = `${pending[kind]}${normalized}`.split('\n');
		pending[kind] = parts.pop() ?? '';

		for (const part of parts) {
			pushLine(kind, part);
		}
	};

	const flushPending = (): void => {
		for (const kind of ['stdout', 'stderr'] as const) {
			if (pending[kind].length > 0) {
				pushLine(kind, pending[kind]);
				pending[kind] = '';
			}
		}
	};

	const result = new Promise<CommandRunResult>(resolve => {
		const finish = (
			exitCode: number | null,
			signal: NodeJS.Signals | null,
			error?: string,
		): void => {
			if (hasFinished) {
				return;
			}

			hasFinished = true;
			flushPending();
			resolve({
				elapsedMs: Date.now() - startedAt,
				error,
				exitCode,
				outputLines: [...outputLines],
				signal,
			});
		};

		try {
			child = spawn(command, args, {
				env: process.env,
				shell: process.platform === 'win32',
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true,
			});
		} catch (error) {
			finish(
				1,
				null,
				error instanceof Error ? error.message : 'Could not start command.',
			);
			return;
		}

		child.stdout?.on('data', chunk => {
			collectChunk('stdout', chunk);
		});
		child.stderr?.on('data', chunk => {
			collectChunk('stderr', chunk);
		});
		child.on('error', error => {
			finish(1, null, error.message);
		});
		child.on('close', (code, signal) => {
			finish(code, signal);
		});
	});

	return {
		cancel: () => {
			if (!hasFinished && child && !child.killed) {
				child.kill('SIGINT');
			}
		},
		result,
	};
};

export const runCommandPassthrough = async ({
	args,
	command,
}: {
	args: string[];
	command: string;
}): Promise<CommandRunResult> => {
	const startedAt = Date.now();

	return new Promise(resolve => {
		let hasFinished = false;
		let child: ReturnType<typeof spawn>;
		const finish = (result: CommandRunResult): void => {
			if (hasFinished) {
				return;
			}

			hasFinished = true;
			resolve(result);
		};

		try {
			child = spawn(command, args, {
				env: process.env,
				shell: process.platform === 'win32',
				stdio: ['ignore', 'inherit', 'inherit'],
				windowsHide: true,
			});
		} catch (error) {
			finish({
				elapsedMs: Date.now() - startedAt,
				error:
					error instanceof Error ? error.message : 'Could not start command.',
				exitCode: 1,
				outputLines: [],
				signal: null,
			});
			return;
		}

		child.on('error', error => {
			finish({
				elapsedMs: Date.now() - startedAt,
				error: error.message,
				exitCode: 1,
				outputLines: [],
				signal: null,
			});
		});
		child.on('close', (code, signal) => {
			finish({
				elapsedMs: Date.now() - startedAt,
				exitCode: code,
				outputLines: [],
				signal,
			});
		});
	});
};
