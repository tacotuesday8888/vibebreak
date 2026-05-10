import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_WIDTH,
	FallingItem,
	PLAYER_ROW,
	comboBonus,
	moveLeft,
	moveRight,
	spawnEveryTicks,
	timeLeftSeconds,
	useBoard,
	useFinishOnce,
	useHorizontalControls,
} from './gameHelpers.js';

const TICK_MS = 160;
const SPAWN_EVERY_TICKS = 2;

type StackItem = FallingItem<'err' | 'fix'>;

type StackState = {
	bestCombo: number;
	combo: number;
	elapsedMs: number;
	errors: number;
	fixes: number;
	flash: 'bad' | 'good' | null;
	items: StackItem[];
	message: string;
	nextId: number;
	playerX: number;
	score: number;
	tick: number;
};

const initialState = (): StackState => ({
	bestCombo: 0,
	combo: 0,
	elapsedMs: 0,
	errors: 0,
	fixes: 0,
	flash: null,
	items: [],
	message: 'Grab FIX. Let ERR fall anywhere else.',
	nextId: 1,
	playerX: Math.floor(BOARD_WIDTH / 2),
	score: 0,
	tick: 0,
});

const createItem = (id: number): StackItem => {
	const isFix = Math.random() > 0.58;

	return {
		id,
		kind: isFix ? 'fix' : 'err',
		label: isFix ? 'FIX' : 'ERR',
		x: Math.floor(Math.random() * BOARD_WIDTH),
		y: 0,
	};
};

const finishMessage = (score: number): string => {
	if (score < 10) {
		return 'The stack trace is still narrating, but you did stretch.';
	}

	if (score < 40) {
		return 'A tidy little debugging jog. Hydration strongly implied.';
	}

	return 'You outran the stack trace and left it a nice note.';
};

export const StackSprintGame = ({
	bestScore,
	definition,
	onExit,
	onFinish,
}: GameComponentProps) => {
	const [state, setState] = useState<StackState>(() => initialState());

	useHorizontalControls(
		() => {
			setState(current => ({...current, playerX: moveLeft(current.playerX)}));
		},
		() => {
			setState(current => ({...current, playerX: moveRight(current.playerX)}));
		},
		onExit,
	);

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
				const items: StackItem[] = [];
				let bestCombo = current.bestCombo;
				let combo = current.combo;
				let errors = current.errors;
				let fixes = current.fixes;
				let score = current.score;
				let message = current.message;
				let flash: StackState['flash'] = null;

				for (const item of current.items) {
					const movedItem = {...item, y: item.y + 1};

					if (movedItem.y === PLAYER_ROW && movedItem.x === current.playerX) {
						if (movedItem.kind === 'fix') {
							combo += 1;
							bestCombo = Math.max(bestCombo, combo);
							const points = 7 + comboBonus(combo);
							score += points;
							fixes += 1;
							message = `+${points} FIX collected. Combo x${combo}.`;
							flash = 'good';
						} else {
							score -= 8;
							combo = 0;
							errors += 1;
							message = '-8 ERR bonk. Combo stack overflowed.';
							flash = 'bad';
						}

						continue;
					}

					if (movedItem.y > PLAYER_ROW) {
						if (movedItem.kind === 'fix') {
							score -= 2;
							combo = 0;
							message = '-2 missed FIX. It waved sadly.';
							flash = 'bad';
						} else {
							combo += 1;
							bestCombo = Math.max(bestCombo, combo);
							const points = 1 + comboBonus(combo);
							score += points;
							message = `+${points} ERR avoided. Smooth little sidestep.`;
							flash = 'good';
						}

						continue;
					}

					items.push(movedItem);
				}

				let nextId = current.nextId;

				if (
					elapsedMs < definition.durationSeconds * 1000 &&
					tick %
						spawnEveryTicks(
							SPAWN_EVERY_TICKS,
							definition.durationSeconds,
							elapsedMs,
						) ===
						0
				) {
					items.push(createItem(nextId));
					nextId += 1;
				}

				return {
					bestCombo,
					combo,
					elapsedMs,
					errors,
					fixes,
					flash,
					items,
					message,
					nextId,
					playerX: current.playerX,
					score,
					tick,
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
				{label: 'Fixes', value: state.fixes},
				{label: 'ERR hits', value: state.errors},
				{label: 'Best combo', value: `x${state.bestCombo}`},
			],
		}),
		[
			definition.id,
			definition.name,
			state.bestCombo,
			state.errors,
			state.fixes,
			state.score,
		],
	);

	useFinishOnce(
		state.elapsedMs >= definition.durationSeconds * 1000,
		result,
		onFinish,
	);

	const itemColor = useCallback(
		(item: StackItem): InkColor => (item.kind === 'fix' ? 'green' : 'red'),
		[],
	);
	const board = useBoard({itemColor, items: state.items, playerX: state.playerX});

	return (
		<GameShell
			accent={definition.accent}
			bestScore={bestScore}
			board={board}
			controls={definition.controls}
			durationSeconds={definition.durationSeconds}
			elapsedMs={state.elapsedMs}
			flash={state.flash}
			message={state.message}
			score={state.score}
			status={[
				{label: 'Time', value: `${timeLeftSeconds(definition.durationSeconds, state.elapsedMs)}s`},
				{label: 'Combo', value: `x${state.combo}`},
				{label: 'Fixes', value: state.fixes},
				{label: 'ERR hits', value: state.errors},
			]}
			title={definition.name}
		/>
	);
};
