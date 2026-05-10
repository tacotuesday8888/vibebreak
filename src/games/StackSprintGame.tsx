import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameShell} from '../components/GameShell.js';
import type {GameComponentProps, GameResult, InkColor} from '../types.js';
import {
	BOARD_WIDTH,
	FallingItem,
	PLAYER_ROW,
	moveLeft,
	moveRight,
	timeLeftSeconds,
	useBoard,
	useFinishOnce,
	useHorizontalControls,
} from './gameHelpers.js';

const TICK_MS = 180;
const SPAWN_EVERY_TICKS = 2;

type StackItem = FallingItem<'err' | 'fix'>;

type StackState = {
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
				let errors = current.errors;
				let fixes = current.fixes;
				let score = current.score;
				let message = current.message;
				let flash: StackState['flash'] = null;

				for (const item of current.items) {
					const movedItem = {...item, y: item.y + 1};

					if (movedItem.y === PLAYER_ROW && movedItem.x === current.playerX) {
						if (movedItem.kind === 'fix') {
							score += 7;
							fixes += 1;
							message = '+7 FIX collected. Tiny victory confetti.';
							flash = 'good';
						} else {
							score -= 8;
							errors += 1;
							message = '-8 ERR bonk. Stack traces are pointy.';
							flash = 'bad';
						}

						continue;
					}

					if (movedItem.y > PLAYER_ROW) {
						if (movedItem.kind === 'fix') {
							score -= 2;
							message = '-2 missed FIX. It waved sadly.';
							flash = 'bad';
						} else {
							score += 1;
							message = '+1 ERR avoided. Very professional.';
							flash = 'good';
						}

						continue;
					}

					items.push(movedItem);
				}

				let nextId = current.nextId;

				if (elapsedMs < definition.durationSeconds * 1000 && tick % SPAWN_EVERY_TICKS === 0) {
					items.push(createItem(nextId));
					nextId += 1;
				}

				return {
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
			],
		}),
		[definition.id, definition.name, state.errors, state.fixes, state.score],
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
			flash={state.flash}
			message={state.message}
			score={state.score}
			status={[
				{label: 'Time', value: `${timeLeftSeconds(definition.durationSeconds, state.elapsedMs)}s`},
				{label: 'Fixes', value: state.fixes},
				{label: 'ERR hits', value: state.errors},
			]}
			title={definition.name}
		/>
	);
};
