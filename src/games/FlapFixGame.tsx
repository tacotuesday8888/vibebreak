import {useEffect, useMemo, useState} from 'react';
import {useInput} from 'ink';
import {GameShell} from '../components/GameShell.js';
import type {BoardCell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult} from '../types.js';
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	Banner,
	FlashKind,
	Popup,
	advanceBanner,
	advanceFlash,
	advancePopups,
	comboBannerFor,
	comboBonus,
	createBoard,
	createPopup,
	paintCell,
	pushMessage,
	shouldShake,
	useFinishOnce,
} from './gameHelpers.js';

const TICK_MS = 115;
const BIRD_X = 3;
const GAP_SIZE = 4;
const SPAWN_EVERY_TICKS = 16;
const START_Y = Math.floor(BOARD_HEIGHT / 2);

type Gate = {
	fixY?: number;
	gapStart: number;
	id: number;
	passed: boolean;
	x: number;
};

type FlapState = {
	banner: Banner | null;
	bestCombo: number;
	birdY: number;
	combo: number;
	elapsedMs: number;
	fixes: number;
	flash: FlashKind;
	flashTicksLeft: number;
	gates: Gate[];
	hits: number;
	message: string;
	nextId: number;
	nextPopupId: number;
	passes: number;
	popups: Popup[];
	prevMessage: string;
	score: number;
	tick: number;
	velocity: number;
};

const createGate = (id: number): Gate => {
	const gapStart = 1 + Math.floor(Math.random() * (BOARD_HEIGHT - GAP_SIZE - 1));

	return {
		fixY: Math.random() > 0.35 ? gapStart + Math.floor(GAP_SIZE / 2) : undefined,
		gapStart,
		id,
		passed: false,
		x: BOARD_WIDTH - 1,
	};
};

const isInGap = (gate: Gate, y: number): boolean =>
	y >= gate.gapStart && y < gate.gapStart + GAP_SIZE;

const initialState = (): FlapState => ({
	banner: null,
	bestCombo: 0,
	birdY: START_Y,
	combo: 0,
	elapsedMs: 0,
	fixes: 0,
	flash: null,
	flashTicksLeft: 0,
	gates: [createGate(1)],
	hits: 0,
	message: 'Tap to keep the fix gliding through tiny gaps.',
	nextId: 2,
	nextPopupId: 1,
	passes: 0,
	popups: [],
	prevMessage: '',
	score: 0,
	tick: 0,
	velocity: 0,
});

const finishMessage = (score: number): string => {
	if (score < 15) {
		return 'The fix flew briefly, then opened a support ticket.';
	}

	if (score < 50) {
		return 'Nice lift. The build stayed airborne long enough to matter.';
	}

	return 'Graceful patch flight. Even gravity approved the diff.';
};

const buildBoard = ({
	birdY,
	gates,
	popups,
}: {
	birdY: number;
	gates: Gate[];
	popups: Popup[];
}): BoardCell[][] => {
	const board = createBoard();

	for (const gate of gates) {
		if (gate.x < 0 || gate.x >= BOARD_WIDTH) {
			continue;
		}

		for (let y = 0; y < BOARD_HEIGHT; y += 1) {
			if (!isInGap(gate, y)) {
				paintCell(board, {x: gate.x, y}, '#', 'cyan');
			}
		}

		if (gate.fixY !== undefined) {
			paintCell(board, {x: gate.x, y: gate.fixY}, 'FIX', 'yellow');
		}
	}

	paintCell(board, {x: BIRD_X, y: birdY}, '>', 'yellow');

	for (const popup of popups) {
		paintCell(board, popup, popup.text, popup.kind === 'good' ? 'yellow' : 'red');
	}

	return board;
};

