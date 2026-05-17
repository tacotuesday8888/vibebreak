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
	kind: 'boost' | 'coin' | 'obstacle';
	lane: number;
	x: number;
};

type EventKind = 'bad' | 'good' | 'neutral';

type ArcadeState = {
	bestCombo: number;
	bonks: number;
	combo: number;
	dodges: number;
	event: string;
	eventKind: EventKind;
	flash: 'bad' | 'good' | null;
	flashTicks: number;
	items: RunnerItem[];
	nearMisses: number;
	nextId: number;
	playerLane: number;
	score: number;
	shield: number;
	tick: number;
};

type RunState =
	| {elapsedMs: number; finishedAt: null; result: null; status: 'running'}
	| {
			elapsedMs: number;
			finishedAt: number;
			result: CommandRunResult;
			status: 'finished';
	  };

type RenderCell = {
	color: InkColor;
	dim: boolean;
	label: string;
};

const LANES = 3;
const TRACK_WIDTH = 42;
const PLAYER_X = 6;
const TICK_MS = 115;
const RECENT_OUTPUT_LINES = 10;
const COMPACT_OUTPUT_LINES = 6;
const OUTPUT_WIDTH = 62;
const COMPACT_OUTPUT_WIDTH = 74;
const NARROW_TERMINAL_COLUMNS = 110;
const MIN_VISIBLE_MS = 5200;
const EXIT_AFTER_FINISH_MS = 4200;

const initialArcadeState = (): ArcadeState => ({
	bestCombo: 0,
	bonks: 0,
	combo: 0,
	dodges: 0,
	event: 'Run the rails while your command works.',
	eventKind: 'neutral',
	flash: null,
	flashTicks: 0,
	items: [],
	nearMisses: 0,
	nextId: 1,
	playerLane: 1,
	score: 0,
	shield: 1,
	tick: 0,
});

const trimOutputLines = (
	lines: CommandOutputLine[],
	limit = RECENT_OUTPUT_LINES,
): CommandOutputLine[] =>
	lines.length <= limit ? lines : lines.slice(lines.length - limit);

const clampLane = (lane: number): number =>
	Math.max(0, Math.min(LANES - 1, lane));

const chooseOtherLane = (lane: number): number => {
	const offset = Math.floor(Math.random() * (LANES - 1)) + 1;
	return (lane + offset) % LANES;
};

const comboBonus = (combo: number): number => Math.min(12, Math.floor(combo / 2));

const spawnIntervalFor = (tick: number): number => {
	if (tick > 150) {
		return 3;
	}

	if (tick > 70) {
		return 4;
	}

	return 5;
};

const itemColor = (kind: RunnerItem['kind']): InkColor => {
	if (kind === 'coin') {
		return colors.accent;
	}

	if (kind === 'boost') {
		return colors.saved;
	}

	return colors.failed;
};

const itemLabel = (kind: RunnerItem['kind']): string => {
	if (kind === 'coin') {
		return '$';
	}

	if (kind === 'boost') {
		return '+';
	}

	return '#';
};

const playerColor = (state: ArcadeState): InkColor => {
	if (state.flash === 'bad') {
		return colors.failed;
	}

	if (state.flash === 'good' || state.shield > 0) {
		return colors.saved;
	}

	return colors.text;
};

const trackCell = (lane: number, x: number): RenderCell => {
	if (x === PLAYER_X) {
		return {color: colors.brandAlt, dim: true, label: '|'};
	}

	if ((x + lane) % 9 === 0) {
		return {color: colors.brandAlt, dim: true, label: '-'};
	}

	return {color: colors.brandAlt, dim: true, label: '.'};
};

