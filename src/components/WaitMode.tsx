import {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {
	exitStatusFromResult,
	formatCommandForDisplay,
	startCommandRunner,
	type CommandOutputLine,
	type CommandRunResult,
	type RunningCommand,
} from '../utils/commandRunner.js';
import {formatDuration} from '../utils/format.js';
import {colors} from '../utils/theme.js';
import type {InkColor} from '../types.js';

type WaitModeProps = {
	args: string[];
	command: string;
	onExitCode: (exitCode: number) => void;
};

type RunnerItem = {
	id: number;
	kind: 'block' | 'coin';
	lane: number;
	x: number;
};

type ArcadeState = {
	bestCombo: number;
	bonks: number;
	combo: number;
	dodges: number;
	flash: 'bad' | 'good' | null;
	flashTicks: number;
	items: RunnerItem[];
	nextId: number;
	playerLane: number;
	score: number;
	tick: number;
};

type RunState =
	| {elapsedMs: number; result: null; status: 'running'}
	| {elapsedMs: number; result: CommandRunResult; status: 'finished'};

const LANES = 3;
const TRACK_WIDTH = 24;
const PLAYER_X = 3;
const TICK_MS = 140;
const SPAWN_EVERY_TICKS = 5;
const RECENT_OUTPUT_LINES = 9;
const EXIT_AFTER_FINISH_MS = 2200;
const OUTPUT_WIDTH = 72;

const initialArcadeState = (): ArcadeState => ({
	bestCombo: 0,
	bonks: 0,
	combo: 0,
	dodges: 0,
	flash: null,
	flashTicks: 0,
	items: [],
	nextId: 1,
	playerLane: 1,
	score: 0,
	tick: 0,
});

const trimOutputLines = (lines: CommandOutputLine[]): CommandOutputLine[] =>
	lines.length <= RECENT_OUTPUT_LINES
		? lines
		: lines.slice(lines.length - RECENT_OUTPUT_LINES);

const itemColor = (kind: RunnerItem['kind']): InkColor =>
	kind === 'coin' ? colors.accent : colors.failed;

const playerColor = (flash: ArcadeState['flash']): InkColor => {
	if (flash === 'bad') {
		return colors.failed;
	}

	if (flash === 'good') {
		return colors.accent;
	}

	return colors.text;
};

const advanceArcade = (current: ArcadeState): ArcadeState => {
	const tick = current.tick + 1;
	let score = current.score;
	let combo = current.combo;
	let bestCombo = current.bestCombo;
	let dodges = current.dodges;
	let bonks = current.bonks;
	let flash: ArcadeState['flash'] = null;
	const nextItems: RunnerItem[] = [];

	for (const item of current.items) {
		const movedItem = {...item, x: item.x - 1};

		if (movedItem.x === PLAYER_X && movedItem.lane === current.playerLane) {
			if (movedItem.kind === 'coin') {
				score += 5 + Math.min(5, combo);
				combo += 1;
				bestCombo = Math.max(bestCombo, combo);
				flash = 'good';
			} else {
				score = Math.max(0, score - 4);
				combo = 0;
				bonks += 1;
				flash = 'bad';
			}

			continue;
		}

		if (movedItem.x < 0) {
			if (movedItem.kind === 'block') {
				dodges += 1;
				combo += 1;
				bestCombo = Math.max(bestCombo, combo);
				score += 1 + Math.min(4, Math.floor(combo / 2));
				flash = flash ?? 'good';
			}

			continue;
		}

		nextItems.push(movedItem);
	}

	let nextId = current.nextId;

	if (tick % SPAWN_EVERY_TICKS === 0) {
		nextItems.push({
			id: nextId,
			kind: tick % 15 === 0 ? 'coin' : 'block',
			lane: Math.floor(Math.random() * LANES),
			x: TRACK_WIDTH - 1,
		});
		nextId += 1;
	}

	const flashTicks =
		flash === null ? Math.max(0, current.flashTicks - 1) : 3;

	return {
		bestCombo,
		bonks,
		combo,
		dodges,
		flash: flash ?? (flashTicks > 0 ? current.flash : null),
		flashTicks,
		items: nextItems,
		nextId,
		playerLane: current.playerLane,
		score,
		tick,
	};
};

const clampLane = (lane: number): number =>
	Math.max(0, Math.min(LANES - 1, lane));

const truncateOutput = (text: string): string => {
	if (text.length <= OUTPUT_WIDTH) {
		return text;
	}

	return `${text.slice(0, OUTPUT_WIDTH - 1)}…`;
};

const statusText = (result: CommandRunResult): string => {
	if (result.error) {
		return result.error;
	}

	if (typeof result.exitCode === 'number') {
		return `exit ${result.exitCode}`;
	}

	if (result.signal) {
		return `signal ${result.signal}`;
	}

	return 'finished';
};

const ArcadeBoard = ({state}: {state: ArcadeState}) => {
	const rows = useMemo(() => {
		const nextRows = Array.from({length: LANES}, () =>
			Array.from({length: TRACK_WIDTH}, () => ({
				color: colors.brandAlt as InkColor,
				dim: true,
				label: '· ',
			})),
		);

		for (const item of state.items) {
			if (
				item.lane >= 0 &&
				item.lane < LANES &&
				item.x >= 0 &&
				item.x < TRACK_WIDTH
			) {
				nextRows[item.lane]![item.x] = {
					color: itemColor(item.kind),
					dim: false,
					label: item.kind === 'coin' ? '$ ' : '# ',
				};
			}
		}

		nextRows[state.playerLane]![PLAYER_X] = {
			color: playerColor(state.flash),
			dim: false,
			label: state.flash === 'bad' ? 'x ' : '@ ',
		};

		return nextRows;
	}, [state.flash, state.items, state.playerLane]);

	return (
		<Box flexDirection="column">
			<Text color={colors.brandAlt}>╭{'─'.repeat(TRACK_WIDTH * 2)}╮</Text>
			{rows.map((row, rowIndex) => (
				<Text key={rowIndex} color={colors.brandAlt}>
					│
					{row.map((cell, cellIndex) => (
						<Text
							key={`${rowIndex}-${cellIndex}`}
							color={cell.color}
							dimColor={cell.dim}
						>
							{cell.label}
						</Text>
					))}
					│
				</Text>
			))}
			<Text color={colors.brandAlt}>╰{'─'.repeat(TRACK_WIDTH * 2)}╯</Text>
		</Box>
	);
};

const RecentOutput = ({lines}: {lines: CommandOutputLine[]}) => (
	<Box flexDirection="column">
		<Text bold color={colors.brandAlt}>
			recent output
		</Text>
		{lines.length === 0 ? (
			<Text dimColor>No output yet.</Text>
		) : (
			lines.map(line => (
				<Text key={line.id}>
					<Text color={line.kind === 'stderr' ? colors.failed : colors.saved}>
						{line.kind === 'stderr' ? 'err' : 'out'}
					</Text>
					<Text dimColor> │ </Text>
					<Text>{truncateOutput(line.text)}</Text>
				</Text>
			))
		)}
	</Box>
);

export const WaitMode = ({args, command, onExitCode}: WaitModeProps) => {
	const {exit} = useApp();
	const commandDisplay = useMemo(
		() => formatCommandForDisplay(command, args),
		[args, command],
	);
	const runnerRef = useRef<RunningCommand | null>(null);
	const [arcade, setArcade] = useState<ArcadeState>(() => initialArcadeState());
	const [outputLines, setOutputLines] = useState<CommandOutputLine[]>([]);
	const [runState, setRunState] = useState<RunState>({
		elapsedMs: 0,
		result: null,
		status: 'running',
	});
	const [isCancelling, setIsCancelling] = useState(false);

	useEffect(() => {
		const startedAt = Date.now();
		const runner = startCommandRunner({
			args,
			command,
			onOutput: line => {
				setOutputLines(current => trimOutputLines([...current, line]));
			},
		});

		runnerRef.current = runner;

		void runner.result.then(result => {
			setOutputLines(trimOutputLines(result.outputLines));
			setRunState({
				elapsedMs: result.elapsedMs,
				result,
				status: 'finished',
			});
		});

		const elapsedTimer = setInterval(() => {
			setRunState(current =>
				current.status === 'running'
					? {...current, elapsedMs: Date.now() - startedAt}
					: current,
			);
		}, 250);

		return () => {
			clearInterval(elapsedTimer);
			runner.cancel();
		};
	}, [args, command]);

	useEffect(() => {
		if (runState.status !== 'running') {
			return;
		}

		const arcadeTimer = setInterval(() => {
			setArcade(current => advanceArcade(current));
		}, TICK_MS);

		return () => {
			clearInterval(arcadeTimer);
		};
	}, [runState.status]);

	useEffect(() => {
		if (runState.status !== 'finished' || !runState.result) {
			return;
		}

		const exitCode = exitStatusFromResult(runState.result);
		const timer = setTimeout(() => {
			onExitCode(exitCode);
			exit();
		}, EXIT_AFTER_FINISH_MS);

		return () => {
			clearTimeout(timer);
		};
	}, [exit, onExitCode, runState]);

	useInput((input, key) => {
		if (runState.status !== 'running') {
			return;
		}

		const normalizedInput = input.toLowerCase();

		if (key.ctrl && normalizedInput === 'c') {
			setIsCancelling(true);
			runnerRef.current?.cancel();
			return;
		}

		if (key.upArrow || normalizedInput === 'w') {
			setArcade(current => ({
				...current,
				playerLane: clampLane(current.playerLane - 1),
			}));
			return;
		}

		if (key.downArrow || normalizedInput === 's') {
			setArcade(current => ({
				...current,
				playerLane: clampLane(current.playerLane + 1),
			}));
		}
	});

	const finalExitCode =
		runState.status === 'finished' && runState.result
			? exitStatusFromResult(runState.result)
			: null;
	const succeeded = finalExitCode === 0;

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color={colors.brand}>
					✦ VIBEBREAK WAIT // {commandDisplay}
				</Text>
				<Text dimColor>
					Non-interactive command mode. Move with W/S or arrows. Ctrl-C cancels.
				</Text>
				<Text>
					<Text color={colors.brandAlt}>[</Text>
					<Text dimColor>Elapsed </Text>
					<Text bold>{formatDuration(runState.elapsedMs)}</Text>
					<Text color={colors.brandAlt}>]</Text>
					{'  '}
					<Text color={colors.brandAlt}>[</Text>
					<Text dimColor>Score </Text>
					<Text bold>{arcade.score}</Text>
					<Text color={colors.brandAlt}>]</Text>
					{'  '}
					<Text color={colors.brandAlt}>[</Text>
					<Text dimColor>Combo </Text>
					<Text bold>x{arcade.combo}</Text>
					<Text color={colors.brandAlt}>]</Text>
				</Text>
			</Box>

			<Box columnGap={2} flexDirection="row">
				<Box flexDirection="column">
					<ArcadeBoard state={arcade} />
					<Text dimColor>
						dodge # · collect $ · Q does nothing here
					</Text>
				</Box>
				<RecentOutput lines={outputLines} />
			</Box>

			{runState.status === 'running' ? (
				<Text color={isCancelling ? colors.failed : colors.accent}>
					{isCancelling ? 'Cancelling command…' : 'Command is running…'}
				</Text>
			) : (
				<Box flexDirection="column">
					<Text bold color={succeeded ? colors.saved : colors.failed}>
						{succeeded ? 'PASS' : 'FAIL'} {commandDisplay}{' '}
						<Text dimColor>
							({statusText(runState.result)} ·{' '}
							{formatDuration(runState.result.elapsedMs)})
						</Text>
					</Text>
					<Text dimColor>
						Exiting with status {finalExitCode}. Best combo x{arcade.bestCombo};
						dodged {arcade.dodges}; bonks {arcade.bonks}.
					</Text>
				</Box>
			)}
		</Box>
	);
};