export const FlapFixGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<FlapState>(() => initialState());

	useInput((input, key) => {
		const normalizedInput = input.toLowerCase();

		if (normalizedInput === 'q' || key.escape) {
			onExit();
			return;
		}

		if (normalizedInput === ' ' || normalizedInput === 'w' || key.upArrow) {
			setState(current => ({...current, velocity: -2}));
		}
	});

	useEffect(() => {
		const timer = setInterval(() => {
			setState(current => {
				if (current.elapsedMs >= definition.durationSeconds * 1000) {
					return current;
				}

				const elapsedMs = Math.min(
					current.elapsedMs + TICK_MS,
					definition.durationSeconds * 1000,
				);
				const tick = current.tick + 1;
				let velocity = Math.min(2, current.velocity + 1);
				let birdY = current.birdY + velocity;
				let banner = advanceBanner(current.banner);
				let bestCombo = current.bestCombo;
				let combo = current.combo;
				let fixes = current.fixes;
				let gates: Gate[] = [];
				let hits = current.hits;
				let message = current.message;
				let nextId = current.nextId;
				let nextPopupId = current.nextPopupId;
				let passes = current.passes;
				let score = current.score;
				let newFlash: FlashKind = null;
				let hitThisTick = false;
				const newPopups: Popup[] = [];

				if (birdY < 0 || birdY >= BOARD_HEIGHT) {
					const delta = -7;
					score += delta;
					combo = 0;
					hits += 1;
					birdY = START_Y;
					velocity = -1;
					message = `${delta} gravity merge conflict. Back to cruising height.`;
					newFlash = 'bad';
					hitThisTick = true;
					newPopups.push(createPopup(nextPopupId, delta, BIRD_X));
					nextPopupId += 1;
				}

				for (const gate of current.gates) {
					const movedGate: Gate = {...gate, x: gate.x - 1};

					if (movedGate.x < 0) {
						continue;
					}

					if (
						!hitThisTick &&
						movedGate.x === BIRD_X &&
						!isInGap(movedGate, birdY)
					) {
						const delta = -8;
						score += delta;
						combo = 0;
						hits += 1;
						birdY = START_Y;
						velocity = -1;
						message = `${delta} clipped the deploy pipe. Tiny bonk.`;
						newFlash = 'bad';
						hitThisTick = true;
						newPopups.push(createPopup(nextPopupId, delta, BIRD_X));
						nextPopupId += 1;
						continue;
					}

					if (!hitThisTick && movedGate.x === BIRD_X && movedGate.fixY === birdY) {
						const points = 6 + comboBonus(combo + 1);
						score += points;
						fixes += 1;
						movedGate.fixY = undefined;
						message = `+${points} FIX caught mid-flight.`;
						newFlash = 'good';
						newPopups.push(createPopup(nextPopupId, points, BIRD_X));
						nextPopupId += 1;
					}

					if (!movedGate.passed && movedGate.x < BIRD_X) {
						const nextCombo = combo + 1;
						const points = 4 + comboBonus(nextCombo);
						score += points;
						combo = nextCombo;
						bestCombo = Math.max(bestCombo, combo);
						passes += 1;
						movedGate.passed = true;
						message = `+${points} clean gap. Flight combo x${combo}.`;
						banner = comboBannerFor(current.combo, combo) ?? banner;
						newFlash = 'good';
						newPopups.push(createPopup(nextPopupId, points, BIRD_X + 1));
						nextPopupId += 1;
					}

					gates.push(movedGate);
				}

				if (
					elapsedMs < definition.durationSeconds * 1000 &&
					tick % SPAWN_EVERY_TICKS === 0
				) {
					gates.push(createGate(nextId));
					nextId += 1;
				}

				const popups = [...advancePopups(current.popups), ...newPopups];
				const {flash, flashTicksLeft} = advanceFlash(
					current.flash,
					current.flashTicksLeft,
					newFlash,
				);
				const log = pushMessage(
					{message: current.message, prevMessage: current.prevMessage},
					message,
				);

				return {
					banner,
					bestCombo,
					birdY,
					combo,
					elapsedMs,
					fixes,
					flash,
					flashTicksLeft,
					gates,
					hits,
					message: log.message,
					nextId,
					nextPopupId,
					passes,
					popups,
					prevMessage: log.prevMessage,
					score,
					tick,
					velocity,
				};
			});
		}, TICK_MS);

		return () => {
			clearInterval(timer);
		};
	}, [definition.durationSeconds]);

	const result: GameResult = useMemo(
		() => ({
			gameId: definition.id,
			gameName: definition.name,
			message: finishMessage(state.score),
			score: state.score,
			stats: [
				{label: 'Gaps', value: state.passes},
				{label: 'FIX', value: state.fixes},
				{label: 'Bonks', value: state.hits},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.fixes,
			state.hits,
			state.passes,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const board = useMemo(
		() =>
			buildBoard({
				birdY: state.birdY,
				gates: state.gates,
				popups: state.popups,
			}),
		[state.birdY, state.gates, state.popups],
	);

	return (
		<GameShell
			accent={definition.accent}
			banner={state.banner}
			bestScore={bestScore}
			board={board}
			combo={state.combo}
			controls={definition.controls}
			durationSeconds={definition.durationSeconds}
			elapsedMs={state.elapsedMs}
			flash={state.flash}
			message={state.message}
			objective={definition.objective}
			prevMessage={state.prevMessage}
			score={state.score}
			shake={shouldShake(state.flash, state.flashTicksLeft)}
			status={[
				{label: 'Gaps', value: state.passes},
				{label: 'FIX', value: state.fixes},
				{label: 'Bonks', value: state.hits},
			]}
			title={definition.name}
		/>
	);
};