const advanceArcade = (current: ArcadeState): ArcadeState => {
	const tick = current.tick + 1;
	let score = current.score + (tick % 3 === 0 ? 1 : 0);
	let combo = current.combo;
	let bestCombo = current.bestCombo;
	let dodges = current.dodges;
	let bonks = current.bonks;
	let nearMisses = current.nearMisses;
	let shield = current.shield;
	let flash: ArcadeState['flash'] = null;
	let event = current.event;
	let eventKind = current.eventKind;
	const nextItems: RunnerItem[] = [];

	for (const item of current.items) {
		const movedItem = {...item, x: item.x - 1};

		if (movedItem.x === PLAYER_X && movedItem.lane === current.playerLane) {
			if (movedItem.kind === 'coin') {
				const points = 10 + comboBonus(combo);
				score += points;
				combo += 1;
				bestCombo = Math.max(bestCombo, combo);
				flash = 'good';
				event = `+${points} coin line. Combo x${combo}.`;
				eventKind = 'good';
			} else if (movedItem.kind === 'boost') {
				shield = Math.min(3, shield + 1);
				score += 8;
				combo += 1;
				bestCombo = Math.max(bestCombo, combo);
				flash = 'good';
				event = `Shield charged. ${shield} buffer${shield === 1 ? '' : 's'}.`;
				eventKind = 'good';
			} else if (shield > 0) {
				shield -= 1;
				bonks += 1;
				score = Math.max(0, score - 3);
				combo = 0;
				flash = 'bad';
				event = 'Shield ate the hit. Keep moving.';
				eventKind = 'neutral';
			} else {
				bonks += 1;
				score = Math.max(0, score - 12);
				combo = 0;
				flash = 'bad';
				event = '-12 rail block. Lane switch sooner.';
				eventKind = 'bad';
			}

			continue;
		}

		if (movedItem.x < 0) {
			if (movedItem.kind === 'obstacle') {
				const nearMiss = Math.abs(movedItem.lane - current.playerLane) === 1;
				const points = nearMiss ? 8 + comboBonus(combo) : 4 + comboBonus(combo);
				score += points;
				combo += 1;
				bestCombo = Math.max(bestCombo, combo);
				dodges += 1;
				flash = flash ?? 'good';
				event = nearMiss
					? `+${points} near miss. Combo x${combo}.`
					: `+${points} clean dodge. Combo x${combo}.`;
				eventKind = 'good';
				nearMisses += nearMiss ? 1 : 0;
			}

			continue;
		}

		nextItems.push(movedItem);
	}

	let nextId = current.nextId;
	const spawnInterval = spawnIntervalFor(tick);

	if (tick % spawnInterval === 0) {
		const obstacleLane = Math.floor(Math.random() * LANES);
		nextItems.push({
			id: nextId,
			kind: 'obstacle',
			lane: obstacleLane,
			x: TRACK_WIDTH - 1,
		});
		nextId += 1;

		const rewardLane = chooseOtherLane(obstacleLane);
		nextItems.push({
			id: nextId,
			kind: tick % 30 === 0 ? 'boost' : 'coin',
			lane: rewardLane,
			x: TRACK_WIDTH - 1,
		});
		nextId += 1;
	}

	if (tick > 90 && tick % (spawnInterval * 3) === 0) {
		const usedLanes = new Set(
			nextItems
				.filter(item => item.x === TRACK_WIDTH - 1)
				.map(item => item.lane),
		);
		const openLane = [0, 1, 2].find(lane => !usedLanes.has(lane));

		if (openLane !== undefined) {
			nextItems.push({
				id: nextId,
				kind: 'obstacle',
				lane: openLane,
				x: TRACK_WIDTH - 1,
			});
			nextId += 1;
		}
	}

	const flashTicks =
		flash === null ? Math.max(0, current.flashTicks - 1) : 4;

	return {
		bestCombo,
		bonks,
		combo,
		dodges,
		event,
		eventKind,
		flash: flash ?? (flashTicks > 0 ? current.flash : null),
		flashTicks,
		items: nextItems,
		nearMisses,
		nextId,
		playerLane: current.playerLane,
		score,
		shield,
		tick,
	};
};

const truncateOutput = (text: string, width: number): string => {
	if (text.length <= width) {
		return text;
	}

	return `${text.slice(0, width - 1)}…`;
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

const eventColor = (kind: EventKind): InkColor => {
	if (kind === 'bad') {
		return colors.failed;
	}

	if (kind === 'good') {
		return colors.saved;
	}

	return colors.brandAlt;
};

const ArcadeBoard = ({state}: {state: ArcadeState}) => {
	const rows = useMemo(() => {
		const nextRows = Array.from({length: LANES}, (_, lane) =>
			Array.from({length: TRACK_WIDTH}, (_, x) => trackCell(lane, x)),
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
					label: itemLabel(item.kind),
				};
			}
		}

		nextRows[state.playerLane]![PLAYER_X] = {
			color: playerColor(state),
			dim: false,
			label: state.flash === 'bad' ? 'X' : '@',
		};

		return nextRows;
	}, [state]);

	const divider = `├${'─'.repeat(TRACK_WIDTH)}┤`;

	return (
		<Box flexDirection="column">
			<Text color={colors.brandAlt}>╭{'─'.repeat(TRACK_WIDTH)}╮</Text>
			{rows.map((row, rowIndex) => (
				<Box flexDirection="column" key={rowIndex}>
					<Text color={colors.brandAlt}>
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
					{rowIndex < rows.length - 1 ? (
						<Text color={colors.brandAlt} dimColor>
							{divider}
						</Text>
					) : null}
				</Box>
			))}
			<Text color={colors.brandAlt}>╰{'─'.repeat(TRACK_WIDTH)}╯</Text>
		</Box>
	);
};

const StatChip = ({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) => (
	<Text>
		<Text color={colors.brandAlt}>[</Text>
		<Text dimColor>{label} </Text>
		<Text bold>{value}</Text>
		<Text color={colors.brandAlt}>]</Text>
	</Text>
);

const RecentOutput = ({
	lines,
	visibleLines,
	width,
}: {
	lines: CommandOutputLine[];
	visibleLines: number;
	width: number;
}) => {
	const visible = lines.slice(-visibleLines);

	return (
		<Box flexDirection="column" minWidth={Math.min(width + 8, 80)}>
			<Text bold color={colors.brandAlt}>
				live command output
			</Text>
			{visible.length === 0 ? (
				<Text dimColor>Waiting for stdout/stderr…</Text>
			) : (
				visible.map(line => (
					<Text key={line.id}>
						<Text color={line.kind === 'stderr' ? colors.failed : colors.saved}>
							{line.kind === 'stderr' ? 'err' : 'out'}
						</Text>
						<Text dimColor> │ </Text>
						<Text>{truncateOutput(line.text, width)}</Text>
					</Text>
				))
			)}
		</Box>
	);
};

export const WaitMode = ({args, command, onExitCode}: WaitModeProps) => {
	const {exit} = useApp();
	const commandDisplay = useMemo(
		() => formatCommandForDisplay(command, args),
		[args, command],
	);
	const runnerRef = useRef<RunningCommand | null>(null);
	const startedAtRef = useRef(Date.now());
	const [arcade, setArcade] = useState<ArcadeState>(() => initialArcadeState());
	const terminalColumns = process.stdout.columns ?? 120;
	const isCompact = terminalColumns < NARROW_TERMINAL_COLUMNS;
	const visibleOutputLines = isCompact ? COMPACT_OUTPUT_LINES : RECENT_OUTPUT_LINES;
	const outputWidth = isCompact
		? Math.max(36, Math.min(COMPACT_OUTPUT_WIDTH, terminalColumns - 12))
		: OUTPUT_WIDTH;
	const [outputLines, setOutputLines] = useState<CommandOutputLine[]>([]);
	const [runState, setRunState] = useState<RunState>({
		elapsedMs: 0,
		finishedAt: null,
		result: null,
		status: 'running',
	});
	const [isCancelling, setIsCancelling] = useState(false);
	const [exitHint, setExitHint] = useState('Auto-exits with the command status.');

	useEffect(() => {
		startedAtRef.current = Date.now();
		const runner = startCommandRunner({
			args,
			command,
			onOutput: line => {
				setOutputLines(current =>
					trimOutputLines([...current, line], visibleOutputLines),
				);
			},
		});

		runnerRef.current = runner;

		void runner.result.then(result => {
			setOutputLines(trimOutputLines(result.outputLines, visibleOutputLines));
			setRunState({
				elapsedMs: result.elapsedMs,
				finishedAt: Date.now(),
				result,
				status: 'finished',
			});
		});

		const elapsedTimer = setInterval(() => {
			setRunState(current =>
				current.status === 'running'
					? {...current, elapsedMs: Date.now() - startedAtRef.current}
					: current,
			);
		}, 250);

		return () => {
			clearInterval(elapsedTimer);
			runner.cancel();
		};
	}, [args, command, visibleOutputLines]);

	useEffect(() => {
		const arcadeTimer = setInterval(() => {
			setArcade(current => advanceArcade(current));
		}, TICK_MS);

		return () => {
			clearInterval(arcadeTimer);
		};
	}, []);

	useEffect(() => {
		if (runState.status !== 'finished' || !runState.result) {
			return;
		}

		const exitCode = exitStatusFromResult(runState.result);
		const visibleForMs = Date.now() - startedAtRef.current;
		const delayMs = Math.max(EXIT_AFTER_FINISH_MS, MIN_VISIBLE_MS - visibleForMs);
		setExitHint(
			`Press Enter to exit now, or auto-exit in ${Math.ceil(
				delayMs / 1000,
			)}s.`,
		);

		const timer = setTimeout(() => {
			onExitCode(exitCode);
			exit();
		}, delayMs);

		return () => {
			clearTimeout(timer);
		};
	}, [exit, onExitCode, runState]);

	const finishNow = (): void => {
		if (runState.status !== 'finished' || !runState.result) {
			return;
		}

		onExitCode(exitStatusFromResult(runState.result));
		exit();
	};

	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (key.ctrl && normalizedInput === 'c') {
			if (runState.status === 'running') {
				setIsCancelling(true);
				runnerRef.current?.cancel();
				return;
			}

			finishNow();
			return;
		}

		if (runState.status === 'finished' && key.return) {
			finishNow();
			return;
		}

		if (
			key.upArrow ||
			key.leftArrow ||
			normalizedInput === 'w' ||
			normalizedInput === 'a'
		) {
			setArcade(current => ({
				...current,
				playerLane: clampLane(current.playerLane - 1),
			}));
			return;
		}

		if (
			key.downArrow ||
			key.rightArrow ||
			normalizedInput === 's' ||
			normalizedInput === 'd'
		) {
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
	const currentSpawnInterval = spawnIntervalFor(arcade.tick);
	const speedLevel =
		currentSpawnInterval === 3 ? 3 : currentSpawnInterval === 4 ? 2 : 1;

	const board = (
		<Box flexDirection="column">
			<ArcadeBoard state={arcade} />
			<Text color={eventColor(arcade.eventKind)}>{arcade.event}</Text>
			<Text dimColor>
				W/S, A/D, or arrows switch rails · dodge # · collect $ · shields +
			</Text>
		</Box>
	);
	const output = (
		<RecentOutput
			lines={outputLines}
			visibleLines={visibleOutputLines}
			width={outputWidth}
		/>
	);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color={colors.brand}>
					VIBEBREAK WAIT RAILS // {commandDisplay}
				</Text>
				<Text>
					<StatChip label="time" value={formatDuration(runState.elapsedMs)} />
					{'  '}
					<StatChip label="score" value={arcade.score} />
					{'  '}
					<StatChip label="combo" value={`x${arcade.combo}`} />
					{'  '}
					<StatChip label="shield" value={arcade.shield} />
					{'  '}
					<StatChip label="speed" value={speedLevel} />
				</Text>
			</Box>

			{isCompact ? (
				<Box flexDirection="column" gap={1}>
					{board}
					{output}
				</Box>
			) : (
				<Box columnGap={3} flexDirection="row">
					{board}
					{output}
				</Box>
			)}

			{runState.status === 'running' ? (
				<Text color={isCancelling ? colors.failed : colors.accent}>
					{isCancelling
						? 'Cancelling command with Ctrl-C…'
						: 'Command running. Q is disabled here so tests are not cancelled by accident.'}
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
						Exit {finalExitCode}. Best combo x{arcade.bestCombo}; dodges{' '}
						{arcade.dodges}; near misses {arcade.nearMisses}; bonks{' '}
						{arcade.bonks}. {exitHint}
					</Text>
				</Box>
			)}
		</Box>
	);
};
